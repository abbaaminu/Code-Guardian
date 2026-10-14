import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paddleTierForPriceId } from "./paddle.server";
import { verifyPaddleSignature } from "./paddle-signature.server";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Paddle billing helpers", () => {
  it("maps only configured Paddle price IDs", () => {
    vi.stubEnv("PADDLE_STARTER_PRICE_ID", "pri_starter");
    vi.stubEnv("PADDLE_PRO_PRICE_ID", "pri_pro");

    expect(paddleTierForPriceId("pri_starter")).toBe("starter");
    expect(paddleTierForPriceId("pri_pro")).toBe("pro");
    expect(paddleTierForPriceId("pri_unknown")).toBeNull();
  });

  it("accepts a valid recent Paddle signature and rejects altered or stale bodies", () => {
    const timestamp = "1791972000";
    const now = Number(timestamp);
    const secret = "webhook-secret-for-test";
    const body = '{"event_id":"evt_123"}';
    const digest = createHmac("sha256", secret)
      .update(`${timestamp}:${body}`)
      .digest("hex");
    const signature = `ts=${timestamp};h1=${digest}`;

    expect(verifyPaddleSignature(body, signature, secret, now)).toBe(true);
    expect(verifyPaddleSignature(`${body} `, signature, secret, now)).toBe(
      false,
    );
    expect(
      verifyPaddleSignature(body, signature, secret, now + 5 * 60 + 1),
    ).toBe(false);
  });
});
