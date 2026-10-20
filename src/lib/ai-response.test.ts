import { describe, expect, it } from "vitest";
import { parseCopilotResponse, parseAuditVulnerabilities } from "./ai-response";

describe("parseAuditVulnerabilities", () => {
  it("returns the vulnerabilities from a valid response", () => {
    const findings = [{ title: "Unsafe query" }];

    expect(
      parseAuditVulnerabilities(JSON.stringify({ vulnerabilities: findings })),
    ).toEqual(findings);
  });

  it("accepts a valid response with no findings", () => {
    expect(parseAuditVulnerabilities('{"vulnerabilities":[]}')).toEqual([]);
  });

  it("rejects malformed JSON instead of reporting a clean scan", () => {
    expect(() => parseAuditVulnerabilities("{")).toThrow(
      "AI provider returned invalid JSON",
    );
  });

  it("rejects responses without a vulnerabilities array", () => {
    expect(() => parseAuditVulnerabilities("{}")).toThrow(
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

  it("accepts a question-style reply that proposes no code change", () => {
    const result = parseCopilotResponse(
      JSON.stringify({
        summary: "The query is injectable through string concatenation.",
        changes: ["Use a parameterized query."],
        updated_code: "",
        answer:
          "The query interpolates user input directly. Bind it as a parameter.",
      }),
    );

    expect(result.updated_code).toBe("");
    expect(result.answer).toContain("Bind it as a parameter");
  });

  it("recovers a payload wrapped in a markdown fence", () => {
    const fenced =
      '```json\n{"summary":"Fixed.","changes":[],"updated_code":"const safe = true;"}\n```';

    expect(parseCopilotResponse(fenced).updated_code).toBe(
      "const safe = true;",
    );
  });

  it("strips a markdown fence from the returned source", () => {
    const result = parseCopilotResponse(
      JSON.stringify({
        summary: "Fixed.",
        changes: [],
        updated_code: "```ts\nconst safe = true;\n```",
      }),
    );

    expect(result.updated_code).toBe("const safe = true;");
  });
});
