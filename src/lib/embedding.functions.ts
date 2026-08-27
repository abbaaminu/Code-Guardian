// src/lib/embedding.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Server-side admin client (service role) — loaded lazily so this module can
// safely ship to the client bundle without leaking the service-role key.
async function serverSupabase() {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Extensions worth pulling into an embedding index. Keep this focused — binary
// and asset files just burn the embedding token budget for no signal.
const INDEXABLE_EXTENSIONS = new Set([
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
  "env",
  "dockerfile",
  "sh",
]);

const MAX_FILES = 25;
const MAX_FILE_CHARS = 8000; // matches the embedding truncation below

interface RepoFile {
  path: string;
  content: string;
  sha: string;
}

// Fetches the file tree for a repo and returns the contents of the first
// MAX_FILES scannable blobs. Mirrors the client-side fetchRepoSourceCode logic
// but returns structured per-file records (path/content/sha) for embedding.
async function fetchRepoContext(
  owner: string,
  repo: string,
  branch: string,
  token: string,
): Promise<RepoFile[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers },
  );
  if (!treeRes.ok) {
    throw new Error(
      "Could not read repository file tree (branch may be wrong or repo is empty).",
    );
  }
  const treeData = (await treeRes.json()) as {
    tree?: Array<{ path?: string; type?: string; size?: number; sha?: string }>;
  };

  const blobs = (treeData.tree ?? []).filter(
    (item) =>
      item.type === "blob" &&
      typeof item.size === "number" &&
      item.size < 50000 && // skip huge generated/minified files
      INDEXABLE_EXTENSIONS.has(
        item.path?.split(".").pop()?.toLowerCase() ?? "",
      ) &&
      !item.path?.includes("node_modules/") &&
      !item.path?.includes("dist/") &&
      !item.path?.includes(".lock"),
  );

  const selected = blobs.slice(0, MAX_FILES);
  const files: RepoFile[] = [];

  for (const blob of selected) {
    try {
      const raw = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${blob.path}`,
        { headers },
      );
      if (!raw.ok) continue;
      const text = await raw.text();
      files.push({
        path: blob.path ?? "unknown",
        content: text.slice(0, MAX_FILE_CHARS),
        sha: blob.sha ?? "",
      });
    } catch {
      // Skip files that fail to fetch rather than aborting the whole index.
    }
  }

  return files;
}

export const indexRepository = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string().default("main"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await serverSupabase();
    // M3: read GITHUB_TOKEN via the server-only token module instead of
    // touching process.env directly in a module that ships to the client.
    const { getGithubToken } = await import("@/lib/github/token.server");
    const token = getGithubToken();
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!token || !apiKey) throw new Error("Missing required API credentials.");

    // 1. Fetch all relevant files from the repo.
    const files = await fetchRepoContext(
      data.owner,
      data.repo,
      data.branch,
      token,
    );
    if (!files.length)
      return { success: false, message: "No files found to index." };

    // 2. Clear stale embeddings for this repo to prevent hallucination on old logic.
    // NOTE: the `repo_embeddings` table is not yet present in the generated
    // Database types or migrations. Guard the delete so a missing table fails
    // gracefully instead of aborting the whole index.
    const { error: deleteErr } = await supabase
      .from("repo_embeddings")
      .delete()
      .match({ owner: data.owner, repo: data.repo });
    if (deleteErr) {
      console.warn(
        `[embedding] Could not clear stale embeddings: ${deleteErr.message}`,
      );
    }

    // 3. Generate embeddings and store them.
    const records: Array<{
      owner: string;
      repo: string;
      file_path: string;
      content: string;
      file_sha: string;
      embedding: number[];
    }> = [];
    for (const file of files) {
      const embedRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: {
              parts: [{ text: `File: ${file.path}\n\n${file.content}` }],
            },
          }),
        },
      );

      if (!embedRes.ok) continue; // Skip on failure, or handle retries in production
      const embedData = (await embedRes.json()) as {
        embedding?: { values?: number[] };
      };
      const embedding = embedData.embedding?.values;

      if (embedding) {
        records.push({
          owner: data.owner,
          repo: data.repo,
          file_path: file.path,
          content: file.content,
          file_sha: file.sha,
          embedding,
        });
      }
    }

    if (records.length === 0) {
      return { success: false, message: "No embeddings could be generated." };
    }

    // 4. Batch insert into pgvector.
    const { error } = await supabase.from("repo_embeddings").insert(records);
    if (error) throw new Error("Failed to store repository embeddings.");

    return { success: true, filesIndexed: records.length };
  });
