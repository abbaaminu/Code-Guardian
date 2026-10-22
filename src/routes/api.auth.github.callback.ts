import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { verifyGitHubOAuthState } from "@/lib/github/oauth-state.server";

const STATE_COOKIE = "github_oauth_state";

function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;
  const cookie = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1);
}

function callbackPage(
  success: boolean,
  clearCookie?: string,
  status = 200,
): Response {
  const outcome = JSON.stringify({
    type: "securepulse.github.oauth",
    success,
  });
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>GitHub connection</title></head>
  <body>
    <p>${success ? "GitHub connected. You can close this window." : "GitHub could not be connected. Return to the app and try again."}</p>
    <script>
      if (window.opener) {
        window.opener.postMessage(${outcome}, window.location.origin);
        window.close();
      }
    </script>
  </body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; script-src 'unsafe-inline'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      ...(clearCookie ? { "set-cookie": clearCookie } : {}),
    },
  });
}

export const Route = createFileRoute("/api/auth/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
        const stateCookie = readCookie(request, STATE_COOKIE);
        const state = url.searchParams.get("state");
        const userId = clientSecret
          ? verifyGitHubOAuthState(stateCookie, state, clientSecret)
          : null;
        const clearCookie =
          `${STATE_COOKIE}=; Path=/api/auth/github/callback; Max-Age=0; HttpOnly; SameSite=Lax` +
          (url.protocol === "https:" ? "; Secure" : "");

        if (
          !clientId ||
          !clientSecret ||
          !userId ||
          url.searchParams.has("error")
        ) {
          if (!clientId || !clientSecret) {
            console.error(
              "[github oauth] OAuth client credentials are missing.",
            );
          }
          return callbackPage(false, clearCookie, 400);
        }

        const code = url.searchParams.get("code");
        if (!code) {
          return callbackPage(false, clearCookie, 400);
        }

        try {
          const callbackUrl = new URL("/api/auth/github/callback", request.url);
          const tokenResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
              method: "POST",
              headers: {
                accept: "application/json",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: callbackUrl.href,
              }),
            },
          );
          if (!tokenResponse.ok) {
            throw new Error(
              `GitHub OAuth token exchange failed with HTTP ${tokenResponse.status}`,
            );
          }
          const tokenPayload: unknown = await tokenResponse.json();
          if (
            typeof tokenPayload !== "object" ||
            tokenPayload === null ||
            !("access_token" in tokenPayload) ||
            typeof tokenPayload.access_token !== "string" ||
            tokenPayload.access_token.length < 10
          ) {
            throw new Error(
              "GitHub OAuth response did not contain an access token",
            );
          }

          const { encryptSecret } = await import("@/lib/vault/encryption");
          const { ciphertext, iv, authTag } = encryptSecret(
            tokenPayload.access_token,
          );
          const { supabaseAdmin } =
            await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("vault_secrets").upsert(
            {
              user_id: userId,
              provider: "github",
              label: "default",
              encrypted_token: ciphertext,
              iv,
              auth_tag: authTag,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,provider,label" },
          );
          if (error) throw new Error(error.message);

          return callbackPage(true, clearCookie);
        } catch (error) {
          console.error(
            "[github oauth] Callback could not save the token:",
            error,
          );
          return callbackPage(false, clearCookie, 500);
        }
      },
    },
  },
});
