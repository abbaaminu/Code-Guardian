# supabase/

| Path                                       | Purpose                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `migrations/0001..0003`                    | Multi-tenancy + RLS + vault (0001), admin roles (0002), repo embeddings + the `search_repo_context` RPC (0003).                                                                                                          |
| `migrations/0004_reconcile_live_drift.sql` | Reconciles the live database with the code — see below. Idempotent; safe to re-run.                                                                                                                                      |
| `diagnostics/live-schema-audit.sql`        | **Read-only.** Prints one table of what is actually in the database: columns, RLS state, constraints, indexes, policies, the RPC overloads, and every app-required column that is missing. Run it before and after 0004. |
| `../src/lib/supabase-schema.test.ts`       | Static guard that the SQL in this directory still provides every column, key and policy the code in `src/lib` uses.                                                                                                      |

## Why there is a "drift" migration

Part of the live schema was not created by anything in this repo. It was typed
into the Supabase SQL editor, several statements at a time, and some of those
statements disagreed with (or silently no-op'd against) the migrations:

- the original bootstrap created `scans`, `vulnerabilities` and `policies` with
  `for all using (true) with check (true)` policies. 0001 added owner-scoped
  policies **on top** but nothing ever dropped the permissive ones. Postgres ORs
  applicable policies together, so the wide-open policy kept winning: the anon key
  (which ships in the browser bundle) could read _and write_ all three tables;
- `policies.is_active` was renamed to `enabled` in ad-hoc SQL, while
  `scan.functions.ts` filters on `enabled` — a half-applied rename makes every
  policy toggle silently ineffective;
- `scans.language` was `NOT NULL` in the bootstrap, and `runScan` never sends it
  (`file_type` carries the language). The ad-hoc `drop column` for it exists only
  in a chat message, not in a file;
- `scans.user_id` was created by an ad-hoc `ALTER TABLE` before 0001 ran, so
  0001's `add column if not exists ... on delete cascade` was a no-op and the live
  foreign key has **no** `ON DELETE CASCADE`. Deleting an auth user fails, and two
  single-column user_id indexes exist (`idx_scans_user_id`, `scans_user_id_idx`);
- `repo_embeddings` was created twice: once ad-hoc (no `user_id`, no unique key, no
  RLS, plus its own `search_repo_context` overload scoped only by `(owner, repo)`)
  and once by 0003. Whichever `CREATE TABLE IF NOT EXISTS` won, 0003's later
  `enable row level security` / `create policy` / `create or replace function`
  statements only committed if the whole script committed — and the script aborts
  on the first error.

## What the code needs vs. what the SQL provides

`scans`, `vulnerabilities` and `policies` are **not** created by any file in this
repo (they predate it), so their full column list can only be confirmed against
the live database — that is what `diagnostics/live-schema-audit.sql` section 01
prints. Everything below is what the code requires of them.

### scans (`src/lib/scan.functions.ts`)

| Column                     | Used by                                             | Provided by                | Status                                                                                  |
| -------------------------- | --------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `id`                       | `.eq("id", …)`, `select("id")` (217, 226, 274, 314) | bootstrap                  | assumed present — confirm with section 01                                               |
| `project_name`             | insert 220, `select` 293, session title 358         | 0004 §2a                   | ok                                                                                      |
| `file_type`                | insert 221, `select` 293                            | 0004 §2a                   | ok                                                                                      |
| `status`                   | insert `"scanning"` 222, update 270/280             | 0004 §2a + default         | ok                                                                                      |
| `source_code`              | insert 223                                          | 0004 §2a                   | ok                                                                                      |
| `user_id`                  | insert 224, every `.eq("user_id", …)` 295/315/347   | 0001, repaired by 0004 §2c | ok, FK recreated with `ON DELETE CASCADE`                                               |
| `health_score`             | update 271                                          | 0004 §2a                   | ok                                                                                      |
| `vulnerabilities_count`    | update 272 (`countBySeverity`)                      | 0004 §2a (`jsonb`)         | ok — `jsonb` matches `Record<Severity, number>`                                         |
| `created_at`               | `select` + `.order()` 293/296                       | 0004 §2a                   | ok                                                                                      |
| `language`                 | nothing                                             | —                          | dropped by 0004 §2b after `file_type` is backfilled from it                             |
| `threat_level`, `findings` | nothing in `src/`                                   | bootstrap/ad-hoc           | unused; left in place so no data is destroyed, optional drops are commented in 0004 §2b |

### vulnerabilities (`src/lib/scan.functions.ts`, `src/lib/scan-types.ts`)

`ScanVulnerability` (scan-types.ts:21) is the contract for the rows inserted at
scan.functions.ts:258 and read back at 319/349.

| Column                   | Type in the app                                                          | Provided by  | Status                                                                                     |
| ------------------------ | ------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------ |
| `scan_id`                | `string` (set at 258)                                                    | 0004 §3a     | ok, plus index + `references scans(id) on delete cascade` (§3c/§3d)                        |
| `title`                  | `string`                                                                 | 0004 §3a     | ok, nulls backfilled to `"Unnamed finding"` — the same fallback `normalizeVulns` uses (74) |
| `severity`               | `Severity` = `"critical" \| "high" \| "medium" \| "low"` (severity.ts:1) | 0004 §3a/§3b | ok, `NOT NULL` + `CHECK` listing exactly those four                                        |
| `cwe_id`                 | `string \| null`                                                         | 0004 §3a     | ok, deliberately nullable                                                                  |
| `vulnerable_code_block`  | `string`                                                                 | 0004 §3a     | ok, `NOT NULL DEFAULT ''`                                                                  |
| `fixed_code_block`       | `string`                                                                 | 0004 §3a     | ok, `NOT NULL DEFAULT ''`                                                                  |
| `remediation_steps`      | `string`                                                                 | 0004 §3a     | ok, `NOT NULL DEFAULT ''`                                                                  |
| `file_path`              | `string \| null`                                                         | 0004 §3a     | ok, nullable                                                                               |
| `line_start`, `line_end` | `number \| null`                                                         | 0004 §3a     | ok, nullable                                                                               |

Backfilling the three `*_code_block`/`remediation_steps` columns to `''` is not a
new convention: `safeString()` (scan.functions.ts:52) already returns `""` for
anything that is not a string.

### policies (`src/lib/scan.functions.ts`)

| Column        | Used by                                                                        | Provided by           | Status                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `togglePolicy().eq("id", …)` (524)                                             | bootstrap             | assumed present — confirm with section 01                                                                                                                                        |
| `name`        | `select("name").eq("enabled", true)` (212, prompt), `listPolicies` order (380) | 0004 §4               | ok, unique + `NOT NULL`                                                                                                                                                          |
| `category`    | `listPolicies().order("category")` (379)                                       | 0004 §4               | ok, indexed with `name` (§4c)                                                                                                                                                    |
| `description` | `Policy` interface (scan-types.ts:50) renders it                               | 0004 §4               | column exists but is **nullable in the DB while the type says non-null**. No code path writes it, so nothing breaks; 0004 §7a has the two optional statements to make them agree |
| `enabled`     | filter 213, update 523                                                         | 0004 §4a              | ok, `NOT NULL DEFAULT true`                                                                                                                                                      |
| `is_active`   | nothing                                                                        | renamed by ad-hoc SQL | dropped by 0004 §4a (state copied into `enabled` first)                                                                                                                          |

### user_roles (`src/lib/scan.functions.ts`)

| Column                     | Used by                                          | Provided by        | Status                                                            |
| -------------------------- | ------------------------------------------------ | ------------------ | ----------------------------------------------------------------- |
| `user_id`                  | `.eq("user_id", userId)` (501)                   | 0002 (primary key) | ok, one row per user enforced by 0004 §5a                         |
| `role`                     | `.select("role").maybeSingle()` (500-502)        | 0002               | ok, `NOT NULL DEFAULT 'user'`, `CHECK (role in ('user','admin'))` |
| `created_at`, `updated_at` | not read; required by the grant snippet 0004 §7c | 0002               | ok                                                                |

`maybeSingle()` raises `PGRST116` (a hard error, not a `null` role) as soon as a
user has two rows, which would lock an admin out of `togglePolicy`. 0004 §5a keeps
the strongest role per user, then adds `unique (user_id)`.

### vault_secrets (`src/lib/vault/vault.functions.ts`)

All eight columns are declared by 0001 and used as declared: `provider` is
`z.enum(["github","gitlab"])` (34/68) and 0001 has the matching
`CHECK (provider in ('github','gitlab'))`. `label` is defaulted (0001) and the
upsert at 47-57 passes `onConflict: "user_id,provider,label"`, which 0001's
`unique (user_id, provider, label)` satisfies. 0004 §1b re-asserts its RLS policy
because a wide-open policy next to the correct one would expose the ciphertext,
token IVs and auth tags of every stored PAT.

### repo_embeddings (`src/lib/embedding.functions.ts`, `src/lib/agent.functions.ts`)

| Column          | Used by                                   | Provided by                        | Status                                                                                                                               |
| --------------- | ----------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `user_id`       | written 206, filtered 242/259             | 0003, added if missing by 0004 §6a | was absent in the ad-hoc shape — the upsert then failed with `42703`                                                                 |
| `owner`, `repo` | written 207-208, filtered 243-244/260-261 | 0003 / 0004 §6a                    | ok                                                                                                                                   |
| `file_path`     | written 209, selected 241, deleted by 262 | 0003 / 0004 §6a                    | ok                                                                                                                                   |
| `content`       | written 210                               | 0003 / 0004 §6a                    | ok                                                                                                                                   |
| `file_sha`      | written 211                               | 0003 / 0004 §6a                    | ok                                                                                                                                   |
| `embedding`     | written 212                               | 0003 / 0004 §6a                    | ok — `vector(768)`, which matches the model both call sites use (`text-embedding-004`, 768 dims, no `outputDimensionality` override) |

Non-column contracts that only fail at runtime:

- `upsert(..., { onConflict: "user_id,owner,repo,file_path" })` (229) needs exactly
  that unique key, otherwise Postgres rejects it with `42P10`. 0004 §6c adds it to
  an ad-hoc table that lacks it.
- RLS must be enabled: with the ad-hoc schema it was not, so the anon key could
  read every indexed repository's contents. 0004 §6e.
- `search_repo_context` must have the parameter names `agent.functions.ts:155`
  passes — `query_embedding`, `match_threshold`, `match_count`, `repo_owner`,
  `repo_name`, `match_user_id`. The ad-hoc overload used
  `target_owner`/`target_repo` and filtered only on `(owner, repo)`, so it both
  ignored tenancy and made PostgREST's overload resolution ambiguous. 0004 §6f
  drops it and re-states the 0003 signature.

## Applying and verifying

```bash
# 1. Snapshot the current truth (read-only, one result set).
#    Paste supabase/diagnostics/live-schema-audit.sql into the Supabase SQL editor.
# 2. Reconcile.
supabase db push        # or paste 0004_reconcile_live_drift.sql into the editor
# 3. Verify: sections 02 / 05 / 09 must show ENABLED, no [PERMISSIVE] markers and
#    no MISSING or LEGACY rows.
npx vitest run src/lib/supabase-schema.test.ts
npx tsc --noEmit
# 4. Regenerate the hand-maintained types so they stop disagreeing with the DB:
npx supabase gen types typescript --project-id <ref> --schema public \
  > src/integrations/supabase/types.ts
```

`0004` is written to be idempotent and non-destructive: it never drops a table,
and the only rows it deletes are (a) duplicate `user_roles` rows, keeping the
strongest role, and (b) `repo_embeddings` rows with a `NULL` `user_id`, which no
tenant query can reach. It deliberately does not touch `policies.description`
(nullability vs. types.ts) or `scans.threat_level`/`findings` (unused columns) —
see its §7 for those.

## What could not be verified from this repo

The migrations and the code agree after 0004, but three things about the **live**
database can only be answered by running `diagnostics/live-schema-audit.sql` and
reading its output:

1. Sections **02/05**: whether the `using (true)` policies and the public
   UPDATE pair on `policies` are still there. If any survive 0004, the sweep in
   §1 could not see them (they would be listed in section 05).
2. Sections **01** for `scans`/`vulnerabilities`/`policies`: the complete column
   list of the three bootstrap tables, including whether `threat_level`,
   `findings` and a `description` column on `scans` exist.
3. Section **07**: whether both `search_repo_context` overloads were present.

Paste those sections back and any remaining difference can be closed precisely,
rather than guessed.
