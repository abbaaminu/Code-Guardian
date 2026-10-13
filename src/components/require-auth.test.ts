import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const source = readFileSync(
  path.join(repoRoot, "src", "components", "require-auth.tsx"),
  "utf8",
);

describe("RequireAuth session check", () => {
  it("logs session-check failures, fails closed, and settles checked while mounted", () => {
    expect(source).toContain("let mounted = true;");
    expect(source).toContain(
      'console.error("[auth] Failed to check the current session:", error)',
    );
    expect(source).toContain(".catch((error: unknown) => {");
    expect(source).toContain('navigate({ to: "/login" });');
    expect(source).toContain(".finally(() => {");
    expect(source).toContain("if (mounted) setChecked(true);");
    expect(source).toContain("if (!mounted) return;");
    expect(source).toContain("mounted = false;");
    expect(source).toContain("sub.subscription.unsubscribe();");
  });
});
