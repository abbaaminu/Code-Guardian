import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const migration = readFileSync(
  path.join(
    repoRoot,
    "supabase",
    "migrations",
    "0004_reconcile_live_drift.sql",
  ),
  "utf8",
)
  .split("\n")
  .map((line) =>
    line.slice(0, line.indexOf("--") === -1 ? undefined : line.indexOf("--")),
  )
  .join(" ")
  .replace(/\s+/g, " ")
  .toLowerCase();

describe("vulnerabilities scan foreign key reconciliation", () => {
  it("replaces any non-cascading scan_id FK and preserves idempotence", () => {
    expect(migration).toContain("confdeltype = 'c'");
    expect(migration).toContain(
      "and not ( confrelid = 'public.scans'::regclass and confkey = array[scans_id_attnum] and confdeltype = 'c' )",
    );
    expect(migration).toContain(
      "alter table public.vulnerabilities drop constraint %i",
    );
    expect(migration).toContain(
      "if not exists ( select 1 from pg_constraint con",
    );
    expect(migration).toContain(
      "add constraint vulnerabilities_scan_id_fkey foreign key (scan_id) references public.scans (id) on delete cascade",
    );
  });
});
