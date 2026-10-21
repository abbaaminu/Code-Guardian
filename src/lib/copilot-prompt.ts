import type { DeepSeekMessage } from "@/lib/deepseek";

// WHY a shared module: the copilot prompt used to be duplicated (with drifted
// wording) in `copilotRemediate` and the streaming route. Both now build their
// messages here so the output contract can only be changed in one place.
export const COPILOT_MAX_SOURCE_CHARS = 60_000;

/**
 * Upper bound for a single batch turn. Scans normally produce a handful of
 * findings; the cap only protects the DeepSeek context window and the request
 * body from a pathological report.
 */
export const COPILOT_MAX_FINDINGS = 100;

/** Per-code-block clip so one huge listing cannot crowd out the other findings. */
export const COPILOT_MAX_FINDING_CODE_CHARS = 1_600;

/**
 * Soft budget for the serialized findings section. Every finding is included
 * until this is reached; the remainder (if any) is reported to the model by
 * count so it never invents findings it was not shown.
 */
export const COPILOT_MAX_FINDINGS_BLOCK_CHARS = 120_000;

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

/**
 * Additional contract for "Fix All Findings" turns. Batch remediation cannot
 * rewrite a single file because findings may live in different files, so the
 * model returns one anchored patch per finding instead.
 */
export const COPILOT_BATCH_CONTRACT = `BATCH REMEDIATION CONTRACT (this turn only):
- Return the same JSON object plus a "patches" array: {"summary": string, "changes": string[], "updated_code": "", "answer": string, "patches": [{"vulnerability_id": string, "file_path": string, "vulnerable_code": string, "fixed_code": string}]}
- Emit exactly one patch per finding in the supplied list and reuse its "vulnerability_id" verbatim. Never merge, renumber or rename findings.
- "vulnerable_code" must be the exact vulnerable lines from the workspace source (no line numbers, no comments added) so the patch can be anchored.
- "fixed_code" must be the COMPLETE secure replacement for exactly those lines. NO markdown fences, NO placeholders, NO ellipses, NO "TODO" comments.
- Cover every vulnerable file and line range in the supplied list, including low-severity findings.
- Set "updated_code" to "" for batch turns; the per-finding "patches" array carries the diff.
- If a finding cannot be fixed safely, omit its patch and explain why in "answer" instead of inventing code.`;

export interface CopilotPromptFinding {
  id: string;
  title: string;
  severity?: string;
  cwe?: string | null;
  filePath?: string | null;
  startLine?: number | null;
  endLine?: number | null;
  vulnerableCode?: string;
  suggestedFix?: string;
  remediation?: string;
}

export interface CopilotPromptInput {
  instruction: string;
  fileType?: string;
  sourceCode?: string;
  context?: string;
  /** Entire unpatched finding set for the scan. Only used for batch turns. */
  findings?: CopilotPromptFinding[];
  /** Forces the batch contract; otherwise it is inferred from `instruction`. */
  fixAll?: boolean;
}

const FIX_ALL_VERB =
  /\b(?:fix|patch|remediate|resolve|repair|address|correct|apply(?:\s+fix(?:es)?\s+(?:for|to))?)\b/i;
const FIX_ALL_TARGET = /\b(?:all|every|each|everything)\b/i;

/**
 * Detects a workspace-wide remediation request, e.g. "Fix All Findings",
 * "fix all problems", "fix all issues", "remediate every vulnerability".
 *
 * Deliberately excludes question-style openers so "Explain why all findings
 * were not fixed" stays a normal chat turn instead of triggering a rewrite.
 */
export function isFixAllInstruction(instruction: string): boolean {
  const text = instruction.trim();
  if (!text) return false;
  if (
    /^(?:explain|describe|why|what|how|review|summari[sz]e|list|show)\b/i.test(
      text,
    )
  ) {
    return false;
  }
  return FIX_ALL_VERB.test(text) && FIX_ALL_TARGET.test(text);
}

