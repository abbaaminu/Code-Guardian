import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { geminiApiRateLimiter } from "@/lib/rate-limiter";
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

/**
 * Resolves the GitHub token that actually runs this task. It is never accepted
 * from the client: the per-user encrypted vault (if the user saved a PAT) takes
 * precedence, then a server-configured bot token falls back for deployments
 * that use a single automation account.
 */
async function resolveGithubToken(userId: string): Promise<string | null> {
  try {
    const { getDecryptedRepoTokenServerOnly } =
      await import("@/lib/vault/vault.functions");
    const vaultToken = await getDecryptedRepoTokenServerOnly(userId, "github");
    if (vaultToken) return vaultToken;
  } catch (err) {
    console.warn("[agent] Could not load GitHub token from vault:", err);
  }
  // M3: the env fallback lives in a server-only module so the raw
  // process.env.GITHUB_TOKEN read never ships toward the client bundle.
  const { getGithubToken } = await import("@/lib/github/token.server");
  return getGithubToken();
}

// ==========================================
// 2. VECTOR EMBEDDINGS & CONTEXT RETRIEVAL
// ==========================================

/**
 * Generates a vector embedding for the agent's instructions using Google's text-embedding-004.
 */
async function getInstructionEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to generate embedding for instruction: ${errText}`);
  }

  const data = (await res.json()) as { embedding?: { values?: number[] } };
  return data.embedding?.values ?? [];
}

/**
 * Queries Supabase pgvector to retrieve the most relevant file chunks for the given instruction.
 * `supabase` is the server-side client resolved inside the runAgentTask handler.
 */
export async function retrieveRepoContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  owner: string,
  repo: string,
  instruction: string,
  apiKey: string,
  matchCount = 6,
): Promise<Array<{ file_path: string; content: string; similarity: number }>> {
  const queryVector = await getInstructionEmbedding(instruction, apiKey);

  if (queryVector.length === 0) {
    throw new Error(
      "Could not compute embedding vector for context retrieval.",
    );
  }

  // Call the Supabase RPC function created during your pgvector setup
  const { data, error } = await supabase.rpc("search_repo_context", {
    query_embedding: queryVector,
    match_threshold: 0.5,
    match_count: matchCount,
    repo_owner: owner,
    repo_name: repo,
  });

  if (error) {
    console.warn(
      `Vector search error (${error.message}). Proceeding without vector context.`,
    );
    return [];
  }

  return Array.isArray(data) ? data : [];
}

// ==========================================
// 3. AI REMEDIATION PLANNER
// ==========================================

/**
 * Uses Gemini to analyze relevant repository files and generate multi-file remediation code.
 */
async function generateRemediationPlan(
  instruction: string,
  contextFiles: Array<{ file_path: string; content: string }>,
  apiKey: string,
): Promise<AgentPlan> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contextPrompt = contextFiles
    .map((f) => `--- FILE: ${f.file_path} ---\n${f.content}\n--- END FILE ---`)
    .join("\n\n");

  const systemPrompt = `You are SecurePulse Autonomous Agent, an expert code security remediator.
You are given a target instruction and relevant source code files retrieved from the repository's vector index.

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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Agent Planner failed with status ${res.status}`);
  }

  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content =
    payload.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "{}";

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
 *  - The GitHub token is resolved server-side (encrypted vault -> GITHUB_TOKEN);
 *    the client can never inject one.
 *  - Every AI-proposed edit passes `validateAgentEdits` before any blob/tree/ref
 *    is created (H1).
 *  - Gemini calls are per-user rate limited alongside runScan/copilotRemediate
 *    (H4).
 */
export const runAgentTask = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => AgentTaskInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not configured.");
    }

    // Per-user rate limit: this task makes paid Gemini calls (embedding + plan).
    if (!geminiApiRateLimiter.tryTake(context.userId)) {
      throw new Error(
        "Rate limit reached — please wait a moment before running another agent task.",
      );
    }

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    const githubToken = await resolveGithubToken(context.userId);
    if (!githubToken) {
      throw new Error(
        "No GitHub token configured. Save one in the token vault or set the GITHUB_TOKEN environment variable.",
      );
    }

    // Step 1: Retrieve semantic context from Supabase pgvector store
    const contextFiles = await retrieveRepoContext(
      supabase,
      data.owner,
      data.repo,
      data.instruction,
      apiKey,
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
