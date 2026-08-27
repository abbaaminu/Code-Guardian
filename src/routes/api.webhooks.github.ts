// GitHub App webhook receiver. Wires the "GitHub App Integration" roadmap item:
// triggers automatically on pull_request events instead of requiring a manual
// UI scan.
//
// This verifies the webhook signature for real (timing-safe HMAC-SHA256
// comparison against GITHUB_WEBHOOK_SECRET) and parses the pull_request
// payload. What it does NOT do yet — because it genuinely needs infrastructure
// this sandbox can't stand up — is fetch the PR diff and enqueue a background
// scan job; that's `enqueueScanJob` from src/lib/queue/scan-queue.ts, which is
// itself a scaffold pending a real Redis instance. Once that queue exists,
// swap the TODO below for a real `await enqueueScanJob(...)` call — this route
// itself needs no further changes.
//
// Register the webhook URL as https://<your-domain>/api/webhooks/github in the
// GitHub App settings, subscribed to at least the `pull_request` event.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  // Different lengths would throw in timingSafeEqual; treat as a mismatch.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface PullRequestPayload {
  action: string;
  number: number;
  pull_request: {
    diff_url: string;
    head: { sha: string; ref: string };
    base: { sha: string; ref: string };
  };
  repository: { full_name: string; owner: { login: string }; name: string };
  installation?: { id: number };
}

export const Route = createFileRoute("/api/webhooks/github")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        if (!secret) {
          console.error(
            "[github webhook] GITHUB_WEBHOOK_SECRET is not configured; rejecting all deliveries.",
          );
          return new Response("Webhook not configured", { status: 503 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");
        if (!verifySignature(rawBody, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = request.headers.get("x-github-event");

        if (event === "pull_request") {
          // M2: GitHub always sends JSON, but a malformed delivery or a probe
          // hitting the URL directly must not crash the handler — reject it.
          let payload: PullRequestPayload;
          try {
            payload = JSON.parse(rawBody) as PullRequestPayload;
          } catch {
            return new Response("Invalid JSON payload", { status: 400 });
          }
          if (["opened", "synchronize", "reopened"].includes(payload.action)) {
            const installationId = payload.installation?.id;
            if (!installationId) {
              return new Response("Missing installation id", { status: 400 });
            }

            // TODO(queue): once src/lib/queue/scan-queue.ts is backed by a real
            // Redis instance, replace this with:
            //   await enqueueScanJob({
            //     type: "pull_request",
            //     installationId,
            //     repoFullName: payload.repository.full_name,
            //     prNumber: payload.number,
            //     headSha: payload.pull_request.head.sha,
            //   });
            // The worker then fetches the diff via getInstallationToken() +
            // the GitHub API, runs runLocalSAST + the AI engine per changed
            // file, and posts results with src/lib/github/pr-comments.ts.
            console.log(
              `[github webhook] PR #${payload.number} on ${payload.repository.full_name} queued for scan (installation ${installationId}) — queue not yet wired, see TODO.`,
            );
          }
        } else if (event === "installation") {
          // TODO: persist installation.id against the connecting user/org so
          // getInstallationToken() can be called later without the webhook
          // payload in hand. Needs a github_installations table.
          console.log("[github webhook] installation event received");
        }

        return new Response("ok", { status: 202 });
      },
    },
  },
});
