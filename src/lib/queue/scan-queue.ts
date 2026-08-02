// Background scan queue — SCAFFOLD, not wired to real infrastructure.
//
// Why this needs to exist: `runScan` in scan.functions.ts currently runs
// synchronously inside the request handler — one Gemini call plus the AST pass,
// awaited before the HTTP response returns. That's fine for a single pasted
// file (the current UI's only real input path) but breaks down for the
// "100k+ line repository" case in the roadmap: Vercel serverless functions cap
// out at 10s (Hobby) or 60s (Pro, configurable higher on Enterprise), and a
// multi-file AI-assisted scan of a real repo can easily exceed that.
//
// This file defines the intended job contract and queue/worker split using
// BullMQ + Redis (the roadmap's suggested stack) so the rest of the codebase
// (the webhook handler, a future "scan this repo" button) has a stable API to
// call against. It is NOT wired up because that requires infrastructure this
// environment doesn't have: a running Redis instance and the `bullmq`/`ioredis`
// packages installed. To make this real:
//
//   1. npm install bullmq ioredis
//   2. Provision Redis (Upstash, Redis Cloud, or self-hosted) and set REDIS_URL
//   3. Run the worker as a separate long-lived process (NOT inside the
//      serverless function) — e.g. a small Fly.io/Render/ECS service running
//      `node dist/worker.js`, or a Vercel background function if your plan
//      supports them. The worker process is also where sandboxed execution
//      (item #2, "Sandboxed Execution Environment") belongs: each job should
//      shell out to a locked-down container (gVisor/Fargate/Docker with
//      --network=none, a CPU/memory/time limit, and no access to the host
//      filesystem beyond a scratch dir) to parse untrusted repository content,
//      rather than parsing it in-process. Sketch:
//
//        const result = await runInSandbox({
//          image: "securepulse/scan-sandbox:latest",
//          timeoutMs: 120_000,
//          cpus: 1,
//          memoryMb: 512,
//          network: "none",
//          mount: { "/workspace": tmpRepoCheckoutPath },
//          command: ["node", "sandbox-entry.js"],
//        });
//
//      `runInSandbox` itself isn't implemented here — it's a thin wrapper
//      around whichever of Docker/Fargate/gVisor you provision, and that
//      choice depends on your deployment target in a way generic code can't
//      decide for you.

export interface ScanJob {
  type: "pull_request" | "manual_repo";
  installationId?: number;
  repoFullName: string;
  prNumber?: number;
  headSha?: string;
  requestedByUserId?: string;
}

export interface ScanJobResult {
  scanId: string;
  filesScanned: number;
  findingsCount: number;
}

// TODO: replace this in-memory stub with a real BullMQ Queue once `bullmq` and
// `ioredis` are installed and REDIS_URL is set. Kept here (rather than throwing
// immediately) so callers can be written against the final API today.
export async function enqueueScanJob(job: ScanJob): Promise<{ jobId: string }> {
  if (!process.env.REDIS_URL) {
    throw new Error(
      "Scan queue is not configured (missing REDIS_URL / bullmq dependency). " +
        "See the setup steps at the top of scan-queue.ts. Falling back to a synchronous " +
        "scan is only appropriate for small single-file inputs, not full-repo scans.",
    );
  }

  // Real implementation, once dependencies are installed:
  //
  //   import { Queue } from "bullmq";
  //   const queue = new Queue<ScanJob>("securepulse-scans", {
  //     connection: { url: process.env.REDIS_URL },
  //   });
  //   const bullJob = await queue.add("scan", job, {
  //     attempts: 2,
  //     backoff: { type: "exponential", delay: 5000 },
  //     removeOnComplete: 500,
  //     removeOnFail: 1000,
  //   });
  //   return { jobId: bullJob.id! };

  throw new Error("Queue scaffold present but not yet wired to BullMQ — see scan-queue.ts.");
}

// Worker skeleton — this belongs in a separate long-running process, not in a
// serverless function. Illustrative only:
//
//   import { Worker } from "bullmq";
//   import { runInSandbox } from "./sandbox"; // not implemented — see above
//
//   new Worker<ScanJob, ScanJobResult>(
//     "securepulse-scans",
//     async (job) => {
//       const sandboxResult = await runInSandbox({ /* ... */ });
//       // parse sandboxResult, run runLocalSAST + AI engine per file,
//       // persist via supabaseAdmin, return a ScanJobResult summary.
//     },
//     { connection: { url: process.env.REDIS_URL }, concurrency: 4 },
//   );
