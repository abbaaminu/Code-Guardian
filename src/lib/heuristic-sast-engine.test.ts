import { describe, expect, it } from "vitest";
import { runHeuristicSAST } from "./heuristic-sast-engine";

describe("runHeuristicSAST", () => {
  it("flags a hardcoded API key", () => {
    const findings = runHeuristicSAST(
      'const api_key = "sk_live_1234567890abcdef";',
    );
    expect(findings.some((f) => f.title.includes("Hardcoded Secret"))).toBe(
      true,
    );
  });

  it("flags SQL built via %s interpolation", () => {
    const findings = runHeuristicSAST(
      'cursor.execute("SELECT * FROM users WHERE id = %s", uid)',
    );
    expect(findings.some((f) => f.cwe_id === "CWE-89")).toBe(true);
  });

  it("does not flag comments", () => {
    const findings = runHeuristicSAST(
      '// const api_key = "sk_live_1234567890abcdef";\n# password = "sk_live_1234567890abcdef"',
    );
    expect(findings).toHaveLength(0);
  });

  it("tracks line numbers", () => {
    const findings = runHeuristicSAST(
      'const a = 1;\nconst password = "sk_live_1234567890abcdef";',
    );
    const hit = findings.find((f) => f.title.includes("Hardcoded Secret"));
    expect(hit?.line_start).toBe(2);
  });

  it("handles a long interpolated SQL line in linear time (H2 regression)", () => {
    // The old regex `/.*(%s|...)` was quadratic on a non-matching long line;
    // this is exactly the input that used to take seconds. The lazy rewrite
    // finds the trailing `%s` at the first opportunity.
    const longMatch = "SELECT " + "a".repeat(50_000) + " %s";
    const findings = runHeuristicSAST(longMatch);
    expect(findings.some((f) => f.cwe_id === "CWE-89")).toBe(true);
  });

  it("skips absurdly long lines instead of scanning them (defense-in-depth)", () => {
    const huge = "x".repeat(150_000);
    expect(() => runHeuristicSAST(huge)).not.toThrow();
    expect(runHeuristicSAST(huge)).toHaveLength(0);
  });

  it("does not throw on empty or one-line input", () => {
    expect(runHeuristicSAST("")).toHaveLength(0);
    expect(runHeuristicSAST("const x = 1;")).toHaveLength(0);
  });
});
