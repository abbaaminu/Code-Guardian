// GitHub App authentication: mint a short-lived (~1hr) installation access
// token instead of storing a user's permanent PAT. This is the "Zero-Trust
// Token Management" item from the roadmap.
//
// SERVER-ONLY (uses node:crypto for RS256 signing).
//
// SETUP REQUIRED before this works:
//   1. Create a GitHub App at https://github.com/settings/apps/new
//        - Permissions: Contents: Read, Pull requests: Read & Write,
//          Checks: Read & Write (for inline PR annotations).
//        - Subscribe to webhook events: pull_request, installation.
//        - Generate a private key (.pem) from the app settings page.
//   2. Set these server-only env vars:
//        GITHUB_APP_ID              — numeric App ID
//        GITHUB_APP_PRIVATE_KEY     — full PEM contents (use \n-escaped single
//                                     line in most secret managers, or base64
//                                     it — decode however your platform expects)
//        GITHUB_WEBHOOK_SECRET      — the webhook secret you set on the App
//   3. Have users install the App on their repos/org; GitHub then calls the
//      `installation` webhook with an installation_id you'll need to persist
//      (e.g. a github_installations table keyed by user_id/org_id — not yet
//      in this schema, add it alongside vault_secrets when you wire this up).
//
// This module implements the actual JWT (RS256) + installation-token exchange
// correctly; what it can't do without your registered App is produce a real
// token, since that requires your App's real private key and ID.

import { createSign } from "node:crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Signs a GitHub App JWT (RS256), valid for 10 minutes, used only to request
// installation access tokens — never used directly against the REST API.
export function signAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) {
    throw new Error("Missing GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY. See setup instructions in app-auth.ts.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60, // allow for clock drift
    exp: now + 9 * 60, // GitHub caps this at 10 minutes
    iss: appId,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  // Secret managers frequently mangle PEM newlines; normalize the common
  // "\\n"-escaped form back into real newlines before handing it to node:crypto.
  const normalizedKey = privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
  const signature = base64url(signer.sign(normalizedKey));

  return `${unsigned}.${signature}`;
}

export interface InstallationToken {
  token: string;
  expiresAt: string; // ISO 8601
}

// Exchanges the App JWT for a short-lived installation access token scoped to
// exactly the repos/permissions the installation grants. Cache the result
// server-side (e.g. in-memory per request, or Redis with a TTL a few minutes
// under `expiresAt`) rather than calling this per-API-request.
export async function getInstallationToken(installationId: number | string): Promise<InstallationToken> {
  const jwt = signAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to mint installation token [${res.status}]: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { token: string; expires_at: string };
  return { token: data.token, expiresAt: data.expires_at };
}
