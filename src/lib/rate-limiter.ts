// Per-user token-bucket rate limiter for expensive external calls (Gemini).
//
// WHY: `runScan`, `copilotRemediate`, and the autonomous agent all proxy to the
// Gemini API using the server's own key. Requiring a signed-in user stops
// anonymous abuse but not one account hammering the API and burning quota. A
// token bucket keyed by user id is a cheap, dependency-free ceiling until the
// queue/Redis infra from SECURITY_AUDIT.md §6 exists — swap this for a Redis
// counter (or BullMQ rate limiter) when that lands; the call sites just call
// `tryTake(userId)`, so swapping is localized.

export interface RateLimitOptions {
  /** Maximum number of calls allowed in a burst. */
  capacity: number;
  /** Continuous refill rate, in tokens per second. */
  refillPerSecond: number;
}

export class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;
  private lastUsedMs: number;

  constructor(private readonly options: RateLimitOptions) {
    // Buckets start full. lastRefillMs is seeded at 0 rather than Date.now()
    // so callers/tests can use synthetic timestamps; the first real call's
    // refill simply caps back to capacity, which is a no-op for a full bucket.
    this.tokens = options.capacity;
    this.lastRefillMs = 0;
    this.lastUsedMs = 0;
  }

  /**
   * Tries to consume one token. Refills proportionally to elapsed time first.
   * `nowMs` is injectable for deterministic tests.
   */
  tryTake(nowMs = Date.now()): boolean {
    this.refill(nowMs);
    this.lastUsedMs = nowMs;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** True if the bucket hasn't been touched within `timeoutMs`. */
  isIdle(nowMs: number, timeoutMs: number): boolean {
    return nowMs - this.lastUsedMs > timeoutMs;
  }

  private refill(nowMs: number): void {
    const elapsedSeconds = (nowMs - this.lastRefillMs) / 1000;
    if (elapsedSeconds <= 0) return;
    this.tokens = Math.min(
      this.options.capacity,
      this.tokens + elapsedSeconds * this.options.refillPerSecond,
    );
    this.lastRefillMs = nowMs;
  }
}

export class PerUserRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(
    private readonly options: RateLimitOptions,
    private readonly maxTrackedUsers = 10_000,
    private readonly idleTimeoutMs = 60 * 60 * 1000, // 1h of inactivity
  ) {}

  /**
   * Consumes one token for `key` (e.g. a Supabase user id). Returns false when
   * the user is over budget. Buckets are created lazily and pruned when the map
   * grows past `maxTrackedUsers` so memory stays bounded.
   */
  tryTake(key: string, nowMs = Date.now()): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxTrackedUsers) this.prune(nowMs);
      bucket = new TokenBucket(this.options);
      this.buckets.set(key, bucket);
    }
    return bucket.tryTake(nowMs);
  }

  /** Number of users currently tracked (exposed for tests/observability). */
  get trackedUserCount(): number {
    return this.buckets.size;
  }

  private prune(nowMs: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.isIdle(nowMs, this.idleTimeoutMs)) {
        this.buckets.delete(key);
      }
    }
    // If every tracked user is still active, evict the oldest-inserted bucket
    // rather than letting the map grow unbounded.
    if (this.buckets.size >= this.maxTrackedUsers) {
      const oldest = this.buckets.keys().next();
      if (!oldest.done) this.buckets.delete(oldest.value);
    }
  }
}

/**
 * Shared budget across every Gemini-backed server function. Per-user budget:
 * burst of 6 calls, then 1 token every 10s (~6 calls/min sustained). Tune to
 * your Gemini quota / plan — this is a ceiling against quota-burning abuse, not
 * a precise billing meter.
 */
export const geminiApiRateLimiter = new PerUserRateLimiter({
  capacity: 6,
  refillPerSecond: 1 / 10,
});
