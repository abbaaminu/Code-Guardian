import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { aiApiRateLimiter } from "@/lib/rate-limiter";
import { requestDeepSeekChat, resolveDeepSeekModel } from "@/lib/deepseek";
import {
  validateAgentEdits,
  type SafeAgentEdit,
  type AgentFileAction,
} from "@/lib/agent-safety";

// ==========================================
// 1. TYPE DEFINITIONS & SCHEMAS
// ==========================================

export interface AgentPlan {
  pr_title: string;
  pr_body: string;
  branch_name: string;
  edits: SafeAgentEdit[];
}

export interface AgentTaskResult {
  success: boolean;
  prUrl: string | null;
  branchName: string | null;
  prNumber: number | null;
  operations: Array<{ path: string; action: AgentFileAction }>;
  summary: string;
}

/**
 * Client input contract for the autonomous agent. Strict on purpose: `owner`,
 * `repo`, and `branch` are interpolated into GitHub API URLs server-side, so
 * they must be identifier-shaped, and the client must NEVER send a GitHub token
 * or a Supabase client — both are resolved server-side.
 */
const AgentTaskInputSchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(39)
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
      "Invalid GitHub owner name",
    ),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
      "Invalid GitHub repository name",
    ),
  branch: z
    .string()
    .max(200)
    .regex(/^[a-zA-Z0-9._/-]+$/, "Invalid branch name")
    .refine(
      (b) => !b.includes("..") && !b.includes("//"),
      "Invalid branch name",
    )
    .default("main"),
  instruction: z.string().min(1).max(4000),
});

// Helper to generate GitHub API authorization headers
function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getUserGithubToken(userId: string): Promise<string | null> {
  const { getDecryptedRepoTokenServerOnly } =
    await import("@/lib/vault/vault.functions");
  return getDecryptedRepoTokenServerOnly(userId, "github");
}

// ==========================================
// 2. GITHUB SOURCE CONTEXT
// ==========================================

/**
 * Loads a bounded set of source files from the caller's selected GitHub repo.
 */
export async function retrieveRepoContext(
  owner: string,
  repo: string,
  branch: string,
  token: string,
): Promise<Array<{ file_path: string; content: string }>> {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers },
  );
  if (!treeResponse.ok) {
    throw new Error(
      `Could not read repository file tree (HTTP ${treeResponse.status}).`,
    );
  }
  const tree = (await treeResponse.json()) as {
    tree?: Array<{ path?: string; type?: string; size?: number }>;
  };
  const supportedExtensions = new Set([
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "rb",
    "go",
    "php",
    "java",
    "kt",
    "cs",
    "sol",
    "rs",
    "c",
    "cpp",
    "h",
    "sql",
    "yml",
    "yaml",
    "json",
    "sh",
  ]);
  const files = (tree.tree ?? [])
    .filter((file) => {
      const filePath = file.path ?? "";
      const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
      return (
        file.type === "blob" &&
        typeof file.size === "number" &&
        file.size < 50_000 &&
        supportedExtensions.has(extension) &&
        !/(^|\/)(node_modules|dist|build|\.git)(\/|$)/i.test(filePath) &&
        !/(^|\/)\.env(?:\.|$)/i.test(filePath) &&
        !filePath.endsWith(".lock")
      );
    })
    .slice(0, 6);

  const contextFiles: Array<{
    file_path: string;
    content: string;
  }> = [];
  for (const file of files) {
    const filePath = file.path!;
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath
      .split("/")
      .map(encodeURIComponent)
      .join("/")}?ref=${encodeURIComponent(branch)}`;
    const response = await fetch(fileUrl, {
      headers: {
        ...headers,
        Accept: "application/vnd.github.raw+json",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Could not read repository file '${filePath}' (HTTP ${response.status}).`,
      );
    }
    contextFiles.push({
      file_path: filePath,
      content: (await response.text()).slice(0, 8000),
    });
  }
  return contextFiles;
}

// ==========================================
// 3. AI REMEDIATION PLANNER
// ==========================================

/**
 * Uses DeepSeek to analyze repository files and generate multi-file remediation code.
 */
