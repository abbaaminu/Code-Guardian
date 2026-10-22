import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { verifySupabaseToken } from "@/integrations/supabase/auth-middleware";
import { createGitHubOAuthState } from "@/lib/github/oauth-state.server";

const STATE_COOKIE = "github_oauth_state";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/auth/github/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          return jsonError("Authentication required", 401);
        }

        let userId: string;
        try {
          ({ userId } = await verifySupabaseToken(
            authorization.slice("Bearer ".length),
          ));
        } catch {
          return jsonError("Invalid authentication session", 401);
        }

        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          console.error(
            "[github oauth] GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET must be configured.",
          );
          return jsonError("GitHub sign-in is not configured", 503);
        }

        const { state, cookieValue } = createGitHubOAuthState(
          userId,
          clientSecret,
        );
        const callbackUrl = new URL("/api/auth/github/callback", request.url);
        const authorizationUrl = new URL(
          "https://github.com/login/oauth/authorize",
        );
        authorizationUrl.searchParams.set("client_id", clientId);
        authorizationUrl.searchParams.set("redirect_uri", callbackUrl.href);
        authorizationUrl.searchParams.set("scope", "repo,workflow");
        authorizationUrl.searchParams.set("state", state);

        const secure = callbackUrl.protocol === "https:" ? "; Secure" : "";
        return new Response(
          JSON.stringify({ authorizationUrl: authorizationUrl.href }),
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
              "set-cookie": `${STATE_COOKIE}=${cookieValue}; Path=/api/auth/github/callback; Max-Age=600; HttpOnly; SameSite=Lax${secure}`,
            },
          },
        );
      },
    },
  },
});
