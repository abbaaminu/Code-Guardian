export type VulnerabilityPatchResult =
  | { success: true; code: string; replacementLineCount: number }
  | { success: false; reason: string };

const PLACEHOLDER_TEXT =
  /\b(?:todo|fixme|placeholder|your\s+(?:code|logic|implementation)\s+here|insert\s+(?:code|logic|implementation)|automated\s+fix\s+unavailable|no\s+automated\s+(?:one[- ]line\s+)?fix)\b/i;

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function sameIgnoringWhitespace(left: string, right: string): boolean {
  return left.replace(/\s+/g, "") === right.replace(/\s+/g, "");
}

export function applyVulnerabilityPatch(
  source: string,
  vulnerableCode: string,
  fixedCode: string,
  startLine: number,
  endLine: number,
): VulnerabilityPatchResult {
  if (
    !Number.isInteger(startLine) ||
    !Number.isInteger(endLine) ||
    startLine < 1 ||
    endLine < startLine
  ) {
    return { success: false, reason: "The finding has an invalid line range." };
  }

  const vulnerable = normalizeLineEndings(vulnerableCode);
  const fixed = normalizeLineEndings(fixedCode).replace(/\n+$/, "");
  if (!vulnerable.trim() || !fixed.trim()) {
    return {
      success: false,
      reason: "The finding does not contain a usable replacement.",
    };
  }
  if (sameIgnoringWhitespace(vulnerable, fixed)) {
    return {
      success: false,
      reason: "The suggested replacement does not change the vulnerable code.",
    };
  }
  if (
    PLACEHOLDER_TEXT.test(fixed) ||
    /<(?:your|insert|placeholder)\b[^>]*>/i.test(fixed)
  ) {
    return {
      success: false,
      reason: "The suggested replacement contains placeholder text.",
    };
  }

  const sourceLines = source.split(/\r\n|\n|\r/);
  const vulnerableLines = vulnerable.split("\n");
  const fixedLines = fixed.split("\n");
  const startIndex = startLine - 1;
  const endIndex = endLine;
  if (endIndex > sourceLines.length) {
    return {
      success: false,
      reason: "The finding's line range is outside the source.",
    };
  }

  const selectedLines = sourceLines
    .slice(startIndex, endIndex)
    .map((line) => line.replace(/\r$/, ""));
  if (
    selectedLines.length !== vulnerableLines.length ||
    selectedLines.some((line, index) => line !== vulnerableLines[index])
  ) {
    return {
      success: false,
      reason:
        "The vulnerable snippet does not exactly match the displayed source at the finding's lines.",
    };
  }

  let occurrences = 0;
  for (let i = 0; i <= sourceLines.length - vulnerableLines.length; i++) {
    if (
      vulnerableLines.every(
        (line, offset) => sourceLines[i + offset].replace(/\r$/, "") === line,
      )
    ) {
      occurrences++;
      if (occurrences > 1) {
        return {
          success: false,
          reason:
            "The vulnerable snippet appears more than once, so the replacement is ambiguous.",
        };
      }
    }
  }

  const newline = source.includes("\r\n")
    ? "\r\n"
    : source.includes("\r")
      ? "\r"
      : "\n";
  const updatedLines = [
    ...sourceLines.slice(0, startIndex),
    ...fixedLines,
    ...sourceLines.slice(endIndex),
  ];
  return {
    success: true,
    code: updatedLines.join(newline),
    replacementLineCount: fixedLines.length,
  };
}
