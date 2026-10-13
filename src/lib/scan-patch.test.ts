import { describe, expect, it } from "vitest";
import { applyVulnerabilityPatch } from "./scan-patch";

describe("applyVulnerabilityPatch", () => {
  it("replaces the exact finding and preserves CRLF source line endings", () => {
    const result = applyVulnerabilityPatch(
      "const value = query;\r\nsend(value);\r\n",
      "send(value);",
      "send(escape(value));",
      2,
      2,
    );

    expect(result).toEqual({
      success: true,
      code: "const value = query;\r\nsend(escape(value));\r\n",
      replacementLineCount: 1,
    });
  });

  it("rejects a snippet that does not match the selected source lines", () => {
    const result = applyVulnerabilityPatch(
      "const value = query;\nsend(value);",
      "send(value);",
      "send(escape(value));",
      1,
      1,
    );

    expect(result).toMatchObject({ success: false });
  });

  it("rejects duplicate snippets even when a line range was supplied", () => {
    const result = applyVulnerabilityPatch(
      "send(value);\nsend(value);",
      "send(value);",
      "send(escape(value));",
      1,
      1,
    );

    expect(result).toMatchObject({
      success: false,
      reason: expect.stringContaining("ambiguous"),
    });
  });

  it.each([
    "send(value);",
    "// TODO: replace this",
    "/* Automated fix unavailable; see remediation. */",
  ])("rejects no-op or placeholder replacement %s", (fixedCode) => {
    const result = applyVulnerabilityPatch(
      "send(value);",
      "send(value);",
      fixedCode,
      1,
      1,
    );

    expect(result).toMatchObject({ success: false });
  });
});
