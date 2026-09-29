// Server-side telemetry: error reporting and engine latency.
//
// WHY NO @sentry/node
// -------------------
// The SDK ships an instrumentation layer (auto-patched fetch/http modules, a
// detached transport with its own flush lifecycle) that this app does not need
// — we emit exactly two kinds of signal: an exception, and an engine-timing
// measurement. Everything below is plain `fetch` + `JSON` against Sentry's
// documented Store ingestion endpoint, so it behaves identically on Vercel's
// Node runtime and on Cloudflare Workers and adds zero dependencies to the
// server bundle.
//
// FAILURE POLICY
// --------------
// Telemetry must never surface to a user, block a response, or mask the error
// it is reporting. Every send is fire-and-forget with a hard timeout and a
// swallowed catch, and a malformed DSN disables telemetry instead of throwing.
//
// SERVER-ONLY: reads SENTRY_DSN. When the DSN is unset (local dev, previews)
// every export here is a cheap no-op.

interface SentryClient {
  endpoint: string;
  publicKey: string;
  environment: string;
  release: string | null;
  serverName: string | null;
}

interface SentryFrame {
  filename: string;
  function?: string;
  lineno?: number;
  colno?: number;
  in_app: boolean;
}

interface SentryEvent {
  level: "error" | "info";
  message?: string;
  exception?: Array<{
    type: string;
    value: string;
    stacktrace: { frames: SentryFrame[] };
  }>;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

let client: SentryClient | null = null;

/**
 * Parses a DSN of the form `https://<publicKey>@<host>/<projectId>` (Sentry
 * Cloud) or `https://<publicKey>@<host>/<pathPrefix>/<projectId>`
 * (self-hosted, where the DSN path carries the Sentry mount point).
 *
 * Returns `null` for anything malformed: a typo in a deploy config should
 * disable telemetry, never crash the server on boot.
 */
function parseDsn(dsn: string): SentryClient | null {
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const projectId = segments.pop();
  if (!url.username || !projectId) return null;

  // Keep any path prefix in front of /api/ so self-hosted installs work too.
  const prefix = segments.length > 0 ? `/${segments.join("/")}` : "";

  return {
    endpoint: `${url.protocol}//${url.host}${prefix}/api/${projectId}/store/`,
    publicKey: url.username,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    serverName: process.env.VERCEL_URL ?? null,
  };
}

/**
 * Enables error reporting. Idempotent, and safe to call from any server entry
 * point (see server.ts). Returns whether telemetry is active so boot code can
 * log the decision once.
 */
export function initTelemetry(): boolean {
  if (client) return true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  const parsed = parseDsn(dsn);
  if (!parsed) {
    console.error(
      "[telemetry] SENTRY_DSN is malformed (expected https://<key>@<host>/<projectId>); error reporting stays disabled.",
    );
    return false;
  }

  client = parsed;
  return true;
}

/** 32 hex chars, no separators — Sentry's event_id format. */
function randomEventId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`
    .padEnd(32, "0")
    .slice(0, 32);
}

function abortAfter(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    // Older runtimes: send without a timeout rather than skipping the event.
    return undefined;
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Converts a V8 stack trace into Sentry frames. Sentry expects frames ordered
 * oldest-first, which is the reverse of V8's newest-first output.
 */
function parseStackFrames(stack: string | undefined): SentryFrame[] {
  if (!stack) return [];
  const frames: SentryFrame[] = [];

  for (const raw of stack.split("\n").slice(1)) {
    const match = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(raw);
    if (!match) continue;
    const filename = match[2];
    frames.push({
      filename,
      in_app: !filename.includes("node_modules"),
      ...(match[1] ? { function: match[1] } : {}),
      lineno: Number(match[3]),
      colno: Number(match[4]),
    });
  }

  return frames.reverse();
}

function toException(error: unknown): {
  type: string;
  value: string;
  stacktrace: { frames: SentryFrame[] };
} {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      value: error.message || "(no message)",
      stacktrace: { frames: parseStackFrames(error.stack) },
    };
  }
  return {
    type: "NonError",
    value: typeof error === "string" ? error : safeStringify(error),
    stacktrace: { frames: [] },
  };
}

async function sendEvent(event: SentryEvent): Promise<void> {
  const target = client;
  if (!target) return;

  const body = JSON.stringify({
    event_id: randomEventId(),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: event.level,
    logger: "securepulse",
    environment: target.environment,
    ...(target.release ? { release: target.release } : {}),
    ...(target.serverName ? { server_name: target.serverName } : {}),
    ...(event.message ? { message: event.message } : {}),
    ...(event.exception ? { exception: event.exception } : {}),
    ...(event.tags ? { tags: event.tags } : {}),
    ...(event.extra ? { extra: event.extra } : {}),
  });

  const signal = abortAfter(5_000);
  try {
    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": [
          "Sentry sentry_version=7",
          "sentry_client=securepulse-telemetry/1.0",
          `sentry_key=${target.publicKey}`,
        ].join(", "),
      },
      body,
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) {
      console.warn(`[telemetry] Sentry rejected an event [${res.status}]`);
    }
  } catch {
    // Intentionally swallowed: a telemetry failure must not mask the original
    // error, and must never propagate into a request path.
  }
}

/**
 * Reports a caught error. No-op until `initTelemetry()` has run against a valid
 * DSN, so call sites never need to guard themselves.
 *
 * Wired from src/lib/error-capture.ts, which owns the global error listeners
 * (`error` / `unhandledrejection`) for both the SSR runtime and server functions.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (!client) return;
  void sendEvent({
    level: "error",
    exception: [toException(error)],
    ...(context ? { extra: context } : {}),
  });
}

/**
 * Times one engine pass and reports the measurement.
 *
 * Wrapped around each scan engine (see sast-engine.ts and the Gemini pass in
 * scan.functions.ts) so scan latency is observable and a regression — e.g. a
 * pathological input that makes the AST walk slow — shows up before users
 * report it. The measurement is sent as an `info` event tagged by engine, with
 * the raw duration in `extra.duration_ms` for grouping and alerting.
 */
export async function withEngineTiming<T>(
  engineName: "ast" | "heuristic" | "gemini",
  fn: () => Promise<T> | T,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[telemetry] ${engineName} engine took ${durationMs}ms`);
    }
    if (client) {
      void sendEvent({
        level: "info",
        message: "securepulse.engine.duration_ms",
        extra: { duration_ms: durationMs, engine: engineName },
        tags: { engine: engineName },
      });
    }
  }
}
