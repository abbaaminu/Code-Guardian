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
import { instantScanRateLimiter } from "@/lib/rate-limiter";

const InstantScanInput = z.object({
  file_type: z.string().min(1).max(40),
  source_code: z.string().min(1).max(200_000),
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function requireBearerUser(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw jsonError("Unauthorized: missing bearer token", 401);
  }
  const token = authHeader.slice("Bearer ".length);
  if (token.split(".").length !== 3) {
    throw jsonError("Unauthorized: invalid token", 401);
  }

  // M4/M5: reuse the auth middleware's single shared Supabase client for JWT
  // verification instead of allocating a fresh client on every request.
  const { verifySupabaseToken } =
    await import("@/integrations/supabase/auth-middleware");
  try {
    const { userId } = await verifySupabaseToken(token);
    return userId;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Missing Supabase environment variable(s):")
    ) {
      throw jsonError(
        "Authentication is temporarily unavailable because the server's Supabase configuration is incomplete.",
        503,
      );
    }
    throw jsonError("Unauthorized: invalid token", 401);
  }
}

export const Route = createFileRoute("/api/scan/instant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId: string;
        try {
          userId = await requireBearerUser(request);
        } catch (res) {
          if (res instanceof Response) return res;
          console.error(
            "[instant scan] Authentication failed unexpectedly:",
            res,
          );
          return jsonError("Authentication failed unexpectedly.", 500);
        }

        if (!instantScanRateLimiter.tryTake(userId)) {
          return jsonError(
            "Instant scan rate limit reached. Please wait before trying again.",
            429,
          );
        }

        let parsed: z.infer<typeof InstantScanInput>;
        try {
          parsed = InstantScanInput.parse(await request.json());
        } catch {
          return jsonError("Invalid request body", 400);
        }

        try {
          const findings = await runLocalSAST(
            parsed.source_code,
            parsed.file_type,
          );
          return new Response(
            JSON.stringify({
              findings,
              engine: findings.some((f) => f.engine === "ast")
                ? "ast"
                : "heuristic",
            }),
            { headers: { "content-type": "application/json" } },
          );
        } catch (error) {
          console.error("[instant scan] Scan failed:", error);
          return jsonError("Instant scan failed. Please try again.", 500);
        }
      },
    },
  },
});
