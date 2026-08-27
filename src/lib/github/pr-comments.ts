// Posts findings as inline comments on a pull request diff, using the GitHub
// "Create a review" API (one review, many line comments — far less noisy than
// one notification per comment). Roadmap item: "PR Inline Comments... using
// src/lib/diff.ts".
//
// diff.ts currently does a two-sided LCS diff between a vulnerable/fixed code
// pair for the in-app side-by-side view. For PR review comments we need the
// *unified* diff GitHub gives us (old file vs. new file on this PR) to map a
// finding's line number in the new file to a valid comment anchor — GitHub
// only accepts comments on lines that appear in the diff hunk, not arbitrary
// file lines. buildPositionMap below parses that unified diff format; it does
// not reuse diffLines() from diff.ts (that function compares two arbitrary
// strings, not a unified-diff hunk header), but it's a natural companion to it
// and lives alongside the other PR-integration code.

export interface InlineFinding {
  filePath: string;
  line: number;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  cweId: string | null;
  remediation: string;
}

const SEVERITY_EMOJI: Record<InlineFinding["severity"], string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

// Parses a unified diff (as returned by GitHub's `.diff` media type or the
// compare API) into, per file, a map of new-file line number -> diff "position"
// (the value the Review Comments API requires instead of a raw line number).
export function buildPositionMap(
  unifiedDiff: string,
): Map<string, Map<number, number>> {
  const byFile = new Map<string, Map<number, number>>();
  let currentFile: string | null = null;
  let position = -1; // position is 0-indexed *within a file's hunks*, resets per file
  let newLine = 0;

  for (const rawLine of unifiedDiff.split("\n")) {
    if (rawLine.startsWith("diff --git")) {
      position = -1;
      continue;
    }
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice(6).trim();
      byFile.set(currentFile, new Map());
      continue;
    }
    if (rawLine.startsWith("@@")) {
      position++;
      const match = /@@ -\d+(?:,\d+)? \+(\d+)/.exec(rawLine);
      newLine = match ? parseInt(match[1], 10) : 0;
      continue;
    }
    if (currentFile === null) continue;

    if (rawLine.startsWith("+")) {
      position++;
      byFile.get(currentFile)!.set(newLine, position);
      newLine++;
    } else if (rawLine.startsWith("-")) {
      position++;
      // deleted line — no corresponding new-file line number to anchor on
    } else if (rawLine.startsWith(" ")) {
      position++;
      byFile.get(currentFile)!.set(newLine, position);
      newLine++;
    }
    // lines starting with "\" (e.g. "No newline at end of file") don't advance
  }

  return byFile;
}

export function formatFindingBody(f: InlineFinding): string {
  const cwe = f.cweId
    ? ` · [${f.cweId}](https://cwe.mitre.org/data/definitions/${f.cweId.replace(/^CWE-?/i, "")}.html)`
    : "";
  return `${SEVERITY_EMOJI[f.severity]} **${f.title}**${cwe}\n\n${f.remediation}\n\n<sub>Posted by SecurePulse</sub>`;
}

// Submits one review containing all inline comments that could be anchored to
// the diff, plus a summary body noting any findings that couldn't be (e.g. a
// finding on an unchanged line outside the diff context window).
export async function postReviewComments(params: {
  installationToken: string;
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  findings: InlineFinding[];
  positionMap: Map<string, Map<number, number>>;
}): Promise<{ posted: number; skipped: number }> {
  const {
    installationToken,
    owner,
    repo,
    pullNumber,
    commitSha,
    findings,
    positionMap,
  } = params;

  const comments: Array<{ path: string; position: number; body: string }> = [];
  let skipped = 0;

  for (const f of findings) {
    const position = positionMap.get(f.filePath)?.get(f.line);
    if (position === undefined) {
      skipped++;
      continue;
    }
    comments.push({ path: f.filePath, position, body: formatFindingBody(f) });
  }

  if (comments.length === 0) {
    return { posted: 0, skipped };
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${installationToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        commit_id: commitSha,
        event: "COMMENT",
        body: `SecurePulse found ${findings.length} issue(s) in this PR (${comments.length} anchored inline, ${skipped} summarized only).`,
        comments,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to post PR review [${res.status}]: ${body.slice(0, 300)}`,
    );
  }

  return { posted: comments.length, skipped };
}
