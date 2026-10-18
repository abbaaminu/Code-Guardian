import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isSafeRepoPath } from "@/lib/agent-safety";
import { applyVulnerabilityPatch } from "@/lib/scan-patch";

const RepositoryPatchInput = z.object({
  scanId: z.string().uuid(),
  owner: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/),
});

const CreateRemediationPullRequestInput = RepositoryPatchInput.extend({
  vulnerabilityIds: z.array(z.string().uuid()).min(1).max(100),
});

function describeOctokitError(error: unknown, action: string): Error {
  if (!(error instanceof Error)) {
    return new Error(`${action} failed due to an unexpected GitHub error.`);
  }

  const details = error as Error & {
    status?: number;
    response?: {
      status?: number;
      headers?: Record<string, string>;
    };
  };
  const status = details.response?.status ?? details.status;
  const headers = new Headers(details.response?.headers);
  if (
    status === 429 ||
    (status === 403 &&
      (headers.get("x-ratelimit-remaining") === "0" ||
        /rate limit/i.test(error.message)))
  ) {
    return new Error(
      `GitHub API rate limit reached while ${action.toLowerCase()}.${headers.get("retry-after") ? ` Retry after ${headers.get("retry-after")} seconds.` : ""}`,
    );
  }
  if (status === 401) {
    return new Error(
      `GitHub App authentication failed while ${action.toLowerCase()}. Reauthorize the App installation and try again.`,
    );
  }
  return new Error(
    `${action} failed${typeof status === "number" ? ` (HTTP ${status})` : ""}: ${error.message}`,
  );
}

export const authorizeGithubRepository = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: unknown) => RepositoryPatchInput.parse(input))
  .handler(async ({ data, context }) => {
    const { authorizeGitHubRepository } =
      await import("./repository-authorization.server");
    await authorizeGitHubRepository(
      context.userId,
      data.scanId,
      data.owner,
      data.repo,
    );
    return { authorized: true };
  });

