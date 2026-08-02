// Instant single-file scan endpoint for IDE integrations (VS Code extension,
// an LSP server, a pre-commit hook, etc). Roadmap item: "Expose an API
// endpoint that allows a VS Code extension or LSP engine to trigger instant
// on-save scans."
//
// Deliberately runs ONLY the local AST/heuristic engine, not the Gemini AI
// engine: on-save needs to return in well under a second for a good editor
// experience, and a network round-trip to an LLM is both too slow for that
// and too expensive to run on every keystroke-adjacent save. This is a
// legitimate scope difference from the full `runScan` server function — it's
// a fast lint-like signal, not the full audit — and it does not persist
// anything to the scans/vulnerabilities tables. Point the "Run Full Audit"
// action in the same extension at the existing `runScan` server function for
// the complete AI-assisted pass.
//
// Auth: requires a Bearer <supabase access token>, same as the rest of the
// app's server functions — an IDE extension should let the user sign in once
// (e.g. via a device-code-style flow against Supabase Auth) and cache the
// token, not embed a shared secret.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { runLocalSAST } from "@/lib/sast-engine";

const InstantScanInput = z.object({
  file_type: z.string().min(1).max(40),
  source_code: z.string().min(1).max(200_000),
});

async function requireBearerUser(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response("Unauthorized: missing bearer token", { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  if (token.split(".").length !== 3) {
    throw new Response("Unauthorized: invalid token", { status: 401 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Response("Server misconfigured", { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Response("Unauthorized: invalid token", { status: 401 });
  }
  return data.claims.sub as string;
}

export const Route = createFileRoute("/api/scan/instant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireBearerUser(request);
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let parsed: z.infer<typeof InstantScanInput>;
        try {
          parsed = InstantScanInput.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Invalid request body" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const findings = runLocalSAST(parsed.source_code, parsed.file_type);
        return new Response(
          JSON.stringify({
            findings,
            engine: findings.some((f) => f.engine === "ast") ? "ast" : "heuristic",
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
