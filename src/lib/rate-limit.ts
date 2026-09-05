export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private opts: RateLimitOptions) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.opts.windowMs;
    const hits = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (hits.length >= this.opts.limit) {
      this.hits.set(key, hits);
      return { allowed: false, remaining: 0 };
    }

    hits.push(now);
    this.hits.set(key, hits);
    return { allowed: true, remaining: this.opts.limit - hits.length };
  }
}
