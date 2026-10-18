import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { aiApiRateLimiter } from "@/lib/rate-limiter";
import { parseCopilotResponse } from "@/lib/ai-response";
import { streamDeepSeekChat } from "@/lib/deepseek";
import { verifySupabaseToken } from "@/integrations/supabase/auth-middleware";
import { NETWORK_CONNECTION_ERROR } from "@/lib/scan-engine-errors";

const CopilotInput = z.object({
  instruction: z.string().min(1).max(2000),
  source_code: z.string().min(1).max(60000),
  file_type: z.string().min(1).max(40),
  context: z.string().max(12000).optional(),
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function streamEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: unknown,
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

export const Route = createFileRoute("/api/copilot/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return jsonError("Unauthorized: missing bearer token", 401);
        }
        const token = authHeader.slice("Bearer ".length);
        if (token.split(".").length !== 3) {
          return jsonError("Unauthorized: invalid token", 401);
        }

        let userId: string;
        try {
          ({ userId } = await verifySupabaseToken(token));
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.startsWith(
              "Missing Supabase environment variable(s):",
            )
          ) {
            return jsonError(
              "Authentication is temporarily unavailable because the server's Supabase configuration is incomplete.",
              503,
            );
          }
          if (
            error instanceof Error &&
            error.message === NETWORK_CONNECTION_ERROR
          ) {
            return jsonError(error.message, 503);
          }
          return jsonError("Unauthorized: invalid token", 401);
        }

        if (!aiApiRateLimiter.tryTake(userId)) {
          return jsonError(
            "Rate limit reached — please wait a moment before asking the copilot again.",
            429,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid request body", 400);
        }
        const parsed = CopilotInput.safeParse(body);
        if (!parsed.success) {
          return jsonError("Invalid copilot request", 400);
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          return jsonError(
            "Copilot AI is temporarily unconfigured. Set DEEPSEEK_API_KEY in the server environment.",
            503,
          );
        }

        const { instruction, source_code, file_type, context } = parsed.data;
        const systemPrompt = `You are SecurePulse Remediation Copilot. Rewrite the user's code per their instruction, prioritizing security best practices.

STRICT OUTPUT CONTRACT:
- Return ONLY a JSON object: {"summary": string, "changes": string[], "updated_code": string}
- "summary": one-sentence description of what changed.
- "changes": short bullet list (max 5) of concrete edits.
- "updated_code": the ENTIRE updated source file, compilable/valid ${file_type}. NO markdown fences, NO placeholders, NO "TODO" comments.
- Use the supplied finding context to make the patch specific to that issue when present.
- If the instruction is unsafe, unclear, or unrelated, return the original code unchanged with an explanatory summary.`;
        const userPrompt = `Language: ${file_type}
Instruction: ${instruction}
${context ? `Finding context:\n${context}\n` : ""}
--- CODE START ---
${source_code}
--- CODE END ---`;
        const model = process.env.DEEPSEEK_MODEL || "deepseek-flash";
        const encoder = new TextEncoder();

        return new Response(
          new ReadableStream<Uint8Array>({
            async start(controller) {
              let content = "";
              try {
                for await (const delta of streamDeepSeekChat(
                  apiKey,
                  model,
                  [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                  ],
                  0.2,
                )) {
                  content += delta;
                  streamEvent(controller, encoder, { type: "delta", delta });
                }
                streamEvent(controller, encoder, {
                  type: "done",
                  result: parseCopilotResponse(content),
                });
              } catch (error) {
                console.error("[Copilot stream] Remediation failed:", error);
                streamEvent(controller, encoder, {
                  type: "error",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Copilot failed. Please try again.",
                });
              } finally {
                controller.close();
              }
            },
          }),
          {
            headers: {
              "content-type": "application/x-ndjson; charset=utf-8",
              "cache-control": "no-cache, no-transform",
              "x-accel-buffering": "no",
            },
          },
        );
      },
    },
  },
});