async function generateRemediationPlan(
  instruction: string,
  contextFiles: Array<{ file_path: string; content: string }>,
  apiKey: string,
): Promise<AgentPlan> {
  const model = resolveDeepSeekModel();

  const contextPrompt = contextFiles
    .map((f) => `--- FILE: ${f.file_path} ---\n${f.content}\n--- END FILE ---`)
    .join("\n\n");

  const systemPrompt = `You are SecurePulse Autonomous Agent, an expert code security remediator.
You are given a target instruction and source code files fetched directly from the target repository.

STRICT OUTPUT CONTRACT:
Return ONLY a valid JSON object matching this exact schema:
{
  "pr_title": "Short, professional title for the Pull Request",
  "pr_body": "Detailed markdown explanation of security fixes applied",
  "branch_name": "securepulse/fix-descriptive-name",
  "edits": [
    {
      "file_path": "exact/path/to/file.ts",
      "new_content": "The complete updated file content ready to be committed",
      "action": "update"
    }
  ]
}
The "action" field MUST be one of: "update" | "create" | "delete".
Do NOT wrap the response in markdown code blocks (\`\`\`). Return JSON text only.`;

  const userMessage = `INSTRUCTION: ${instruction}\n\nRETRIEVED REPOSITORY CONTEXT:\n${contextPrompt || "No context files found. Generate standalone structural fixes if possible."}`;

  const content = await requestDeepSeekChat(
    apiKey,
    model,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    0.1,
  );

  try {
    const parsed = JSON.parse(content) as AgentPlan;
    return {
      pr_title:
        parsed.pr_title ||
        "SecurePulse: Automated Security & Code Integrity Fixes",
      pr_body:
        parsed.pr_body ||
        "Automated remediation generated by SecurePulse Agent.",
      branch_name: (
        parsed.branch_name || `securepulse/remediation-${Date.now()}`
      ).replace(/[^a-zA-Z0-9/-]/g, "-"),
      edits: Array.isArray(parsed.edits) ? parsed.edits : [],
    };
  } catch {
    throw new Error("Failed to parse remediation plan from AI output.");
  }
}

// ==========================================
// 4. PRE-FLIGHT VALIDATION WORKFLOW DISPATCH
// ==========================================

/**
 * Triggers the hidden GitHub Actions workflow (securepulse-validate.yml) on the new branch.
 */
export async function triggerValidationWorkflow(
  owner: string,
  repo: string,
  branch: string,
  token: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/securepulse-validate.yml/dispatches`,
      {
        method: "POST",
        headers: ghHeaders(token),
        body: JSON.stringify({
          ref: branch,
          inputs: { purpose: "agent-dry-run" },
        }),
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(
        `Validation workflow trigger notice: (${res.status}) ${errorText}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Could not dispatch validation workflow:", error);
    return false;
  }
}

// ==========================================
// 5. MAIN AGENT ORCHESTRATOR (server function)
// ==========================================

/**
 * Executes the autonomous agent: retrieves context, plans edits, validates every
 * edit for repo safety, commits via the Git Trees API, triggers dry-run
 * validation, and opens a Pull Request.
 *
 * Security posture:
 *  - Requires a signed-in Supabase user (middleware) — the agent mutates real
 *    repos, so this is not an anonymous endpoint.
 *  - Repository writes require the caller's own encrypted vault token; the
 *    deployment-wide GITHUB_TOKEN is never used for caller-selected repositories.
 *  - Every AI-proposed edit passes `validateAgentEdits` before any blob/tree/ref
 *    is created (H1).
 *  - DeepSeek calls are per-user rate limited alongside runScan and the copilot
 *    stream route (H4).
 */
