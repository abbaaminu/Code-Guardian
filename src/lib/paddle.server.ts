export type PaidTier = "starter" | "pro";

export function paddlePriceIdForTier(tier: PaidTier): string {
  const priceId =
    tier === "starter"
      ? process.env.PADDLE_STARTER_PRICE_ID
      : process.env.PADDLE_PRO_PRICE_ID;
  if (!priceId) {
    throw new Error(
      `Missing Paddle price ID for ${tier}. Configure PADDLE_${tier.toUpperCase()}_PRICE_ID.`,
    );
  }
  return priceId;
}

export function paddleTierForPriceId(priceId: string): PaidTier | null {
  if (
    process.env.PADDLE_STARTER_PRICE_ID &&
    priceId === process.env.PADDLE_STARTER_PRICE_ID
  ) {
    return "starter";
  }
  if (
    process.env.PADDLE_PRO_PRICE_ID &&
    priceId === process.env.PADDLE_PRO_PRICE_ID
  ) {
    return "pro";
  }
  return null;
}

export function paddleApiBaseUrl(): string {
  return process.env.PADDLE_ENVIRONMENT === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}
