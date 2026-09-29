// Real pull-request scanning for the GitHub webhook path.
//
// SERVER-ONLY: mints a GitHub App installation token (see app-auth.ts) and uses
// it to read repository content.
//
// WHAT ONE DELIVERY DOES
//   1. Mint a short-lived installation token for the delivering installation.
//   2. List the PR's changed files (skipping deletions and unsupported types).
//   3. Fetch each changed file's content *at the PR head SHA* and run the local
//      SAST engine over it.
//   4. Fetch the PR's unified diff, map finding lines onto diff positions, and
//      post one review with the findings as inline comments.
//
// WHY THE LOCAL ENGINE AND NOT GEMINI
// -----------------------------------
// A webhook delivery shares the same serverless time budget as any other
// request, and a PR can touch dozens of files — one model call per file would be
// both slow and unbounded in cost. The AST/heuristic engines are deterministic,
// free, and sub-millisecond per file, which is the right fit for "every push
// gets an automatic pass". AI-assisted PR review belongs on a queue-backed
// worker, not in the webhook request path.
//
// Findings that cannot be anchored to the diff (GitHub only accepts inline
// comments on lines that appear in a hunk) are counted and summarised by
// pr-comments.ts rather than dropped silently.

import { getInstallationToken } from "./app-auth";
import {
  buildPositionMap,
  postReviewComments,
  type InlineFinding,
} from "./pr-comments";
import { runLocalSAST } from "@/lib/sast-engine";

const GITHUB_API = "https://api.github.com";

// Bounded work per delivery: a webhook has to answer well inside the serverless
// timeout, and a 500-file PR must not turn one push into an unbounded crawl.
const MAX_FILES_SCANNED = 12;
const MAX_FILE_BYTES = 200_000;
const MAX_FINDINGS_POSTED = 40;

// Extensions the local engine has rules (or a real parser) for. Anything else —
// images, lockfiles, minified bundles — is skipped instead of being scanned with
// rules that can't apply to it.
const SCANNABLE_EXTENSIONS = new Set([
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "py",
  "rb",
  "go",
  "php",
  "java",
  "cs",
  "rs",
  "sol",
  "sql",
  "sh",
  "yml",
  "yaml",
  "json",
  "env",
  "tf",
]);

export interface PrScanSummary {
  filesChanged: number;
  filesScanned: number;
  filesSkipped: number;
  findings: number;
  inlineComments: number;
  summarizedOnly: number;
}

function extensionOf(path: string): string {
  const name = (path.split("/").pop() ?? path).toLowerCase();
  if (name === "dockerfile" || name.endsWith(".dockerfile"))
    return "dockerfile";
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1);
}

function isScannable(path: string): boolean {
  const ext = extensionOf(path);
  return ext === "dockerfile" || SCANNABLE_EXTENSIONS.has(ext);
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function ghFetch(
  token: string,
  url: string,
  accept = "application/vnd.github+json",
): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/**
 * Scans the head of a pull request and posts the findings as a review.
 *
 * Throws when GitHub itself fails (minting the token, listing files, fetching
 * the diff, submitting the review) so the webhook route can answer 5xx and let
 * GitHub retry the delivery. Per-file problems — unreadable content, oversized
 * blobs — are counted in the summary and skipped instead.
 */
export async function scanPullRequest(params: {
  installationId: number | string;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
}): Promise<PrScanSummary> {
  const { installationId, owner, repo, pullNumber, headSha } = params;
  const { token } = await getInstallationToken(installationId);
  const base = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const filesRes = await ghFetch(
    token,
    `${base}/pulls/${pullNumber}/files?per_page=100`,
  );
  if (!filesRes.ok) {
    throw new Error(
      `Could not list files for PR #${pullNumber} [${filesRes.status}]: ${(
        await filesRes.text()
      ).slice(0, 300)}`,
    );
  }
  const changed = (await filesRes.json()) as Array<{
    filename?: string;
    status?: string;
  }>;

  const summary: PrScanSummary = {
    filesChanged: changed.length,
    filesScanned: 0,
    filesSkipped: 0,
    findings: 0,
    inlineComments: 0,
    summarizedOnly: 0,
  };
  const findings: InlineFinding[] = [];
  let hitFindingCap = false;

  for (const file of changed) {
    if (findings.length >= MAX_FINDINGS_POSTED) {
      hitFindingCap = true;
      break;
    }
    const path = file.filename;
    if (!path || file.status === "removed" || !isScannable(path)) {
      summary.filesSkipped++;
      continue;
    }
    if (summary.filesScanned >= MAX_FILES_SCANNED) {
      summary.filesSkipped++;
      continue;
    }

    // Content at the PR head SHA — deliberately not the patch hunk. A hunk is a
    // syntactic fragment (`+` lines only, missing imports and surrounding
    // declarations), and parsing a fragment produces exactly the false positives
    // the AST engine exists to avoid.
    const contentRes = await ghFetch(
      token,
      `${base}/contents/${encodePath(path)}?ref=${encodeURIComponent(headSha)}`,
      "application/vnd.github.raw",
    );
    if (!contentRes.ok) {
      summary.filesSkipped++;
      continue;
    }
    const content = await contentRes.text();
    if (content.length === 0 || content.length > MAX_FILE_BYTES) {
      summary.filesSkipped++;
      continue;
    }

    summary.filesScanned++;
    const local = await runLocalSAST(content, extensionOf(path));
    for (const vuln of local) {
      if (findings.length >= MAX_FINDINGS_POSTED) break;
      findings.push({
        filePath: path,
        line: vuln.line_start,
        severity: vuln.severity,
        title: vuln.title,
        cweId: vuln.cwe_id || null,
        remediation: vuln.remediation_steps,
      });
    }
  }

  if (hitFindingCap) {
    // Files we stopped before looking at are "skipped", not silently ignored —
    // the summary has to add up so a capped scan is visibly a capped scan.
    summary.filesSkipped +=
      changed.length - summary.filesScanned - summary.filesSkipped;
  }

  summary.findings = findings.length;
  if (findings.length === 0) return summary;

  // GitHub positions review comments relative to the hunk text, so the unified
  // diff has to be fetched and parsed into a new-file line => position map.
  const diffRes = await ghFetch(
    token,
    `${base}/pulls/${pullNumber}`,
    "application/vnd.github.v3.diff",
  );
  if (!diffRes.ok) {
    throw new Error(
      `Could not fetch the diff for PR #${pullNumber} [${diffRes.status}]`,
    );
  }
  const positionMap = buildPositionMap(await diffRes.text());

  const { posted, skipped } = await postReviewComments({
    installationToken: token,
    owner,
    repo,
    pullNumber,
    commitSha: headSha,
    findings,
    positionMap,
  });

  summary.inlineComments = posted;
  summary.summarizedOnly = skipped;
  return summary;
}
