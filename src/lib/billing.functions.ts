import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { paddleApiBaseUrl, paddlePriceIdForTier } from "@/lib/paddle.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const CheckoutInput = z.object({
  tier: z.enum(["starter", "pro"]),
});

export const createPaddleCheckout = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: unknown) => CheckoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("Missing PADDLE_API_KEY");

    const response = await fetch(`${paddleApiBaseUrl()}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Paddle-Version": "1",
      },
      body: JSON.stringify({
        items: [{ price_id: paddlePriceIdForTier(data.tier), quantity: 1 }],
        custom_data: { user_id: context.userId },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`Paddle checkout failed [${response.status}]: ${detail}`);
    }

    const result: unknown = await response.json();
    const checkoutUrl =
      typeof result === "object" &&
      result !== null &&
      "data" in result &&
      typeof result.data === "object" &&
      result.data !== null &&
      "checkout" in result.data &&
      typeof result.data.checkout === "object" &&
      result.data.checkout !== null &&
      "url" in result.data.checkout &&
      typeof result.data.checkout.url === "string"
        ? result.data.checkout.url
        : null;
    if (!checkoutUrl) {
      throw new Error("Paddle did not return a checkout URL.");
    }

    const parsedUrl = new URL(checkoutUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      !["checkout.paddle.com", "sandbox-checkout.paddle.com"].includes(
        parsedUrl.hostname,
      )
    ) {
      throw new Error("Paddle returned an invalid checkout URL.");
    }

    return { checkoutUrl };
  });

export const getAuditQuota = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_audit_quota", {
      p_user_id: context.userId,
    });
    if (error) throw new Error(`Unable to load audit quota: ${error.message}`);
    if (
      !data ||
      typeof data !== "object" ||
      !("tier" in data) ||
      (data.tier !== "free" &&
        data.tier !== "starter" &&
        data.tier !== "pro") ||
      !("remaining" in data) ||
      typeof data.remaining !== "number" ||
      !Number.isInteger(data.remaining) ||
      data.remaining < 0
    ) {
      throw new Error("Supabase returned an invalid audit quota.");
    }

    return {
      tier: data.tier,
      remaining: data.remaining,
    };
  });
