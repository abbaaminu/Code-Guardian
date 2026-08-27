import { describe, expect, it } from "vitest";
import { PerUserRateLimiter, TokenBucket } from "./rate-limiter";

describe("TokenBucket", () => {
  it("allows up to capacity tokens immediately, then denies", () => {
    const bucket = new TokenBucket({ capacity: 3, refillPerSecond: 1 });
    expect(bucket.tryTake(0)).toBe(true);
    expect(bucket.tryTake(0)).toBe(true);
    expect(bucket.tryTake(0)).toBe(true);
    expect(bucket.tryTake(0)).toBe(false);
  });

  it("refills proportionally to elapsed time", () => {
    const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 2 });
    expect(bucket.tryTake(0)).toBe(true);
    // 100ms elapsed -> 0.2 tokens: not enough.
    expect(bucket.tryTake(100)).toBe(false);
    // 400ms more -> +0.8 tokens: exactly 1 -> allowed.
    expect(bucket.tryTake(500)).toBe(true);
  });

  it("never refills past capacity", () => {
    const bucket = new TokenBucket({ capacity: 2, refillPerSecond: 10 });
    expect(bucket.tryTake(0)).toBe(true);
    expect(bucket.tryTake(0)).toBe(true);
    expect(bucket.tryTake(0)).toBe(false);
    // Long idle: refill is capped at capacity (2), so two takes max per burst.
    expect(bucket.tryTake(10_000)).toBe(true);
    expect(bucket.tryTake(10_001)).toBe(true);
    expect(bucket.tryTake(10_002)).toBe(false);
  });
});

describe("PerUserRateLimiter", () => {
  it("limits per key, not globally", () => {
    const limiter = new PerUserRateLimiter({ capacity: 1, refillPerSecond: 1 });
    expect(limiter.tryTake("alice", 0)).toBe(true);
    expect(limiter.tryTake("alice", 0)).toBe(false);
    // bob has their own untouched bucket.
    expect(limiter.tryTake("bob", 0)).toBe(true);
    expect(limiter.trackedUserCount).toBe(2);
  });

  it("prunes idle users so memory stays bounded", () => {
    const limiter = new PerUserRateLimiter(
      { capacity: 1, refillPerSecond: 1 },
      3,
      10_000,
    );
    limiter.tryTake("a", 0);
    limiter.tryTake("b", 0);
    limiter.tryTake("c", 0);
    expect(limiter.trackedUserCount).toBe(3);

    // Adding "d" at t=50_000 exceeds the cap: "a"/"b"/"c" are all idle (50s >
    // 10s timeout) so they are pruned before the new bucket is created.
    limiter.tryTake("d", 50_000);
    expect(limiter.trackedUserCount).toBe(1);
  });

  it("keeps a recently-active user's bucket alive", () => {
    const limiter = new PerUserRateLimiter(
      { capacity: 1, refillPerSecond: 1 },
      2,
      10_000,
    );
    limiter.tryTake("a", 0);
    limiter.tryTake("b", 0);
    // "a" was used at t=5_000 (still within the idle timeout at t=9_000).
    limiter.tryTake("a", 5_000);
    limiter.tryTake("c", 9_000);
    expect(limiter.trackedUserCount).toBeLessThanOrEqual(2);
  });
});
