// GitHub App webhook receiver. Triggers an automatic scan on pull request
// activity instead of requiring a manual dashboard scan.
//
// SECURITY: every delivery is authenticated by a timing-safe HMAC-SHA256 check
// of `x-hub-signature-256` against GITHUB_WEBHOOK_SECRET before any work happens.
// Without that secret configured the route refuses all deliveries (503) rather
// than trusting the body.
//
// ON SUCCESS the handler runs the real scan inline: pr-scan.ts mints an
// installation token, reads each changed file at the PR head, runs the local
// SAST engine, and posts the findings as a PR review with inline comments.
//
// ON FAILURE it answers 5xx so GitHub retries the delivery (its retry policy
// covers 5xx and timeouts but not 4xx). Errors are also reported to telemetry.
//
// Register the webhook URL as https://<your-domain>/api/webhooks/github in the
// GitHub App settings, subscribed to at least the `pull_request` event.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "node:crypto";
import { scanPullRequest } from "@/lib/github/pr-scan";
import { captureException } from "@/lib/telemetry/sentry";

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
  repository: {
    full_name: string;
    owner: { login: string };
    name: string;
  };
  installation?: { id: number };
}

// Actions that change the code under review. "synchronize" is a push to the PR
// branch; a closed/edited/labeled event has nothing new to scan.
const SCANNABLE_ACTIONS = new Set(["opened", "synchronize", "reopened"]);

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

        if (event === "installation") {
          // Installation lifecycle events are acknowledged but not persisted:
          // there is no github_installations table in this schema, so there is
          // nowhere truthful to store the id yet. Log it so the value is
          // recoverable from logs when that table is added.
          console.log(
            `[github webhook] installation event received: ${rawBody.slice(0, 400)}`,
          );
          return new Response("ok", { status: 202 });
        }

        if (event !== "pull_request") {
          // Subscribed to something we don't act on — acknowledge, don't error.
          return new Response("ignored", { status: 202 });
        }

        // GitHub always sends JSON, but a malformed delivery or a probe hitting
        // the URL directly must not crash the handler — reject it.
        let payload: PullRequestPayload;
        try {
          payload = JSON.parse(rawBody) as PullRequestPayload;
        } catch {
          return new Response("Invalid JSON payload", { status: 400 });
        }

        if (!SCANNABLE_ACTIONS.has(payload.action)) {
          return new Response("ignored", { status: 202 });
        }

        const installationId = payload.installation?.id;
        const headSha = payload.pull_request?.head?.sha;
        const owner = payload.repository?.owner?.login;
        const repo = payload.repository?.name;
        if (!installationId || !headSha || !owner || !repo || !payload.number) {
          return new Response("Incomplete pull_request payload", {
            status: 400,
          });
        }

        try {
          const summary = await scanPullRequest({
            installationId,
            owner,
            repo,
            pullNumber: payload.number,
            headSha,
          });
          console.log(
            `[github webhook] PR #${payload.number} on ${payload.repository.full_name}: ` +
              `scanned ${summary.filesScanned}/${summary.filesChanged} files, ` +
              `${summary.findings} finding(s), ${summary.inlineComments} inline comment(s), ` +
              `${summary.summarizedOnly} summarised only, ${summary.filesSkipped} skipped`,
          );
          return new Response(JSON.stringify(summary), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          captureException(error, {
            source: "github.webhook.pull_request",
            pullRequest: payload.number,
            repository: payload.repository.full_name,
          });
          console.error("[github webhook] scan failed:", error);
          // 5xx so GitHub retries the delivery; a 4xx would be treated as final.
          return new Response("Scan failed", { status: 502 });
        }
      },
    },
  },
});
