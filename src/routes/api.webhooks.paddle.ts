import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { z } from "zod";
import { paddleTierForPriceId } from "@/lib/paddle.server";
import { verifyPaddleSignature } from "@/lib/paddle-signature.server";

const PaddlePayload = z
  .object({
    event_id: z.string().min(1),
    event_type: z.enum([
      "subscription.created",
      "subscription.updated",
      "subscription.canceled",
    ]),
    occurred_at: z.string().datetime(),
    data: z
      .object({
        id: z.string().min(1),
        customer_id: z.string().nullable().optional(),
        status: z.string().min(1),
        custom_data: z
          .object({ user_id: z.string().uuid().optional() })
          .passthrough()
          .nullable()
          .optional(),
        items: z
          .array(z.object({ price: z.object({ id: z.string().min(1) }) }))
          .optional(),
        current_billing_period: z
          .object({ starts_at: z.string().datetime() })
          .nullable()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const Route = createFileRoute("/api/webhooks/paddle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PADDLE_WEBHOOK_SECRET;
        if (!secret) {
          console.error(
            "[paddle webhook] PADDLE_WEBHOOK_SECRET is not configured.",
          );
          return new Response("Webhook not configured", { status: 503 });
        }

        const rawBody = await request.text();
        if (
          !verifyPaddleSignature(
            rawBody,
            request.headers.get("paddle-signature"),
            secret,
          )
        ) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: z.infer<typeof PaddlePayload>;
        try {
          payload = PaddlePayload.parse(JSON.parse(rawBody));
        } catch {
          return new Response("Invalid Paddle event payload", { status: 400 });
        }

        try {
          const { supabaseAdmin } =
            await import("@/integrations/supabase/client.server");
          const { data: existingEvent, error: eventLookupError } =
            await supabaseAdmin
              .from("webhook_events")
              .select("event_id")
              .eq("event_id", payload.event_id)
              .maybeSingle();
          if (eventLookupError) throw new Error(eventLookupError.message);
          if (existingEvent) return new Response("ok", { status: 200 });

          const priceId = payload.data.items?.[0]?.price.id;
          const tier = priceId ? paddleTierForPriceId(priceId) : null;
          if (
            payload.event_type !== "subscription.canceled" &&
            (!priceId || !tier)
          ) {
            console.warn(
              `[paddle webhook] Ignoring subscription event with unconfigured price (event ${payload.event_id}).`,
            );
            return new Response("Unconfigured subscription price", {
              status: 202,
            });
          }

          const { data: applied, error } = await supabaseAdmin.rpc(
            "apply_paddle_subscription_event",
            {
              p_event_id: payload.event_id,
              p_event_type: payload.event_type,
              p_user_id: payload.data.custom_data?.user_id ?? null,
              p_subscription_id: payload.data.id,
              p_customer_id: payload.data.customer_id ?? null,
              p_price_id: priceId ?? null,
              p_tier: tier,
              p_status: payload.data.status,
              p_period_start:
                payload.data.current_billing_period?.starts_at ?? null,
              p_occurred_at: payload.occurred_at,
            },
          );
          if (error) throw new Error(error.message);
          if (!applied) {
            return new Response("Subscription is not linked to a user", {
              status: 422,
            });
          }
          return new Response("ok", { status: 200 });
        } catch (error) {
          console.error("[paddle webhook] Failed to apply event:", error);
          return new Response("Failed to process Paddle event", {
            status: 500,
          });
        }
      },
    },
  },
});
