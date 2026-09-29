import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Regression guard for the SQL in supabase/ — the schema is the one part of this
// app that TypeScript cannot check. src/integrations/supabase/types.ts is
// hand-maintained and already disagrees with the live database in places, so a
// missing column or a missing RLS policy shows up as a runtime PostgREST error
// (`column scans.file_type does not exist`, `new row violates row-level security
// policy`) rather than a compile error.
//
// The live project drifted because part of its schema came from ad-hoc SQL typed
// into the Supabase SQL editor (see supabase/migrations/0004_reconcile_live_drift.sql
// for the full list). These assertions pin the migrations to what the code in
// src/lib actually does, so a future edit that renames a column, forgets
// `enable row level security` or reintroduces a `using (true)` policy fails here
// instead of in production.
//
// The migrations are read as text and analysed in file order; nothing here needs
// a database.
const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const diagnosticsDir = path.join(repoRoot, "supabase", "diagnostics");

/** Every table src/lib/*.functions.ts selects from, inserts into or deletes from. */
const TABLES = [
  "scans",
  "vulnerabilities",
  "policies",
  "user_roles",
  "vault_secrets",
  "repo_embeddings",
] as const;

type SqlFile = { name: string; sql: string };

function readSqlDir(dir: string): SqlFile[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((name) => ({
      name,
      sql: readFileSync(path.join(dir, name), "utf8"),
    }));
}

/** Drops `-- ...` to end of line. Only ever used for structural matching below,
 *  never for the SQL's own execution. */
function stripComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      const comment = line.indexOf("--");
      return comment === -1 ? line : line.slice(0, comment);
    })
    .join("\n");
}

/** Strips `--` comments and collapses all whitespace runs, so multi-line DDL can
 *  be matched with a plain substring assertion. Comments are removed rather than
 *  preserved because they discuss the very identifiers the assertions below
 *  require to be absent — 0004's header explains the ad-hoc RPC it drops by
 *  naming that RPC's `target_owner`/`target_repo` parameters. */
function squash(sql: string): string {
  return stripComments(sql).replace(/\s+/g, " ");
}

const migrations = readSqlDir(migrationsDir);
const migrationSql = stripComments(
  migrations.map((file) => file.sql).join("\n"),
);
const reconciliation = migrations.find((file) => file.name.startsWith("0004"));
const diagnostics = readSqlDir(diagnosticsDir);

/** Returns the body of `create table <table> ( ... )`, or "" when the migration
 *  set never creates that table. */
function createTableBody(sql: string, table: string): string {
  const match = new RegExp(
    `create table (?:if not exists )?(?:public\\.)?${table}\\b`,
    "i",
  ).exec(sql);
  if (!match) return "";

  const open = sql.indexOf("(", match.index + match[0].length);
  if (open === -1) return "";

  let depth = 0;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === "(") depth++;
    else if (sql[i] === ")") {
      depth--;
      if (depth === 0) return sql.slice(open + 1, i);
    }
  }
  return "";
}

/** Every column name the migrations give `table`, from both `create table` and
 *  `alter table ... add column if not exists` (the latter is how the ad-hoc /
 *  incremental drift was introduced, so both are part of the contract). */
function columnsOf(table: string): Set<string> {
  const columns = new Set<string>();

  for (const line of createTableBody(migrationSql, table).split("\n")) {
    const definition = line.trim();
    if (!definition) continue;
    if (
      /^(primary|foreign|unique|check|constraint|exclude|like)\b/i.test(
        definition,
      )
    ) {
      continue;
    }
    const name = /^"?([a-z_][a-z0-9_]*)"?/i.exec(definition)?.[1];
    if (name) columns.add(name.toLowerCase());
  }

  const addColumn = new RegExp(
    `alter table\\s+(?:public\\.)?${table}\\s+add column if not exists\\s+"?([a-z_][a-z0-9_]*)"?`,
    "gi",
  );
  for (const match of migrationSql.matchAll(addColumn)) {
    columns.add(match[1].toLowerCase());
  }

  return columns;
}
/** Columns the application reads or writes, per table. `id`, and any other column
 *  that the pre-0001 bootstrap created, is only listed where the migrations are
 *  the thing that has to guarantee it. */
const APP_CONTRACT: Record<
  (typeof TABLES)[number],
  { columns: string[]; source: string }
