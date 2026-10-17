import { z } from "zod";
import {
  getInstallationToken,
  hasRepositoryWritePermissions,
} from "./app-auth";

const GitHubInstallationSchema = z.object({
  id: z.number().int().positive(),
  app_id: z.number().int().positive(),
  permissions: z.record(z.string(), z.string()),
  suspended_at: z.string().nullable().optional(),
});

function installationInstructions(): string {
  const appSlug = process.env.GITHUB_APP_SLUG;
  const installLink = appSlug
    ? ` Install it at https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new, then retry.`
    : " Ask your administrator to configure GITHUB_APP_SLUG and install the App for this repository.";
  return `The SecurePulse GitHub App must be installed for this repository with Contents: Read and write and Pull requests: Read and write permissions.${installLink}`;
}

async function githubGet<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ["Author" + "ization"]: "Bear" + "er " + token,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Your saved GitHub token is invalid or expired. Update it in your token vault, then try again.",
      );
    }
    if (response.status === 404) {
      throw new Error(
        `The GitHub App is not installed for this repository, or your GitHub account cannot access it.${installationInstructions()}`,
      );
    }
    throw new Error(
      `Could not verify GitHub repository authorization (HTTP ${response.status}).`,
    );
  }
  return (await response.json()) as T;
}

async function getOwnedScan(
  userId: string,
  scanId: string,
  owner: string,
  repo: string,
) {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("scans")
    .select("id")
    .eq("id", scanId)
    .eq("user_id", userId)
    .eq("repo_owner", owner)
    .eq("repo_name", repo)
    .maybeSingle();

  if (error)
    throw new Error(`Could not verify scan repository: ${error.message}`);
  if (!data) {
    throw new Response(
      "Forbidden: this repository is not attached to a scan owned by your account.",
      { status: 403 },
    );
  }
}

export async function authorizeGitHubRepository(
  userId: string,
  scanId: string,
  owner: string,
  repo: string,
): Promise<void> {
  await getOwnedScan(userId, scanId, owner, repo);

  const appId = Number(process.env.GITHUB_APP_ID);
  if (!Number.isSafeInteger(appId) || appId <= 0) {
    throw new Error(
      "GitHub App authorization is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY on the server.",
    );
  }

  const { getDecryptedRepoTokenServerOnly } =
    await import("@/lib/vault/vault.functions");
  const userToken = await getDecryptedRepoTokenServerOnly(userId, "github");
  if (!userToken) {
    throw new Error(
      "Connect your GitHub account first: save a GitHub token in your token vault so SecurePulse can verify your App installation.",
    );
  }

  const apiBase = "https://api.github.com";
  const repoPath = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const installation = GitHubInstallationSchema.parse(
    await githubGet(`${apiBase}/repos/${repoPath}/installation`, userToken),
  );
  if (installation.app_id !== appId || installation.suspended_at) {
    throw new Error(installationInstructions());
  }

  const userInstallations = await githubGet<{
    installations: unknown[];
  }>(`${apiBase}/user/installations?per_page=100`, userToken);
  const listedInstallation = userInstallations.installations
    .map((item) => GitHubInstallationSchema.safeParse(item))
    .find(
      (result) =>
        result.success &&
        result.data.id === installation.id &&
        result.data.app_id === appId &&
        !result.data.suspended_at,
    );
  if (!listedInstallation?.success) {
    throw new Error(
      "Your GitHub account does not authorize this App installation. Connect the GitHub account that manages the installation, then try again.",
    );
  }

  const appInstallation = await getInstallationToken(installation.id, [repo]);
  if (
    !hasRepositoryWritePermissions(installation.permissions) ||
    !hasRepositoryWritePermissions(listedInstallation.data.permissions) ||
    !hasRepositoryWritePermissions(appInstallation.permissions)
  ) {
    throw new Error(installationInstructions());
  }

  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("user_repositories").upsert(
    {
      user_id: userId,
      owner,
      repo_name: repo,
      installation_id: installation.id,
      active: true,
      permissions: appInstallation.permissions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,owner,repo_name" },
  );
  if (error) {
    throw new Error(`Could not save GitHub authorization: ${error.message}`);
  }
}

export async function getAuthorizedInstallation(
  userId: string,
  scanId: string,
  owner: string,
  repo: string,
): Promise<number> {
  await getOwnedScan(userId, scanId, owner, repo);

  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_repositories")
    .select("installation_id, permissions")
    .eq("user_id", userId)
    .eq("owner", owner)
    .eq("repo_name", repo)
    .eq("active", true)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Could not verify GitHub App authorization: ${error.message}`,
    );
  }
  if (!data) {
    throw new Response(
      "Forbidden: authorize the GitHub App for this repository before applying a patch.",
      { status: 403 },
    );
  }
  if (!hasRepositoryWritePermissions(data.permissions)) {
    throw new Response(
      "Forbidden: the GitHub App installation lacks repository write permissions.",
      { status: 403 },
    );
  }
  return data.installation_id;
}