function clip(value: string, limit: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}\n… (truncated)`;
}

function describeFinding(finding: CopilotPromptFinding, index: number): string {
  const location = [
    finding.filePath?.trim() || "workspace source",
    finding.startLine
      ? `lines ${finding.startLine}-${finding.endLine ?? finding.startLine}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    `FINDING ${index + 1}`,
    `vulnerability_id: ${finding.id}`,
    `title: ${finding.title}`,
    finding.severity ? `severity: ${finding.severity}` : "",
    finding.cwe ? `cwe: ${finding.cwe}` : "",
    `location: ${location}`,
    finding.remediation
      ? `remediation_guidance: ${clip(finding.remediation, 600)}`
      : "",
    finding.vulnerableCode
      ? `vulnerable_code:\n${clip(finding.vulnerableCode, COPILOT_MAX_FINDING_CODE_CHARS)}`
      : "",
    finding.suggestedFix
      ? `scan_suggested_fix:\n${clip(finding.suggestedFix, COPILOT_MAX_FINDING_CODE_CHARS)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Serializes the whole unpatched finding array within the prompt budget and
 * reports any omitted findings by count (never silently).
 */
function buildFindingsSection(findings: CopilotPromptFinding[]): string {
  const blocks: string[] = [];
  let size = 0;
  let omitted = 0;

  for (const [index, finding] of findings.entries()) {
    const block = describeFinding(finding, index);
    if (size > 0 && size + block.length > COPILOT_MAX_FINDINGS_BLOCK_CHARS) {
      omitted = findings.length - index;
      break;
    }
    blocks.push(block);
    size += block.length + 2;
  }

  const header = `Unpatched findings in this scan (${findings.length} total; remediate all of them):`;
  const footer =
    omitted > 0
      ? `\n\n${omitted} additional finding${omitted === 1 ? "" : "s"} were omitted from this prompt because the workspace exceeded the context budget. Do not invent patches for them.`
      : "";

  return `${header}\n\n${blocks.join("\n\n")}${footer}`;
}

/**
 * Builds the DeepSeek chat messages for a copilot turn.
 *
 * The copilot deliberately works without a scan: when no source code is
 * available it answers the question from the finding context (or from general
 * security knowledge) instead of refusing to run.
 *
 * When `findings` carries the scan's unpatched set and the turn is a fix-all
 * request, the batch contract is used and every finding is serialized so the
 * model can emit one anchored patch per file/line range.
 */
export function buildCopilotMessages({
  instruction,
  fileType,
  sourceCode,
  context,
  findings,
  fixAll,
}: CopilotPromptInput): DeepSeekMessage[] {
  const language = fileType?.trim() || "text";
  const source = sourceCode ?? "";
  const truncated = source.length > COPILOT_MAX_SOURCE_CHARS;
  const code = truncated ? source.slice(0, COPILOT_MAX_SOURCE_CHARS) : source;

  const scopedFindings = (findings ?? []).slice(0, COPILOT_MAX_FINDINGS);
  const batch =
    scopedFindings.length > 0 &&
    (fixAll === true || isFixAllInstruction(instruction));

  const sections = [
    `Language / file type: ${language}`,
    `Instruction: ${instruction}`,
  ];

  if (batch) {
    sections.push(
      `Mode: BATCH REMEDIATION — patch every unpatched finding in this workspace (${scopedFindings.length} supplied).`,
    );
  }

  if (context?.trim()) {
    sections.push(`Finding context:\n${context.trim()}`);
  }

  if (batch) {
    sections.push(buildFindingsSection(scopedFindings));
  }

  sections.push(
    code.trim()
      ? [
          `--- CODE START ---\n${code}\n--- CODE END ---`,
          truncated
            ? `(The file was truncated to the first ${COPILOT_MAX_SOURCE_CHARS} characters.)`
            : "",
          batch
            ? "The code above is the live workspace source. Anchor every patch to the exact vulnerable lines."
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "--- CODE START ---\n(no source code supplied; answer the question only and leave updated_code empty)\n--- CODE END ---",
  );

  return [
    {
      role: "system",
      content: batch
        ? `${COPILOT_SYSTEM_PROMPT}\n\n${COPILOT_BATCH_CONTRACT}`
        : COPILOT_SYSTEM_PROMPT,
    },
    { role: "user", content: sections.join("\n\n") },
  ];
}