> = {
  scans: {
    source: "src/lib/scan.functions.ts",
    columns: [
      "project_name",
      "file_type",
      "status",
      "source_code",
      "user_id",
      "health_score",
      "vulnerabilities_count",
      "created_at",
    ],
  },
  vulnerabilities: {
    source:
      "src/lib/scan.functions.ts (ScanVulnerability in src/lib/scan-types.ts)",
    columns: [
      "scan_id",
      "title",
      "severity",
      "cwe_id",
      "vulnerable_code_block",
      "fixed_code_block",
      "remediation_steps",
      "file_path",
      "line_start",
      "line_end",
    ],
  },
  policies: {
    source: "src/lib/scan.functions.ts (listPolicies / runScan / togglePolicy)",
    columns: ["name", "category", "description", "enabled"],
  },
  user_roles: {
    source: "src/lib/scan.functions.ts (requireAdminRole)",
    columns: ["user_id", "role"],
  },
  vault_secrets: {
    source: "src/lib/vault/vault.functions.ts",
    columns: [
      "user_id",
      "provider",
      "label",
      "encrypted_token",
      "iv",
      "auth_tag",
      "created_at",
      "updated_at",
    ],
  },
  repo_embeddings: {
    source: "src/lib/embedding.functions.ts and src/lib/agent.functions.ts",
    columns: [
      "user_id",
      "owner",
      "repo",
      "file_path",
      "content",
      "file_sha",
      "embedding",
    ],
  },
};

/** The owner-scoped policies the migrations create on purpose. 0004's sweep must
 *  skip exactly these by name, or it would delete its own access control. */
const CANONICAL_POLICIES = [
  "scans_select_own",
  "scans_insert_own",
  "scans_update_own",
  "scans_delete_own",
  "vulnerabilities_select_via_scan",
  "policies_select_authenticated",
  "user_roles_select_own",
  "vault_secrets_owner_only",
  "repo_embeddings_owner_only",
];

/** Replays `create policy` / `drop policy` in migration order and returns the
 *  policies that survive, so "a later file drops the permissive policy an earlier
 *  one created" is understood rather than flagged. */
function effectivePolicies(): Array<{
  table: string;
  policy: string;
  permissive: boolean;
  file: string;
}> {
  const surviving = new Map<
    string,
    { table: string; policy: string; permissive: boolean; file: string }
  >();

  for (const { name: file, sql } of migrations) {
    const clean = stripComments(sql);

    for (const match of clean.matchAll(
      /drop policy (?:if exists )?(?:"([^"]+)"|([\w -]+?)) on (?:public\.)?(\w+)/gi,
    )) {
      const policy = (match[1] ?? match[2]).trim();
      surviving.delete(`${match[3]}.${policy}`);
    }

    for (const match of clean.matchAll(
      /create policy (?:"([^"]+)"|([\w -]+?)) on (?:public\.)?(\w+)([\s\S]*?);/gi,
    )) {
      const policy = (match[1] ?? match[2]).trim();
      const body = match[4];
      surviving.set(`${match[3]}.${policy}`, {
        table: match[3],
        policy,
        permissive:
          /using\s*\(\s*true\s*\)/i.test(body) ||
          /with check\s*\(\s*true\s*\)/i.test(body),
        file,
      });
    }
  }

  return [...surviving.values()];
}

