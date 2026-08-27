// Server-only access to the GitHub automation token.
//
// SERVER-ONLY. The raw `process.env.GITHUB_TOKEN` read must stay on the server;
// never import this module statically from a route file or *.functions.ts that
// ships to the client bundle. Reference it from other server code via a dynamic
// `await import("@/lib/github/token.server")` inside a server function handler,
// exactly like client.server.ts and vault/encryption.ts.
//
// Prefer the per-user encrypted vault (vault.functions.ts) for real users;
// GITHUB_TOKEN is the single-automation-account fallback for deployments that
// haven't wired up per-user tokens yet.

export function getGithubToken(): string | null {
  return process.env.GITHUB_TOKEN ?? null;
}