export const runAgentTask = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: unknown) => AgentTaskInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const githubToken = await getUserGithubToken(context.userId);
    if (!githubToken) {
      throw new Error(
        "A personal GitHub token is required to create a branch or pull request. Save one in your token vault; the deployment GITHUB_TOKEN is not used for repository writes.",
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Agent AI is temporarily unconfigured. Set DEEPSEEK_API_KEY in the server environment.",
      );
    }

    // Per-user rate limit: this task makes paid DeepSeek calls.
    if (!aiApiRateLimiter.tryTake(context.userId)) {
      throw new Error(
        "Rate limit reached — please wait a moment before running another agent task.",
      );
    }

    // Step 1: Read bounded source context directly from the selected repository.
    const contextFiles = await retrieveRepoContext(
      data.owner,
      data.repo,
      data.branch || "main",
      githubToken,
    );

    // Step 2: Generate the remediation plan and multi-file code modifications
    const plan = await generateRemediationPlan(
      data.instruction,
      contextFiles,
      apiKey,
    );

    // Step 3 (SECURITY, H1): validate every AI-proposed edit before touching the
    // repository. Rejected edits are logged and dropped; the valid subset is the
    // only thing that ever reaches the GitHub API.
    const { edits, rejected } = validateAgentEdits(plan.edits);
    if (rejected.length > 0) {
      console.warn(
        `[agent] rejected ${rejected.length} unsafe edit(s):`,
        rejected.map((r) => `${r.path}: ${r.reason}`),
      );
    }

    if (edits.length === 0) {
      return {
        success: false,
        prUrl: null,
        branchName: null,
        prNumber: null,
        operations: [],
        summary:
          rejected.length > 0
            ? `The agent's proposed changes were rejected (${rejected.length} unsafe edit(s)). Nothing was modified.`
            : "AI Agent could not identify actionable file modifications for the given instruction.",
      };
    }

    const baseBranch = data.branch || "main";
    const baseUrl = `https://api.github.com/repos/${data.owner}/${data.repo}`;
    const headers = ghHeaders(githubToken);

    // Step 4: Get latest commit SHA of the target branch
    const refRes = await fetch(`${baseUrl}/git/ref/heads/${baseBranch}`, {
      headers,
    });
    if (!refRes.ok)
      throw new Error(`Could not find branch '${baseBranch}' on repository.`);
    const refData = (await refRes.json()) as { object?: { sha?: string } };
    const baseCommitSha = refData.object?.sha;
    if (!baseCommitSha)
      throw new Error("Could not resolve commit SHA from branch reference.");

    // Step 5: Get tree SHA of the base commit
    const commitRes = await fetch(`${baseUrl}/git/commits/${baseCommitSha}`, {
      headers,
    });
    if (!commitRes.ok) throw new Error("Could not fetch base commit details.");
    const commitData = (await commitRes.json()) as { tree?: { sha?: string } };
    const baseTreeSha = commitData.tree?.sha;

    // Step 6: Create Git Blobs for all modified files. Deletes are represented
    // as tree entries with a null SHA (the documented GitHub Trees API behavior).
    const treeItems: Array<{
      path: string;
      mode: string;
      type: string;
      sha: string | null;
    }> = [];

    for (const edit of edits) {
      if (edit.action === "delete") {
        treeItems.push({
          path: edit.file_path,
          mode: "100644",
          type: "blob",
          sha: null,
        });
        continue;
      }

      const blobRes = await fetch(`${baseUrl}/git/blobs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: edit.new_content, encoding: "utf-8" }),
      });

      if (!blobRes.ok)
        throw new Error(`Failed to create blob for file: ${edit.file_path}`);
      const blobData = (await blobRes.json()) as { sha?: string };

      if (blobData.sha) {
        treeItems.push({
          path: edit.file_path,
          mode: "100644", // Normal file mode
          type: "blob",
          sha: blobData.sha,
        });
      }
    }

    // Step 7: Create a new Git Tree combining the old tree and new blobs
    const newTreeRes = await fetch(`${baseUrl}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });
    if (!newTreeRes.ok) throw new Error("Failed to create new Git tree.");
    const newTreeData = (await newTreeRes.json()) as { sha?: string };
    const newTreeSha = newTreeData.sha;

    // Step 8: Create a new Commit pointing to the new tree
    const newCommitRes = await fetch(`${baseUrl}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: `${plan.pr_title}\n\nGenerated by SecurePulse Autonomous Agent.`,
        tree: newTreeSha,
        parents: [baseCommitSha],
      }),
    });
    if (!newCommitRes.ok) throw new Error("Failed to create commit object.");
    const newCommitData = (await newCommitRes.json()) as { sha?: string };
    const newCommitSha = newCommitData.sha;

    // Step 9: Create a new Branch (Reference) pointing to our new commit
    const uniqueBranchName = `${plan.branch_name}-${Date.now().toString().slice(-4)}`;
    const createRefRes = await fetch(`${baseUrl}/git/refs`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${uniqueBranchName}`,
        sha: newCommitSha,
      }),
    });
    if (!createRefRes.ok)
      throw new Error(
        `Failed to push new branch '${uniqueBranchName}' to GitHub.`,
      );

    // Step 10: Trigger the dry-run validation action (securepulse-validate.yml)
    const validationStarted = await triggerValidationWorkflow(
      data.owner,
      data.repo,
      uniqueBranchName,
      githubToken,
    );

    // Step 11: Format PR body with pre-flight validation status
    const validationBanner = validationStarted
      ? `\n\n> ⏳ **Pre-Flight Validation Dispatched**: SecurePulse triggered \`securepulse-validate.yml\` on this branch. Please wait for CI checks to complete before merging.`
      : `\n\n> ⚠️ **Validation Status**: Could not automatically dispatch \`securepulse-validate.yml\` (workflow file may not exist in repo yet). Please review changes manually.`;

    const finalPrBody = `${plan.pr_body}\n\n### 🛡️ Modified Files (${edits.length})\n${edits.map((e) => `- \`${e.file_path}\` (${e.action})`).join("\n")}${validationBanner}`;

    // Step 12: Open the Pull Request on GitHub
    const prRes = await fetch(`${baseUrl}/pulls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: plan.pr_title,
        head: uniqueBranchName,
        base: baseBranch,
        body: finalPrBody,
      }),
    });

    if (!prRes.ok) {
      const prErrText = await resErrorToString(prRes);
      throw new Error(`Failed to open Pull Request: ${prErrText}`);
    }

    const prData = (await prRes.json()) as {
      html_url?: string;
      number?: number;
    };

    return {
      success: true,
      prUrl: prData.html_url ?? null,
      branchName: uniqueBranchName,
      prNumber: prData.number ?? null,
      operations: edits.map((e) => ({ path: e.file_path, action: e.action })),
      summary: `Successfully generated fixes for ${edits.length} file(s) and opened Pull Request #${prData.number || ""}.`,
    };
  });

// Helper for parsing error responses cleanly
async function resErrorToString(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { message?: string };
    return json.message || res.statusText;
  } catch {
    return res.statusText;
  }
}
