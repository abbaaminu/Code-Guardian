import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyVulnerabilityPatch } from "@/lib/scan-patch";
import { isSafeRepoPath } from "@/lib/agent-safety";

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

const PatchGithubFileInput = RepositoryPatchInput.extend({
  filePath: z.string().min(1).max(512).refine(isSafeRepoPath),
  vulnerableCode: z.string().min(1).max(4000),
  fixedCode: z.string().min(1).max(4000),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
});

interface GitHubContentResponse {
  type?: string;
  sha?: string;
  content?: string;
  encoding?: string;
}

interface GitHubErrorResponse {
  message?: string;
}

async function githubError(response: Response): Promise<string> {
  let message = `GitHub API request failed (HTTP ${response.status}).`;
  try {
    const body = (await response.json()) as GitHubErrorResponse;
    if (body.message) message = `GitHub: ${body.message}`;
  } catch {
    // Keep the HTTP status if GitHub did not return a JSON error body.
  }
  return message;
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

export const patchGithubFile = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: unknown) => PatchGithubFileInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.endLine < data.startLine) {
      throw new Error("The finding has an invalid line range.");
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
    const token = installationToken.token;

    const baseUrl =
      `https://api.github.com/repos/${encodeURIComponent(data.owner)}/` +
      `${encodeURIComponent(data.repo)}/contents/` +
      data.filePath.split("/").map(encodeURIComponent).join("/");
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const repoUrl =
      `https://api.github.com/repos/${encodeURIComponent(data.owner)}/` +
      encodeURIComponent(data.repo);
    const mainRefResponse = await fetch(`${repoUrl}/git/ref/heads/main`, {
      headers,
    });
    if (!mainRefResponse.ok) {
      throw new Error(
        `Could not read the repository's main branch: ${await githubError(mainRefResponse)}`,
      );
    }
    const mainRef = (await mainRefResponse.json()) as {
      object?: { sha?: string };
    };
    if (!mainRef.object?.sha) {
      throw new Error("GitHub did not return the main branch commit SHA.");
    }

    const currentResponse = await fetch(
      `${baseUrl}?ref=${encodeURIComponent(mainRef.object.sha)}`,
      { headers },
    );
    if (currentResponse.status === 404) {
      throw new Error(
        `Could not find '${data.filePath}' on the repository's main branch.`,
      );
    }
    if (!currentResponse.ok) {
      throw new Error(
        `Could not read the current GitHub file (HTTP ${currentResponse.status}).`,
      );
    }

    const current = (await currentResponse.json()) as GitHubContentResponse;
    if (
      current.type !== "file" ||
      current.encoding !== "base64" ||
      !current.content ||
      !current.sha
    ) {
      throw new Error("GitHub did not return a writable text file and SHA.");
    }

    const source = Buffer.from(
      current.content.replace(/\s/g, ""),
      "base64",
    ).toString("utf8");
    const patch = applyVulnerabilityPatch(
      source,
      data.vulnerableCode,
      data.fixedCode,
      data.startLine,
      data.endLine,
    );
    if (!patch.success) throw new Error(patch.reason);

    const branchName = `security-patch-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const branchResponse = await fetch(`${repoUrl}/git/refs`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: mainRef.object.sha,
      }),
    });
    if (!branchResponse.ok) {
      throw new Error(
        `Could not create a security fix branch: ${await githubError(branchResponse)}`,
      );
    }

    const commitResponse = await fetch(baseUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `fix: remediate vulnerability in ${data.filePath}`,
        content: Buffer.from(patch.code, "utf8").toString("base64"),
        sha: current.sha,
        branch: branchName,
      }),
    });
    if (commitResponse.status === 409 || commitResponse.status === 422) {
      throw new Error(
        `GitHub rejected the branch commit: ${await githubError(commitResponse)}`,
      );
    }
    if (!commitResponse.ok) {
      throw new Error(
        `Could not commit the patch to the security fix branch: ${await githubError(commitResponse)}`,
      );
    }

    const pullRequestResponse = await fetch(`${repoUrl}/pulls`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Security fix: remediate ${data.filePath}`,
        body:
          `This pull request applies an automated security remediation to ` +
          `\`${data.filePath}\`.\n\nPlease review the changes before merging.`,
        head: branchName,
        base: "main",
      }),
    });
    if (!pullRequestResponse.ok) {
      throw new Error(
        `The patch was committed to '${branchName}', but GitHub could not open the pull request: ${await githubError(pullRequestResponse)}`,
      );
    }
    const pullRequest = (await pullRequestResponse.json()) as {
      html_url?: string;
      number?: number;
    };
    return {
      path: data.filePath,
      branchName,
      pullRequestUrl: pullRequest.html_url ?? null,
      pullRequestNumber: pullRequest.number ?? null,
      replacementLineCount: patch.replacementLineCount,
    };
  });