export const createRemediationPullRequest = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: unknown) => CreateRemediationPullRequestInput.parse(input))
  .handler(async ({ data, context }) => {
    const vulnerabilityIds = [...new Set(data.vulnerabilityIds)];
    if (vulnerabilityIds.length !== data.vulnerabilityIds.length) {
      throw new Error("The remediation list contains duplicate findings.");
    }

    const { getAuthorizedInstallation } =
      await import("./repository-authorization.server");
    const installationId = await getAuthorizedInstallation(
      context.userId,
      data.scanId,
      data.owner,
      data.repo,
    );
    const { getInstallationToken, hasRepositoryWritePermissions } =
      await import("./app-auth");
    const installationToken = await getInstallationToken(installationId, [
      `${data.owner}/${data.repo}`,
    ]);
    if (!hasRepositoryWritePermissions(installationToken.permissions)) {
      throw new Response(
        "Forbidden: the GitHub App installation no longer has Contents and Pull requests write permissions.",
        { status: 403 },
      );
    }

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const { data: findings, error: findingsError } = await supabaseAdmin
      .from("vulnerabilities")
      .select(
        "id, title, vulnerable_code_block, fixed_code_block, file_path, line_start, line_end",
      )
      .eq("scan_id", data.scanId)
      .in("id", vulnerabilityIds);
    if (findingsError) {
      throw new Error(
        `Could not load remediation findings: ${findingsError.message}`,
      );
    }
    if (!findings || findings.length !== vulnerabilityIds.length) {
      throw new Error(
        "One or more selected findings do not belong to this scan.",
      );
    }

    const fileGroups = new Map<string, typeof findings>();
    for (const finding of findings) {
      if (!finding.file_path || !isSafeRepoPath(finding.file_path)) {
        throw new Error(
          `Finding "${finding.title}" does not have a safe repository file path.`,
        );
      }
      const group = fileGroups.get(finding.file_path) ?? [];
      group.push(finding);
      fileGroups.set(finding.file_path, group);
    }

    const { Octokit } = await import("@octokit/rest");
    const octokit = new Octokit({
      auth: installationToken.token,
      userAgent: "SecurePulse-Remediation",
    });

    let repository: Awaited<ReturnType<typeof octokit.repos.get>>;
    try {
      repository = await octokit.repos.get({
        owner: data.owner,
        repo: data.repo,
      });
    } catch (error) {
      throw describeOctokitError(error, "Reading the target repository");
    }
    const baseBranch = repository.data.default_branch;
    if (!baseBranch) {
      throw new Error("GitHub did not return the repository's default branch.");
    }

    let baseRef: Awaited<ReturnType<typeof octokit.git.getRef>>;
    try {
      baseRef = await octokit.git.getRef({
        owner: data.owner,
        repo: data.repo,
        ref: `heads/${baseBranch}`,
      });
    } catch (error) {
      throw describeOctokitError(
        error,
        "Reading the repository's default branch",
      );
    }

    const updates: Array<{
      path: string;
      sha: string;
      code: string;
      titles: string[];
    }> = [];
    for (const [path, pathFindings] of fileGroups) {
      let file: Awaited<ReturnType<typeof octokit.repos.getContent>>;
      try {
        file = await octokit.repos.getContent({
          owner: data.owner,
          repo: data.repo,
          path,
          ref: baseBranch,
        });
      } catch (error) {
        throw describeOctokitError(error, `Reading '${path}' from GitHub`);
      }

      const entry = file.data;
      if (
        Array.isArray(entry) ||
        entry.type !== "file" ||
        entry.encoding !== "base64" ||
        typeof entry.content !== "string" ||
        typeof entry.sha !== "string"
      ) {
        throw new Error(`'${path}' is not a writable text file.`);
      }

      let code = Buffer.from(
        entry.content.replace(/\s/g, ""),
        "base64",
      ).toString("utf8");
      const sortedFindings = [...pathFindings].sort(
        (left, right) => (left.line_start ?? 0) - (right.line_start ?? 0),
      );
      for (const finding of sortedFindings) {
        const patch = applyVulnerabilityPatch(
          code,
          finding.vulnerable_code_block,
          finding.fixed_code_block,
          finding.line_start ?? 1,
          finding.line_end ?? finding.line_start ?? 1,
        );
        if (!patch.success) {
          throw new Error(
            `Could not apply "${finding.title}" in '${path}': ${patch.reason}`,
          );
        }
        code = patch.code;
      }
      updates.push({
        path,
        sha: entry.sha,
        code,
        titles: sortedFindings.map((finding) => finding.title),
      });
    }

    const branchName = `security-remediation-${Date.now()}-${randomBytes(4).toString("hex")}`;
    try {
      await octokit.git.createRef({
        owner: data.owner,
        repo: data.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha,
      });
    } catch (error) {
      throw describeOctokitError(error, "Creating the remediation branch");
    }

    const cleanupBranch = async () => {
      try {
        await octokit.git.deleteRef({
          owner: data.owner,
          repo: data.repo,
          ref: `heads/${branchName}`,
        });
      } catch (error) {
        console.error(
          `[GitHub remediation] Could not clean up branch '${branchName}':`,
          error,
        );
      }
    };

    let committingPath = "";
    try {
      for (const update of updates) {
        committingPath = update.path;
        await octokit.repos.createOrUpdateFileContents({
          owner: data.owner,
          repo: data.repo,
          path: update.path,
          message: `fix: apply security remediations in ${update.path}`,
          content: Buffer.from(update.code, "utf8").toString("base64"),
          sha: update.sha,
          branch: branchName,
        });
      }
    } catch (error) {
      await cleanupBranch();
      throw describeOctokitError(error, `Committing '${committingPath}'`);
    }

    let pullRequest: Awaited<ReturnType<typeof octokit.pulls.create>>;
    try {
      pullRequest = await octokit.pulls.create({
        owner: data.owner,
        repo: data.repo,
        title: `Security remediation: ${data.repo}`,
        body: [
          "This pull request contains the selected AI-assisted security remediations.",
          "",
          "Review the changes carefully before merging.",
          "",
          ...updates.flatMap((update) => [
            `### \`${update.path}\``,
            ...update.titles.map((title) => `- ${title}`),
            "",
          ]),
          "Created by SecurePulse.",
        ].join("\n"),
        head: branchName,
        base: baseBranch,
      });
    } catch (error) {
      await cleanupBranch();
      throw describeOctokitError(
        error,
        "Creating the remediation pull request",
      );
    }

    return {
      branchName,
      files: updates.map((update) => update.path),
      vulnerabilityIds,
      pullRequestUrl: pullRequest.data.html_url,
      pullRequestNumber: pullRequest.data.number,
    };
  });
