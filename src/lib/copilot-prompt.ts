import type { DeepSeekMessage } from "@/lib/deepseek";

// WHY a shared module: the copilot prompt used to be duplicated (with drifted
// wording) in `copilotRemediate` and the streaming route. Both now build their
// messages here so the output contract can only be changed in one place.
export const COPILOT_MAX_SOURCE_CHARS = 60_000;

export const COPILOT_SYSTEM_PROMPT = `You are SecurePulse Remediation Copilot, a senior application-security engineer embedded in a code review workspace.
You explain the security issues in the file under review and rewrite that file when the user asks for a fix.

STRICT OUTPUT CONTRACT:
- Return ONLY a JSON object: {"summary": string, "changes": string[], "updated_code": string, "answer": string}
- "answer": your full reply to the user (plain text or light markdown, no code fences). Explain the risk, the root cause and the exact fix. Stay focused; about 400 words maximum.
- "summary": ONE sentence, at most 160 characters, describing the outcome. It is used as a notification title.
- "changes": up to 5 short, concrete edits or recommendations.
- "updated_code": the ENTIRE rewritten source file when a code change is requested and source code was supplied. NO markdown fences, NO placeholders, NO "TODO" comments. Use "" when the user only asked a question or when no source code was provided.
- Ground the reply in the supplied finding context (CWE id, severity, line range) and patch that exact issue when present.
- Never invent findings that the supplied code or context does not support.
- If the request is unrelated to software security, unclear, or unsafe, decline briefly in "answer" and leave "updated_code" as "".`;

export interface CopilotPromptInput {
  instruction: string;
  fileType?: string;
  sourceCode?: string;
  context?: string;
}

/**
 * Builds the DeepSeek chat messages for a copilot turn.
 *
 * The copilot deliberately works without a scan: when no source code is
 * available it answers the question from the finding context (or from general
 * security knowledge) instead of refusing to run.
 */
export function buildCopilotMessages({
  instruction,
  fileType,
  sourceCode,
  context,
}: CopilotPromptInput): DeepSeekMessage[] {
  const language = fileType?.trim() || "text";
  const source = sourceCode ?? "";
  const truncated = source.length > COPILOT_MAX_SOURCE_CHARS;
  const code = truncated ? source.slice(0, COPILOT_MAX_SOURCE_CHARS) : source;

  const sections = [
    `Language / file type: ${language}`,
    `Instruction: ${instruction}`,
  ];

  if (context?.trim()) {
    sections.push(`Finding context:\n${context.trim()}`);
  }

  sections.push(
    code.trim()
      ? [
          `--- CODE START ---\n${code}\n--- CODE END ---`,
          truncated
            ? `(The file was truncated to the first ${COPILOT_MAX_SOURCE_CHARS} characters.)`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "--- CODE START ---\n(no source code supplied; answer the question only and leave updated_code empty)\n--- CODE END ---",
  );

  return [
    { role: "system", content: COPILOT_SYSTEM_PROMPT },
    { role: "user", content: sections.join("\n\n") },
  ];
}
