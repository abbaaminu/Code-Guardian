import { describe, expect, it } from "vitest";
import { buildSarifLog, type SarifFinding } from "./sarif";

function finding(overrides: Partial<SarifFinding> = {}): SarifFinding {
  return {
    title: "SQL Injection via string-built query",
    severity: "critical",
    cwe_id: "CWE-89",
    vulnerable_code_block: "db.query(`SELECT * FROM users WHERE id = ${id}`)",
    remediation_steps: "Use parameterized queries.",
    file_path: "src/db.ts",
    line_start: 12,
    line_end: 12,
    ...overrides,
  };
}

describe("buildSarifLog", () => {
  it("produces a valid SARIF 2.1.0 envelope", () => {
    const log = buildSarifLog({ toolVersion: "1.0.0", scanId: "scan-1", projectName: "demo", findings: [finding()] });
    expect(log.version).toBe("2.1.0");
    expect(log.runs).toHaveLength(1);
    expect(log.runs[0].tool.driver.name).toBe("SecurePulse");
  });

  it("maps severity to the correct SARIF level", () => {
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "s",
      projectName: "p",
      findings: [finding({ severity: "critical" }), finding({ severity: "medium" }), finding({ severity: "low" })],
    });
    const levels = log.runs[0].results.map((r: any) => r.level);
    expect(levels).toEqual(["error", "warning", "note"]);
  });

  it("dedupes rule definitions for repeated CWEs but keeps one result per finding", () => {
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "s",
      projectName: "p",
      findings: [finding(), finding({ line_start: 20, line_end: 20 })],
    });
    expect(log.runs[0].results).toHaveLength(2);
    expect(log.runs[0].tool.driver.rules).toHaveLength(1);
  });

  it("includes the compliance mapping in rule tags", () => {
    const log = buildSarifLog({ toolVersion: "1.0.0", scanId: "s", projectName: "p", findings: [finding()] });
    const rule = log.runs[0].tool.driver.rules[0] as any;
    expect(rule.properties.tags).toContain("A03:2021 - Injection");
  });

  it("clamps line numbers to at least 1 for findings with no location info", () => {
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "s",
      projectName: "p",
      findings: [finding({ line_start: null, line_end: null })],
    });
    const region = (log.runs[0].results[0] as any).locations[0].physicalLocation.region;
    expect(region.startLine).toBeGreaterThanOrEqual(1);
  });
});
