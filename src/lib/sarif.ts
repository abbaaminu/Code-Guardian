// SARIF 2.1.0 (Static Analysis Results Interchange Format) exporter.
//
// Producing SARIF is what actually lets this tool plug into a developer's
// existing workflow: `github/codeql-action/upload-sarif` renders SARIF natively
// in the GitHub Security tab, VS Code's SARIF Viewer extension opens it directly,
// and every major DevOps pipeline (Azure DevOps, GitLab, Jenkins security
// dashboards) can ingest it. Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0

import { mapCwe } from "./compliance-mapping";
import type { Severity } from "./severity";

export interface SarifFinding {
  title: string;
  severity: Severity;
  cwe_id: string | null;
  vulnerable_code_block: string;
  remediation_steps: string;
  file_path: string | null;
  line_start: number | null;
  line_end: number | null;
}

const SEVERITY_TO_SARIF_LEVEL: Record<Severity, "error" | "warning" | "note"> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
};

// SARIF security-severity follows the OWASP/CVSS-like 0-10 convention used by
// GitHub's code scanning UI to color and sort alerts.
const SEVERITY_TO_SCORE: Record<Severity, string> = {
  critical: "9.5",
  high: "7.5",
  medium: "5.0",
  low: "2.5",
};

function ruleIdFor(title: string, cweId: string | null): string {
  const base = (cweId ?? title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `securepulse/${base || "finding"}`;
}

export function buildSarifLog(params: {
  toolVersion: string;
  scanId: string;
  projectName: string;
  findings: SarifFinding[];
}) {
  const { toolVersion, scanId, projectName, findings } = params;

  const ruleIndex = new Map<string, number>();
  const rules: Record<string, unknown>[] = [];

  const results = findings.map((f) => {
    const cwe = f.cwe_id ?? null;
    const mapping = mapCwe(cwe);
    const ruleId = ruleIdFor(f.title, cwe);

    if (!ruleIndex.has(ruleId)) {
      ruleIndex.set(ruleId, rules.length);
      rules.push({
        id: ruleId,
        name: f.title.replace(/\s+/g, ""),
        shortDescription: { text: f.title },
        fullDescription: { text: f.remediation_steps },
        helpUri: cwe ? `https://cwe.mitre.org/data/definitions/${cwe.replace(/^CWE-/i, "")}.html` : undefined,
        properties: {
          tags: [
            "security",
            cwe ?? "unmapped",
            ...(mapping.owasp ? [mapping.owasp] : []),
            ...mapping.pciDss.map((p) => `PCI-DSS ${p}`),
            ...mapping.soc2.map((s) => `SOC2 ${s}`),
          ],
          "security-severity": SEVERITY_TO_SCORE[f.severity],
          precision: "medium",
        },
      });
    }

    const line = Math.max(1, f.line_start ?? 1);
    const endLine = Math.max(line, f.line_end ?? line);

    return {
      ruleId,
      ruleIndex: ruleIndex.get(ruleId),
      level: SEVERITY_TO_SARIF_LEVEL[f.severity],
      message: { text: `${f.title}${cwe ? ` (${cwe})` : ""} — ${f.remediation_steps}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: f.file_path ?? projectName, uriBaseId: "%SRCROOT%" },
            region: {
              startLine: line,
              endLine,
              snippet: { text: f.vulnerable_code_block.slice(0, 4000) },
            },
          },
        },
      ],
      partialFingerprints: {
        securePulseFindingHash: `${scanId}:${ruleId}:${line}`,
      },
    };
  });

  return {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "SecurePulse",
            informationUri: "https://securepulse.dev",
            version: toolVersion,
            rules,
          },
        },
        originalUriBaseIds: { SRCROOT: { uri: "file:///" } },
        results,
      },
    ],
  };
}
