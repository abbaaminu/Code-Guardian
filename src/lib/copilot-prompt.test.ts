import { describe, expect, it } from "vitest";
import {
  buildCopilotMessages,
  COPILOT_MAX_SOURCE_CHARS,
  COPILOT_SYSTEM_PROMPT,
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
