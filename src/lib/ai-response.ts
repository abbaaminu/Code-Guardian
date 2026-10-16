import { z } from "zod";

const AuditResponse = z.object({
  vulnerabilities: z.array(z.unknown()),
});

const CopilotResponse = z.object({
  updated_code: z.string().min(1).max(200_000),
  summary: z.string().min(1),
  changes: z.array(z.string()),
});

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI provider returned invalid JSON.");
  }
}

export function parseAuditVulnerabilities(content: string): unknown[] {
  const parsed = AuditResponse.safeParse(parseJson(content));
  if (!parsed.success) {
    throw new Error(
      "AI provider returned an invalid security audit response: expected a vulnerabilities array.",
    );
  }

  return parsed.data.vulnerabilities;
}

export function parseCopilotResponse(content: string): {
  updated_code: string;
  summary: string;
  changes: string[];
} {
  const parsed = CopilotResponse.safeParse(parseJson(content));
  if (!parsed.success) {
    throw new Error(
      "AI provider returned an invalid copilot response: expected updated_code, summary, and changes.",
    );
  }

  return {
    updated_code: parsed.data.updated_code,
    summary: parsed.data.summary.slice(0, 500),
    changes: parsed.data.changes.slice(0, 5),
  };
}
