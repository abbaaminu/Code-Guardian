import { describe, expect, it } from "vitest";
import { buildPositionMap, formatFindingBody } from "./pr-comments";

const SAMPLE_DIFF = `diff --git a/src/db.ts b/src/db.ts
index 1234567..89abcde 100644
--- a/src/db.ts
+++ b/src/db.ts
@@ -10,6 +10,7 @@ export function getUser(req) {
 function getUser(req) {
   const id = req.params.id;
-  return db.query("SELECT * FROM users");
+  return db.query(\`SELECT * FROM users WHERE id = \${id}\`);
+  // added a comment
 }
`;

describe("buildPositionMap", () => {
  it("maps new-file line numbers to diff positions for a changed file", () => {
    const map = buildPositionMap(SAMPLE_DIFF);
    expect(map.has("src/db.ts")).toBe(true);
    const fileMap = map.get("src/db.ts")!;
    // line 12 in the new file is the replaced query() call
    expect(fileMap.has(12)).toBe(true);
  });

  it("does not create an entry for files with no diff", () => {
    const map = buildPositionMap(SAMPLE_DIFF);
    expect(map.has("src/unrelated.ts")).toBe(false);
  });
});

describe("formatFindingBody", () => {
  it("includes the CWE link and remediation text", () => {
    const body = formatFindingBody({
      filePath: "src/db.ts",
      line: 12,
      severity: "critical",
      title: "SQL Injection",
      cweId: "CWE-89",
      remediation: "Use parameterized queries.",
    });
    expect(body).toContain("CWE-89");
    expect(body).toContain("Use parameterized queries.");
  });
});
