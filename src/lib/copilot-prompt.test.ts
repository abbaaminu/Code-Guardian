import { describe, expect, it } from "vitest";
import {
  buildCopilotMessages,
  COPILOT_BATCH_CONTRACT,
  COPILOT_MAX_FINDINGS,
  COPILOT_MAX_SOURCE_CHARS,
  COPILOT_SYSTEM_PROMPT,
  isFixAllInstruction,
} from "./copilot-prompt";

describe("buildCopilotMessages", () => {
  it("sends the contract plus the code and finding context", () => {
    const [system, user] = buildCopilotMessages({
      instruction: "Fix the SQL injection",
      fileType: "Python",
      sourceCode: "cursor.execute(query)",
      context: "CWE-89 at line 12",
    });

    expect(system).toEqual({ role: "system", content: COPILOT_SYSTEM_PROMPT });
    expect(user.content).toContain("Language / file type: Python");
    expect(user.content).toContain("Instruction: Fix the SQL injection");
    expect(user.content).toContain("Finding context:\nCWE-89 at line 12");
    expect(user.content).toContain(
      "--- CODE START ---\ncursor.execute(query)\n--- CODE END ---",
    );
  });

  it("answers without source code instead of refusing", () => {
    const [, user] = buildCopilotMessages({
      instruction: "What is CWE-89?",
      fileType: "Python",
    });

    expect(user.content).toContain("no source code supplied");
    expect(user.content).not.toContain("undefined");
  });

  it("truncates oversized files and says so", () => {
    const [, user] = buildCopilotMessages({
      instruction: "Review",
      fileType: "TypeScript",
      sourceCode: "a".repeat(COPILOT_MAX_SOURCE_CHARS + 500),
    });

    expect(user.content).toContain(
      `first ${COPILOT_MAX_SOURCE_CHARS} characters`,
    );
    expect(user.content.length).toBeLessThan(COPILOT_MAX_SOURCE_CHARS + 1_000);
  });
});

describe("isFixAllInstruction", () => {
  it.each([
    "Fix all findings",
    "fix all of the issues in this scan",
    "Remediate every vulnerability",
    "Patch each finding",
    "apply fixes to all problems",
  ])("treats %p as a batch remediation", (instruction) => {
    expect(isFixAllInstruction(instruction)).toBe(true);
  });

  it.each([
    "Explain why all findings were not fixed",
    "Why are all findings still open?",
    "What does fixing every finding involve?",
    "Review all findings",
    "How do I fix all of these?",
    "Fix the SQL injection",
    "",
  ])("keeps %p as a normal chat turn", (instruction) => {
    expect(isFixAllInstruction(instruction)).toBe(false);
  });
});

describe("buildCopilotMessages in batch mode", () => {
  const findings = [
    {
      id: "vuln-1",
      title: "SQL injection",
      severity: "high",
      cwe: "CWE-89",
      filePath: "api/users.ts",
      startLine: 12,
      endLine: 14,
      vulnerableCode: "db.query(`SELECT * FROM users WHERE id=${id}`)",
      suggestedFix: "db.query('SELECT * FROM users WHERE id = ?', [id])",
      remediation: "Bind the parameter.",
    },
    {
      id: "vuln-2",
      title: "Hardcoded secret",
      severity: "medium",
      filePath: "api/config.ts",
      startLine: 4,
      endLine: 4,
      vulnerableCode: "const token = 'abc123';",
    },
  ];

  it("adds the batch contract and serializes every finding", () => {
    const [system, user] = buildCopilotMessages({
      instruction: "Fix all findings",
      fileType: "TypeScript",
      sourceCode: "const id = req.query.id;",
      findings,
      fixAll: true,
    });

    expect(system.content).toContain(COPILOT_BATCH_CONTRACT);
    expect(system.content.startsWith(COPILOT_SYSTEM_PROMPT)).toBe(true);
    expect(user.content).toContain("Mode: BATCH REMEDIATION");
    expect(user.content).toContain(
      "Unpatched findings in this scan (2 total; remediate all of them):",
    );
    expect(user.content).toContain("vulnerability_id: vuln-1");
    expect(user.content).toContain("vulnerability_id: vuln-2");
    expect(user.content).toContain("location: api/users.ts · lines 12-14");
    expect(user.content).toContain("scan_suggested_fix:");
    expect(user.content).toContain(
      "Anchor every patch to the exact vulnerable lines.",
    );
    expect(user.content).not.toContain("were omitted from this prompt");
  });

  it("infers the batch contract from the instruction alone", () => {
    const [system, user] = buildCopilotMessages({
      instruction: "Fix all findings",
      fileType: "TypeScript",
      findings,
    });

    expect(system.content).toContain(COPILOT_BATCH_CONTRACT);
    expect(user.content).toContain("vulnerability_id: vuln-2");
  });

  it("keeps a plain chat turn single-finding even when the scan set is supplied", () => {
    const [system, user] = buildCopilotMessages({
      instruction: "What is CWE-89?",
      fileType: "TypeScript",
      findings,
    });

    expect(system).toEqual({ role: "system", content: COPILOT_SYSTEM_PROMPT });
    expect(user.content).not.toContain("BATCH REMEDIATION");
    expect(user.content).not.toContain("vulnerability_id: vuln-1");
  });

  it("caps the finding list and never claims the omitted findings were patched", () => {
    const oversized = Array.from(
      { length: COPILOT_MAX_FINDINGS + 5 },
      (_, i) => ({
        id: `vuln-${i}`,
        title: `Finding ${i}`,
        startLine: 1,
        endLine: 1,
      }),
    );
    const [, user] = buildCopilotMessages({
      instruction: "Fix all findings",
      fileType: "TypeScript",
      findings: oversized,
      fixAll: true,
    });

    expect(user.content).toContain(`(${COPILOT_MAX_FINDINGS} supplied)`);
    expect(user.content).toContain(
      `vulnerability_id: vuln-${COPILOT_MAX_FINDINGS - 1}`,
    );
    expect(user.content).not.toContain(
      `vulnerability_id: vuln-${COPILOT_MAX_FINDINGS}`,
    );
  });
});
