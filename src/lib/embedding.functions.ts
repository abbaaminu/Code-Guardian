// src/lib/embedding.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

export const indexRepository = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string().default("main")
  }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = await serverSupabase();
    const token = process.env.GITHUB_TOKEN;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!token || !apiKey) throw new Error("Missing required API credentials.");

    // 1. Fetch all relevant files from the repo (using your existing fetchRepoContext)
    const files = await fetchRepoContext(data.owner, data.repo, data.branch, token);
    if (!files.length) return { success: false, message: "No files found to index." };

    // 2. Clear stale embeddings for this repo to prevent hallucination on old logic
    await supabase
      .from("repo_embeddings")
      .delete()
      .match({ owner: data.owner, repo: data.repo });

    // 3. Generate embeddings and store them
    const records = [];
    for (const file of files) {
      const embedRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: `File: ${file.path}\n\n${file.content.slice(0, 8000)}` }] }
          }),
        }
      );

      if (!embedRes.ok) continue; // Skip on failure, or handle retries in production
      const embedData = await embedRes.json();
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

    // 4. Batch insert into pgvector
    const { error } = await supabase.from("repo_embeddings").insert(records);
    if (error) throw new Error("Failed to store repository embeddings.");

    return { success: true, filesIndexed: records.length };
  });