describe("supabase migrations match the columns src/ actually uses", () => {
  it("defines every column the app reads or writes", () => {
    const missing: string[] = [];

    for (const table of TABLES) {
      const columns = columnsOf(table);
      for (const column of APP_CONTRACT[table].columns) {
        if (!columns.has(column)) {
          missing.push(
            `${table}.${column} (needed by ${APP_CONTRACT[table].source})`,
          );
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("does not drop a column the application needs", () => {
    // 0004 removes scans.language and policies.is_active, and offers
    // scans.threat_level / scans.findings as optional drops. Any `drop column`
    // that named something in APP_CONTRACT above would break a code path, so the
    // two lists are checked against each other rather than trusted.
    const needed = new Set(
      Object.values(APP_CONTRACT).flatMap((entry) => entry.columns),
    );
    const dropped = [
      ...stripComments(reconciliation?.sql ?? "").matchAll(
        /drop column (?:if exists )?"?([a-z_][a-z0-9_]*)"?/gi,
      ),
    ].map((match) => match[1].toLowerCase());

    expect(dropped).toContain("is_active");
    expect(dropped).not.toContain("enabled");
    expect(dropped.filter((column) => needed.has(column))).toEqual([]);
  });

  it("keeps the tables this repo owns self-contained", () => {
    expect(createTableBody(migrationSql, "vault_secrets")).not.toBe("");
    expect(createTableBody(migrationSql, "user_roles")).not.toBe("");
    expect(createTableBody(migrationSql, "repo_embeddings")).not.toBe("");
  });

  it("uses a vector dimension that matches the embedding model being called", () => {
    const embeddingSource = readFileSync(
      path.join(repoRoot, "src", "lib", "embedding.functions.ts"),
      "utf8",
    );
    // Google text-embedding-004 returns 768 dimensions, and neither call site
    // overrides outputDimensionality. Changing the model breaks the insert with
    // "expected 768 dimensions, not N", so the migration must change with it.
    expect(embeddingSource).toContain("text-embedding-004");
    expect(embeddingSource).not.toMatch(/outputDimensionality/i);
    expect(squash(migrationSql)).toContain("vector(768)");
  });
});

describe("row level security covers every table the app touches", () => {
  it("never disables row level security", () => {
    expect(migrationSql).not.toMatch(/disable row level security/i);
  });

  it("enables row level security on all six tables", () => {
    const squashed = squash(migrationSql);
    for (const table of TABLES) {
      expect(squashed).toMatch(
        new RegExp(
          `alter table (?:public\\.)?${table} enable row level security`,
          "i",
        ),
      );
    }
  });

  it("leaves no permissive policy behind", () => {
    // The live database had `for all using (true) with check (true)` policies on
    // scans/vulnerabilities/policies from the original bootstrap. Those were
    // never dropped: Postgres ORs policies together, so one permissive policy
    // makes every owner-scoped policy on that table pointless and hands the anon
    // key full read/write.
    expect(effectivePolicies().filter((policy) => policy.permissive)).toEqual(
      [],
    );
  });

  it("creates owner-scoped policies for every table and keeps them", () => {
    const policies = effectivePolicies();
    for (const name of CANONICAL_POLICIES) {
      const matches = policies.filter((policy) => policy.policy === name);
      expect(matches.length).toBe(1);
      expect(matches[0].permissive).toBe(false);
    }
  });

  it("sweeps permissive policies created outside this repo", () => {
    // A name-independent sweep is the only thing that catches drift nobody
    // recorded in a file — including the "…_1" duplicates the SQL editor creates
    // when the same statement is run twice. It must read pg_policies, match on
    // both USING and WITH CHECK, drop what it finds, and skip exactly the
    // policies this repo creates on purpose.
    const squashed = squash(reconciliation?.sql ?? "");
    expect(squashed).toMatch(/from pg_policies/);
    expect(squashed).toMatch(/coalesce\(qual, 'true'\) = 'true'/);
    expect(squashed).toMatch(/coalesce\(with_check, 'true'\) = 'true'/);
    expect(squashed).toContain("execute format('drop policy %I on %I.%I'");

    for (const table of TABLES) {
      expect(squashed).toContain(`'${table}'`);
    }
    for (const policy of CANONICAL_POLICIES) {
      expect(squashed).toContain(`'${policy}'`);
    }
  });

  it("drops the permissive bootstrap policies by name", () => {
    const squashed = squash(reconciliation?.sql ?? "");
    expect(squashed).toContain(
      'drop policy if exists "Allow public read/write on scans" on public.scans;',
    );
    expect(squashed).toContain(
      'drop policy if exists "Allow public read/write on vulnerabilities" on public.vulnerabilities;',
    );
    expect(squashed).toContain(
      'drop policy if exists "Allow public select policies" on public.policies;',
    );
    expect(squashed).toContain(
      'drop policy if exists "Allow public update policies" on public.policies;',
    );
  });
});

describe("the unique keys the app's upserts depend on exist", () => {
  it("keys the vault_secrets upsert", () => {
    // vault.functions.ts: .upsert(..., { onConflict: "user_id,provider,label" })
    expect(squash(migrationSql)).toContain("unique (user_id, provider, label)");
  });

  it("keys the repo_embeddings upsert", () => {
    // embedding.functions.ts:
    // .upsert(records, { onConflict: "user_id,owner,repo,file_path" })
    expect(squash(migrationSql)).toContain(
      "unique (user_id, owner, repo, file_path)",
    );
    // 0004 has to be able to add it to a table an ad-hoc CREATE TABLE created
    // without it, because PostgREST turns that onConflict into ON CONFLICT and
    // Postgres rejects an unmatched ON CONFLICT with 42P10.
    expect(squash(reconciliation?.sql ?? "")).toContain(
      "add constraint repo_embeddings_user_repo_path_key unique (user_id, owner, repo, file_path)",
    );
  });

  it("keeps user_roles to one row per user", () => {
    // requireAdminRole() reads user_roles with .maybeSingle(), which raises
    // PGRST116 as soon as a user has two rows.
    const squashed = squash(migrationSql);
    expect(squashed).toMatch(
      /user_roles \( user_id uuid primary key|unique \(user_id\)/,
    );
    expect(squash(reconciliation?.sql ?? "")).toMatch(
      /delete from public\.user_roles/,
    );
  });
});

describe("the vector search RPC matches its one call site", () => {
  const RPC_PARAMS = [
    "query_embedding",
    "match_threshold",
    "match_count",
    "repo_owner",
    "repo_name",
    "match_user_id",
  ];

  it("is called with the parameters the migrations declare", () => {
    // src/lib/agent.functions.ts: supabase.rpc("search_repo_context", { ... })
    // PostgREST resolves RPC arguments by name, so a rename on either side turns
    // into "function public.search_repo_context(...) does not exist".
    const agentSource = readFileSync(
      path.join(repoRoot, "src", "lib", "agent.functions.ts"),
      "utf8",
    );
    expect(agentSource).toContain('rpc("search_repo_context"');
    for (const param of RPC_PARAMS) {
      expect(agentSource).toContain(`${param}:`);
    }
    for (const { sql } of migrations) {
      for (const param of RPC_PARAMS) {
        if (sql.includes("search_repo_context")) {
          expect(
            sql,
            `${param} missing from a file declaring the RPC`,
          ).toContain(param);
        }
      }
    }
  });

  it("drops the ad-hoc overload that ignored ownership", () => {
    // (query_embedding, target_owner, target_repo, match_threshold, match_count)
    // was scoped only by (owner, repo) — no user_id at all. Two overloads also
    // make PostgREST's name resolution ambiguous.
    const squashed = squash(reconciliation?.sql ?? "");
    expect(squashed).toContain(
      "drop function if exists public.search_repo_context(vector, text, text, double precision, integer)",
    );
    expect(squashed).not.toContain("target_owner");
    expect(squashed).not.toContain("target_repo");
  });

  it("still scopes results by owner inside the function body", () => {
    // The RPC runs through the service role, which bypasses RLS, so the
    // match_user_id predicate is the only tenant boundary in this query.
    const squashed = squash(migrationSql);
    expect(squashed).toContain(
      "(match_user_id is null or e.user_id = match_user_id)",
    );
    expect(squashed).toContain("e.owner = repo_owner and e.repo = repo_name");
  });
});

describe("deleting an auth user cascades instead of failing", () => {
  it("re-creates the scans FK with ON DELETE CASCADE", () => {
    // A pre-0001 ad-hoc ALTER created scans.user_id first, so 0001's
    // `add column if not exists ... on delete cascade` was a no-op and the live
    // FK has no delete rule.
    expect(squash(reconciliation?.sql ?? "")).toContain(
      "add constraint scans_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade",
    );
  });

  it("cascades each dependent table", () => {
    const squashed = squash(migrationSql);
    expect(squashed).toContain(
      "add constraint vulnerabilities_scan_id_fkey foreign key (scan_id) references public.scans (id) on delete cascade",
    );
    expect(squashed).toContain(
      "add constraint user_roles_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade",
    );
    expect(squashed).toContain(
      "add constraint repo_embeddings_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade",
    );
    expect(squashed).toContain(
      "user_id uuid not null references auth.users(id) on delete cascade",
    );
  });
});

describe("indexes match the queries the app runs", () => {
  it("serves listScans with one composite index and drops the duplicates", () => {
    // listScans(): .eq("user_id", …).order("created_at", { ascending: false })
    const squashed = squash(reconciliation?.sql ?? "");
    expect(squashed).toContain(
      "create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc)",
    );
    expect(squashed).toContain(
      "drop index if exists public.idx_scans_user_id;",
    );
    expect(squashed).toContain(
      "drop index if exists public.scans_user_id_idx;",
    );
    expect(squashed).not.toContain(
      "drop index if exists public.scans_user_created_idx",
    );
  });

  it("keeps a single ANN index on the embedding column", () => {
    const squashed = squash(migrationSql);
    expect(squashed).toContain(
      "repo_embeddings_embedding_idx on public.repo_embeddings using hnsw (embedding vector_cosine_ops)",
    );
  });
});

describe("the live-schema audit script is safe to run on production", () => {
  it("exists and covers every table", () => {
    expect(diagnostics.length).toBeGreaterThan(0);
    const sql = stripComments(diagnostics.map((file) => file.sql).join("\n"));
    expect(sql).toMatch(/create temp table/i);
    for (const table of TABLES) {
      expect(sql).toContain(`'${table}'`);
    }
  });

  it("mutates nothing outside its own temp table", () => {
    const sql = stripComments(diagnostics.map((file) => file.sql).join("\n"));
    expect(sql).not.toMatch(
      /\b(insert into public\.|update public\.|delete from public\.|truncate|drop table public\.|alter table public\.|drop policy)/i,
    );
  });
});
