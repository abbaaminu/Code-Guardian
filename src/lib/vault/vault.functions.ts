// Server functions for the token vault (item #3 in the roadmap: "Zero-Trust
// Token Management"). This lets a user store a GitHub/GitLab PAT once,
// encrypted at rest with AES-256-GCM (see ./encryption.ts), instead of the app
// re-prompting for it or (worse) a route holding it in memory/localStorage.
//
// IMPORTANT — this is a stopgap, not the end state. Storing a long-lived PAT is
// explicitly what the roadmap's "Zero-Trust Token Management" item says to move
// away from, in favor of short-lived GitHub App installation tokens (see
// src/lib/github/app-auth.ts) that expire in ~1 hour and are scoped to exactly
// the repos the App was installed on. Wire up the GitHub App flow before
// shipping this to real users; keep this module around for GitLab (which has
// no first-class "App" equivalent with installation tokens) or as a fallback.
//
// The decrypted token is NEVER returned to the client. `hasRepoToken` only
// returns a boolean; any function that needs to actually use the token (e.g.
// a repo-fetch job) must decrypt it server-side and use it immediately.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

async function serverSupabase() {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function encryption() {
  return await import("./encryption");
}

const SaveTokenInput = z.object({
  provider: z.enum(["github", "gitlab"]),
  label: z.string().min(1).max(60).default("default"),
  token: z.string().min(10).max(4000),
});

export const saveRepoToken = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveTokenInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = await serverSupabase();
    const { encryptSecret } = await encryption();
    const { ciphertext, iv, authTag } = encryptSecret(data.token);

    const { error } = await supabase.from("vault_secrets").upsert(
      {
        user_id: context.userId,
        provider: data.provider,
        label: data.label,
        encrypted_token: ciphertext,
        iv,
        auth_tag: authTag,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider,label" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRepoToken = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        provider: z.enum(["github", "gitlab"]),
        label: z.string().default("default"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = await serverSupabase();
    const { error } = await supabase
      .from("vault_secrets")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", data.provider)
      .eq("label", data.label);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRepoTokenLabels = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = await serverSupabase();
    // Only ever select metadata columns here — never encrypted_token/iv/auth_tag.
    const { data, error } = await supabase
      .from("vault_secrets")
      .select("provider, label, created_at, updated_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Internal helper (NOT a createServerFn — never exposed as an RPC endpoint).
// Call this from other server-side code (e.g. a future repo-fetch job) that
// needs the plaintext token for exactly as long as it takes to make one API
// call. Do not cache the return value beyond that.
//
// M7: named `...ServerOnly` so it can't be mistaken for a client-callable
// function and so accidental imports from client code stand out in review.
export async function getDecryptedRepoTokenServerOnly(
  userId: string,
  provider: "github" | "gitlab",
  label = "default",
): Promise<string | null> {
  const supabase = await serverSupabase();
  const { decryptSecret } = await encryption();
  const { data, error } = await supabase
    .from("vault_secrets")
    .select("encrypted_token, iv, auth_tag")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("label", label)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return decryptSecret({
    ciphertext: data.encrypted_token,
    iv: data.iv,
    authTag: data.auth_tag,
  });
}
