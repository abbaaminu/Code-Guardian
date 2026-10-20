import { z } from "zod";

const AuditResponse = z.object({
  vulnerabilities: z.array(z.unknown()),
});

const CopilotResponse = z.object({
  // Not `.min(1)`: the copilot is also a Q&A assistant, and a question that
  // needs no code change legitimately returns an empty `updated_code`.
  updated_code: z.string().max(200_000).default(""),
  summary: z.string().min(1).max(4_000),
  changes: z.array(z.string()).default([]),
  answer: z.string().max(20_000).optional(),
});

/**
 * Extracts JSON from a model reply.
 *
 * Providers occasionally wrap the payload in a markdown fence or add a
 * sentence before it even when asked not to. Failing the whole scan on that
 * (which is what the strict `JSON.parse` did) is worse than recovering the
 * object, so we try the raw text first and then the fenced / braced slices.
 */
function parseJson(content: string): unknown {
  const candidates: string[] = [content];

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(content);
  if (fenced?.[1]) candidates.push(fenced[1]);

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next, more forgiving candidate.
    }
  }

  throw new Error("AI provider returned invalid JSON.");
}

/** Models sometimes disobey and wrap `updated_code` in a markdown fence. */
function stripCodeFence(value: string): string {
  const match =
    /^\s*```[a-zA-Z0-9+#.-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```\s*$/.exec(value);
  return match ? match[1] : value;
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

export interface CopilotResponseResult {
  updated_code: string;
  summary: string;
  changes: string[];
  /** Full prose answer for question-style turns (no code change requested). */
  answer?: string;
}

export function parseCopilotResponse(content: string): CopilotResponseResult {
  const parsed = CopilotResponse.safeParse(parseJson(content));
  if (!parsed.success) {
    throw new Error(
      "AI provider returned an invalid copilot response: expected updated_code, summary, and changes.",
    );
  }

  const result: CopilotResponseResult = {
    updated_code: stripCodeFence(parsed.data.updated_code),
    summary: parsed.data.summary.slice(0, 500),
    changes: parsed.data.changes.slice(0, 5),
  };

  const answer = parsed.data.answer?.trim();
  if (answer) result.answer = answer.slice(0, 8_000);

  return result;
}
