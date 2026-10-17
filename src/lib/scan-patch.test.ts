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

  it("matches spacing differences and indentation while preserving target indentation", () => {
    const result = applyVulnerabilityPatch(
      "function run() {\n    send( value );\n}",
      "send(value);",
      "send(escape(value));",
      2,
      2,
    );

    expect(result).toEqual({
      success: true,
      code: "function run() {\n    send(escape(value));\n}",
      replacementLineCount: 1,
    });
  });

  it("matches snippets after line drift and normalizes CRLF patch text", () => {
    const result = applyVulnerabilityPatch(
      "first();\r\n  send( value );\r\nlast();\r\n",
      "\r\nsend(value);\r\n",
      "\r\nsend(escape(value));\r\n",
      1,
      1,
    );

    expect(result).toEqual({
      success: true,
      code: "first();\r\n  send(escape(value));\r\nlast();\r\n",
      replacementLineCount: 1,
    });
  });

  it("rejects a vulnerable snippet that is absent from the source", () => {
    const result = applyVulnerabilityPatch(
      "const value = query;\nsend(other);",
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
