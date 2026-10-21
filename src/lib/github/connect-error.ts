// Classifies GitHub errors that the user can fix by saving a personal token in
// their encrypted vault. The UI turns these into a Sonner toast with a
// "Connect GitHub" action that opens `ConnectGithubModal`.
//
// Keep this a pure module: it is imported from client components, so it must
// stay free of server-only dependencies.
//
// Source messages this recognises:
//   - repository-authorization.server.ts ("Connect your GitHub account first…")
//   - repository-authorization.server.ts (401 → "saved GitHub token is invalid")
//   - agent.functions.ts ("A personal GitHub token is required…")

const MISSING_CREDENTIAL_PATTERNS: RegExp[] = [
  /connect your github account/i,
  /token vault/i,
  /personal github token is required/i,
  /saved github token is invalid or expired/i,
  /no github token/i,
  /missing github token/i,
];

/**
 * True when a failure message means "the caller has no usable GitHub
 * credential in the vault yet". Only user-actionable credential problems match;
 * App-installation / rate-limit / permission failures do not, because saving a
 * token would not resolve them.
 */
export function isMissingGithubCredentialError(message: unknown): boolean {
  if (typeof message !== "string" || message.trim() === "") return false;
  return MISSING_CREDENTIAL_PATTERNS.some((pattern) => pattern.test(message));
}
