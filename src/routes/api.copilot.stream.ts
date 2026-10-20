import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { aiApiRateLimiter } from "@/lib/rate-limiter";
import { parseCopilotResponse } from "@/lib/ai-response";
import { buildCopilotMessages } from "@/lib/copilot-prompt";
import { streamDeepSeekChat, resolveDeepSeekModel } from "@/lib/deepseek";
import { verifySupabaseToken } from "@/integrations/supabase/auth-middleware";
import { NETWORK_CONNECTION_ERROR } from "@/lib/scan-engine-errors";

const CopilotInput = z.object({
  instruction: z.string().trim().min(1).max(2000),
  // A scan is no longer required to talk to the copilot: it answers questions
  // about a file, a pasted snippet, or (with no code at all) about the finding
  // context passed alongside the instruction.
  source_code: z.string().max(60000).default(""),
  file_type: z.string().trim().min(1).max(40).default("text"),
  context: z.string().max(12000).optional(),
});

function jsonError(
  message: string,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
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

        // Validate before spending a rate-limit token: a malformed request
        // should never consume the user's DeepSeek budget.
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

        if (!aiApiRateLimiter.tryTake(userId)) {
          return jsonError(
            "Rate limit reached — please wait a moment before asking the copilot again.",
            429,
            { "retry-after": "10" },
          );
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          return jsonError(
            "Copilot AI is temporarily unconfigured. Set DEEPSEEK_API_KEY in the server environment.",
            503,
          );
        }

        const { instruction, source_code, file_type, context } = parsed.data;
        const messages = buildCopilotMessages({
          instruction,
          fileType: file_type,
          sourceCode: source_code,
          context,
        });
        const model = resolveDeepSeekModel();
        const encoder = new TextEncoder();

        // Abort the upstream DeepSeek request when the browser goes away
        // (tab closed, "Stop" pressed) so we stop paying for orphaned tokens.
        const upstream = new AbortController();
        const abortUpstream = () => upstream.abort();
        request.signal.addEventListener("abort", abortUpstream);

        return new Response(
          new ReadableStream<Uint8Array>({
            async start(controller) {
              let closed = false;
              const send = (event: unknown) => {
                if (closed) return;
                try {
                  controller.enqueue(
                    encoder.encode(`${JSON.stringify(event)}\n`),
                  );
                } catch {
                  // The client disconnected mid-stream; nothing left to write.
                  closed = true;
                  upstream.abort();
                }
              };

              try {
                let content = "";
                for await (const delta of streamDeepSeekChat(
                  apiKey,
                  model,
                  messages,
                  0.2,
                  upstream.signal,
                )) {
                  if (upstream.signal.aborted) break;
                  content += delta;
                  send({ type: "delta", delta });
                }

                if (!upstream.signal.aborted) {
                  send({
                    type: "done",
                    result: parseCopilotResponse(content),
                  });
                }
              } catch (error) {
                if (!upstream.signal.aborted) {
                  console.error("[Copilot stream] Remediation failed:", error);
                  send({
                    type: "error",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Copilot failed. Please try again.",
                  });
                }
              } finally {
                request.signal.removeEventListener("abort", abortUpstream);
                if (!closed) {
                  try {
                    controller.close();
                  } catch {
                    closed = true;
                  }
                }
              }
            },
            cancel() {
              upstream.abort();
            },
          }),
          {
            headers: {
              "content-type": "application/x-ndjson; charset=utf-8",
              "cache-control": "no-cache, no-store, no-transform",
              "x-accel-buffering": "no",
              "x-content-type-options": "nosniff",
            },
          },
        );
      },
    },
  },
});
