import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AGENT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "py", "rb", "go", "php", "java", "kt", "cs",
  "sol", "rs", "c", "cpp", "h", "sql", "yml", "yaml", "json", "css",
  "html", "md",
]);

const MAX_CONTEXT_FILES = 20;
const MAX_CONTEXT_CHARS = 80000;

function gh(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

async function fetchRepoContext(owner: string, repo: string, branch: string, token: string) {
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: gh(token) },
  );
  if (!treeRes.ok) throw new Error(`Could not read repo tree (${treeRes.status}). Check the branch name and token permissions.`);
  const treeData = await treeRes.json();

  const candidates: string[] = (treeData.tree || [])
    .filter(
      (item: any) =>
        item.type === "blob" &&
        item.size < 50000 &&
        AGENT_EXTENSIONS.has(item.path.split(".").pop()?.toLowerCase() ?? "") &&
        !item.path.includes("node_modules/") &&
        !item.path.includes("dist/") &&
        !item.path.includes(".lock"),
    )
    .map((item: any) => item.path)
    .slice(0, MAX_CONTEXT_FILES);

  const files: { path: string; content: string; sha: string }[] = [];
  let totalChars = 0;
  for (const path of candidates) {
    if (totalChars >= MAX_CONTEXT_CHARS) break;
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: gh(token) },
    );
    if (!fileRes.ok) continue;
    const fileData = await fileRes.json();
    if (!fileData.content) continue;
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
    files.push({ path, content, sha: fileData.sha });
    totalChars += content.length;
  }
  return files;
}

const AgentInput = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1).default("main"),
  instruction: z.string().min(1).max(4000),
});

type FileOp = { path: string; action: "create" | "update" | "delete"; content?: string };

export const runAgentTask = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AgentInput.parse(input))
  .handler(async ({ data }) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("Missing GITHUB_TOKEN — repo write access isn't configured on the server yet.");
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

    // 1. Resolve base branch head SHA
    const refRes = await fetch(
      `https://api.github.com/repos/${data.owner}/${data.repo}/git/ref/heads/${data.branch}`,
      { headers: gh(token) },
    );
    if (!refRes.ok) throw new Error(`Could not read branch "${data.branch}" (${refRes.status}).`);
    const refData = await refRes.json();
    const baseSha = refData.object.sha as string;

    // 2. Pull relevant file contents for context
    const files = await fetchRepoContext(data.owner, data.repo, data.branch, token);
    if (files.length === 0) throw new Error("No readable source files found in this repo/branch.");

    const fileListing = files
      .map((f) => `\n// ==== File: ${f.path} ====\n${f.content}`)
      .join("\n");

    // 3. Ask Gemini for a structured multi-file plan
    const systemPrompt = `You are SecurePulse's autonomous coding agent. Given a snapshot of a repository and a plain-English instruction, decide the minimal set of file changes needed.

STRICT OUTPUT CONTRACT — return ONLY this JSON shape, nothing else:
{
  "branch_name": string,        // short kebab-case, prefixed "securepulse/"
  "commit_message": string,
  "pr_title": string,
  "pr_body": string,            // 2-4 sentences explaining the change
  "operations": [
    { "path": string, "action": "create" | "update" | "delete", "content": string | null }
  ]
}
Rules:
- "content" is required and must be the FULL new file content for "create" and "update". Use null for "delete".
- Only touch files that are actually necessary for the instruction.
- Never fabricate a path that doesn't make sense for this project's structure.
- If the instruction is unsafe, unclear, or cannot be done from the given files, return "operations": [] and explain why in "pr_body".`;

    const userPrompt = `Instruction: ${data.instruction}\n\nRepository snapshot (partial, most relevant files):\n${fileListing}`;

    const model = "gemini-3.6-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Agent model error [${res.status}]: ${body.slice(0, 300)}`);
    }
    const payload = await res.json();
    const raw = payload.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "{}";
    const plan = JSON.parse(raw) as {
      branch_name: string;
      commit_message: string;
      pr_title: string;
      pr_body: string;
      operations: FileOp[];
    };

    if (!plan.operations || plan.operations.length === 0) {
      return { prUrl: null, branchName: null, summary: plan.pr_body || "No changes were made.", operations: [] };
    }

    // 4. Create the new branch from base
    const branchName = plan.branch_name || `securepulse/agent-${Date.now()}`;
    const createBranchRes = await fetch(
      `https://api.github.com/repos/${data.owner}/${data.repo}/git/refs`,
      { method: "POST", headers: gh(token), body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }) },
    );
    if (!createBranchRes.ok) {
      const body = await createBranchRes.text();
      throw new Error(`Could not create branch: ${body.slice(0, 200)}`);
    }

    // 5. Apply each file operation
    const shaByPath = new Map(files.map((f) => [f.path, f.sha]));
    for (const op of plan.operations) {
      const url = `https://api.github.com/repos/${data.owner}/${data.repo}/contents/${op.path}`;
      if (op.action === "delete") {
        const sha = shaByPath.get(op.path);
        if (!sha) continue; // can't delete a file we don't have a sha for
        await fetch(url, {
          method: "DELETE",
          headers: gh(token),
          body: JSON.stringify({ message: plan.commit_message, sha, branch: branchName }),
        });
      } else {
        const body: Record<string, unknown> = {
          message: plan.commit_message,
          content: Buffer.from(op.content ?? "", "utf-8").toString("base64"),
          branch: branchName,
        };
        const existingSha = shaByPath.get(op.path);
        if (existingSha) body.sha = existingSha; // required when updating an existing file
        await fetch(url, { method: "PUT", headers: gh(token), body: JSON.stringify(body) });
      }
    }

    // 6. Open the PR
    const prRes = await fetch(`https://api.github.com/repos/${data.owner}/${data.repo}/pulls`, {
      method: "POST",
      headers: gh(token),
      body: JSON.stringify({
        title: plan.pr_title || "SecurePulse agent changes",
        head: branchName,
        base: data.branch,
        body: plan.pr_body || "",
      }),
    });
    if (!prRes.ok) {
      const body = await prRes.text();
      throw new Error(`Branch created and files committed, but PR creation failed: ${body.slice(0, 200)}`);
    }
    const prData = await prRes.json();

    return {
      prUrl: prData.html_url as string,
      branchName,
      summary: plan.pr_body,
      operations: plan.operations.map((o) => ({ path: o.path, action: o.action })),
    };
  });
