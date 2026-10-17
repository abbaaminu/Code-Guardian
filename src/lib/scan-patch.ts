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

function trimBlankBoundaryLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start++;
  while (end > start && !lines[end - 1].trim()) end--;
  return lines.slice(start, end);
}

function commonIndent(lines: string[]): string {
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^[\t ]*/)?.[0] ?? "");
  if (indents.length === 0) return "";

  return indents.reduce((common, indent) => {
    let length = 0;
    while (
      length < common.length &&
      length < indent.length &&
      common[length] === indent[length]
    ) {
      length++;
    }
    return common.slice(0, length);
  });
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
  const fixed = normalizeLineEndings(fixedCode);
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

  const normalizedSource = normalizeLineEndings(source);
  const sourceLines = normalizedSource.split("\n");
  const vulnerableLines = trimBlankBoundaryLines(vulnerable.split("\n"));
  const fixedLines = trimBlankBoundaryLines(fixed.split("\n"));
  const startIndex = startLine - 1;

  const matchesAt = (index: number) =>
    vulnerableLines.every((line, offset) => {
      const sourceLine = sourceLines[index + offset];
      return (
        sourceLine !== undefined && sameIgnoringWhitespace(sourceLine, line)
      );
    });

  const candidates: number[] = [];
  const window = 20;
  const first = Math.max(0, startIndex - window);
  const last = Math.min(
    sourceLines.length - vulnerableLines.length,
    startIndex + window,
  );
  for (let index = first; index <= last; index++) {
    if (matchesAt(index)) candidates.push(index);
  }
  if (candidates.length === 0) {
    for (
      let index = 0;
      index <= sourceLines.length - vulnerableLines.length;
      index++
    ) {
      if (matchesAt(index)) candidates.push(index);
    }
  }

  if (candidates.length === 0) {
    return {
      success: false,
      reason:
        "The vulnerable snippet could not be matched in the displayed source near the finding's lines.",
    };
  }

  if (candidates.length > 1) {
    return {
      success: false,
      reason:
        "The vulnerable snippet appears more than once near the finding, so the replacement is ambiguous.",
    };
  }

  const matchIndex = candidates[0];
  const matchEndIndex = matchIndex + vulnerableLines.length;
  const selectedLines = sourceLines.slice(matchIndex, matchEndIndex);
  const targetIndent = commonIndent(selectedLines);
  const replacementIndent = commonIndent(fixedLines);
  const adjustedFixedLines = fixedLines.map((line) => {
    if (!line.trim()) return line;
    const withoutIndent = line.startsWith(replacementIndent)
      ? line.slice(replacementIndent.length)
      : line.trimStart();
    return targetIndent + withoutIndent;
  });
  const hadTrailingNewline = normalizedSource.endsWith("\n");
  const updatedLines = [
    ...sourceLines.slice(0, matchIndex),
    ...adjustedFixedLines,
    ...sourceLines.slice(matchEndIndex),
  ];
  if (!hadTrailingNewline && updatedLines.at(-1) === "") updatedLines.pop();
  const newline = source.includes("\r\n")
    ? "\r\n"
    : source.includes("\r")
      ? "\r"
      : "\n";
  return {
    success: true,
    code: updatedLines.join(newline),
    replacementLineCount: adjustedFixedLines.length,
  };
}
