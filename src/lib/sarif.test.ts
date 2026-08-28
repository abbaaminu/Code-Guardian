import { describe, expect, it } from "vitest";
import { buildSarifLog, type SarifFinding } from "./sarif";

// Minimal structural types for the SARIF shapes the tests reach into.
interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level?: "error" | "warning" | "note" | "none";
  locations?: Array<{
    physicalLocation: { region: { startLine: number } };
  }>;
}

interface SarifRule {
  id: string;
  properties: { tags: string[] };
}

interface SarifLog {
  version: string;
  runs: Array<{
    tool: { driver: { name: string; rules?: SarifRule[] } };
    results: SarifResult[];
  }>;
}

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
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "scan-1",
      projectName: "demo",
      findings: [finding()],
    }) as unknown as SarifLog;
    expect(log.version).toBe("2.1.0");
    expect(log.runs).toHaveLength(1);
    expect(log.runs[0].tool.driver.name).toBe("SecurePulse");
  });

  it("maps severity to the correct SARIF level", () => {
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "s",
      projectName: "p",
      findings: [
        finding({ severity: "critical" }),
        finding({ severity: "medium" }),
        finding({ severity: "low" }),
      ],
    }) as unknown as SarifLog;
    const levels = log.runs[0].results.map((r) => r.level);
    expect(levels).toEqual(["error", "warning", "note"]);
  });

  it("dedupes rule definitions for repeated CWEs but keeps one result per finding", () => {
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "s",
      projectName: "p",
      findings: [finding(), finding({ line_start: 20, line_end: 20 })],
    }) as unknown as SarifLog;
    expect(log.runs[0].results).toHaveLength(2);
    expect(log.runs[0].tool.driver.rules).toHaveLength(1);
  });

  it("includes the compliance mapping in rule tags", () => {
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "s",
      projectName: "p",
      findings: [finding()],
    }) as unknown as SarifLog;
    const rule = log.runs[0].tool.driver.rules![0];
    expect(rule.properties.tags).toContain("A03:2021 - Injection");
  });

  it("clamps line numbers to at least 1 for findings with no location info", () => {
    const log = buildSarifLog({
      toolVersion: "1.0.0",
      scanId: "s",
      projectName: "p",
      findings: [finding({ line_start: null, line_end: null })],
    }) as unknown as SarifLog;
    const region = log.runs[0].results[0].locations![0].physicalLocation.region;
    expect(region.startLine).toBeGreaterThanOrEqual(1);
  });
});
