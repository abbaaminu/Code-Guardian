// Telemetry scaffold — SCAFFOLD, requires `npm install @sentry/browser
// @sentry/node` (or `@sentry/tanstackstart-react` if Sentry ships one by the
// time you read this — check their docs) and a real DSN before it does
// anything. Until then every function here is a safe no-op.
//
// What this is for (roadmap item #6, "Telemetry & Monitoring"): today the only
// signal on engine health is whatever you notice by eye. Two things are worth
// tracking from day one once this is wired up:
//
//   1. Engine execution time — call `withEngineTiming` around runLocalSAST /
//      the Gemini call in scan.functions.ts so you can see p50/p95 scan
//      latency and catch regressions (e.g. a pathological input that makes the
//      AST walk slow) before users complain.
//   2. False-positive rate proxy — you don't have ground truth on what's
//      actually exploitable, but you DO know when a user dismisses/edits a
//      finding without acting on it vs. accepts a Copilot fix. Emit a custom
//      event (`recordFindingFeedback`) from wherever that UI action lives
//      (vuln-card.tsx doesn't currently have a dismiss/accept action — you'd
//      need to add one) and track it as a metric tagged by rule id/cwe_id/
//      engine ("ast" | "heuristic" | "ai"). Over time, rules with a high
//      dismiss rate are your false-positive candidates to tune or retire.

let initialized = false;

export function initTelemetry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || initialized) return;
  initialized = true;

  // Real implementation, once @sentry/node is installed:
  //
  //   import * as Sentry from "@sentry/node";
  //   Sentry.init({
  //     dsn,
  //     tracesSampleRate: 0.1,
  //     environment: process.env.NODE_ENV,
  //   });
  console.warn("[telemetry] SENTRY_DSN is set but @sentry/node is not installed — telemetry is a no-op. See sentry.ts.");
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  // Sentry.captureException(error, { extra: context });
  void error;
  void context;
}

export async function withEngineTiming<T>(
  engineName: "ast" | "heuristic" | "gemini",
  fn: () => Promise<T> | T,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = performance.now() - start;
    // Sentry.metrics.distribution("securepulse.engine.duration_ms", durationMs, { tags: { engine: engineName } });
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[telemetry] ${engineName} engine took ${durationMs.toFixed(1)}ms`);
    }
  }
}

export function recordFindingFeedback(params: {
  action: "dismissed" | "accepted_fix" | "manually_fixed";
  ruleId: string;
  engine: "ast" | "heuristic" | "ai";
}) {
  if (!initialized) return;
  // Sentry.metrics.increment("securepulse.finding.feedback", 1, { tags: params });
  void params;
}
