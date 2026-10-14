import { describe, expect, it } from "vitest";
import {
  parseCopilotResponse,
  parseGeminiVulnerabilities,
} from "./gemini-response";

describe("parseGeminiVulnerabilities", () => {
  it("returns the vulnerabilities from a valid response", () => {
    const findings = [{ title: "Unsafe query" }];

    expect(
      parseGeminiVulnerabilities(JSON.stringify({ vulnerabilities: findings })),
    ).toEqual(findings);
  });

  it("accepts a valid response with no findings", () => {
    expect(parseGeminiVulnerabilities('{"vulnerabilities":[]}')).toEqual([]);
  });

  it("rejects malformed JSON instead of reporting a clean scan", () => {
    expect(() => parseGeminiVulnerabilities("{")).toThrow(
      "Gemini returned invalid JSON",
    );
  });

  it("rejects responses without a vulnerabilities array", () => {
    expect(() => parseGeminiVulnerabilities("{}")).toThrow(
      "expected a vulnerabilities array",
    );
  });
});

describe("parseCopilotResponse", () => {
  it("returns a validated copilot response", () => {
    const response = {
      updated_code: "const safe = true;",
      summary: "Use a safe constant.",
      changes: ["Removed unsafe input handling."],
    };

    expect(parseCopilotResponse(JSON.stringify(response))).toEqual(response);
  });

  it("caps the returned change list to the prompt limit", () => {
    const changes = Array.from({ length: 7 }, (_, index) => `Change ${index}`);

    expect(
      parseCopilotResponse(
        JSON.stringify({
          updated_code: "const safe = true;",
          summary: "Updated.",
          changes,
        }),
      ).changes,
    ).toHaveLength(5);
  });

  it("rejects incomplete responses instead of returning unchanged source", () => {
    expect(() => parseCopilotResponse('{"updated_code":"original"}')).toThrow(
      "expected updated_code, summary, and changes",
    );
  });
});
