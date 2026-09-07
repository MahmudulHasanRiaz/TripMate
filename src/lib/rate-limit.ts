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

/**
 * Upstash Redis REST limiter — the multi-instance / serverless switch.
 *
 * The in-memory SlidingWindowRateLimiter is per-process: on Vercel each
 * lambda invocation gets its own map, so limits are per-instance, not
 * global. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN and the
 * async checkRateLimit() below routes every check through a shared
 * fixed-window counter in Redis instead. Implemented against the REST
 * pipeline directly with fetch — no SDK dependency.
 *
 * Fails OPEN on Redis errors: a limits outage must not take public forms
 * down; the per-process sliding window still applies as the fallback.
 *
 * To adopt: in guard.ts, replace the synchronous limiter.check(key) call
 * with `await checkRateLimit(key, opts)` inside its async paths. Until
 * that wiring lands, this module is additive and unused — kept complete so
 * the switch is a two-line change.
 */
const UPSTASH_URL = () => process.env.UPSTASH_REDIS_REST_URL?.trim() || null;
const UPSTASH_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || null;

export function upstashConfigured(): boolean {
  return Boolean(UPSTASH_URL() && UPSTASH_TOKEN());
}

async function upstashIncr(
  key: string,
  windowSeconds: number,
): Promise<number | null> {
  const url = UPSTASH_URL();
  const token = UPSTASH_TOKEN();
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      // INCR + EXPIRE in one pipeline; EXPIRE uses NX so the window length
      // is set exactly once per key, at its first hit.
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSeconds), "NX"],
      ]),
      cache: "no-store",
      // Bound the call so slow Redis never stalls a guarded action.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Array<{ result: unknown }>;
    const incr = body[0]?.result;
    return typeof incr === "number" ? incr : null;
  } catch {
    return null; // fail-open
  }
}

/**
 * Async, deployment-agnostic check. Upstash when configured (shared across
 * instances); per-process sliding window otherwise (local dev, single
 * Docker container). Concurrent calls with the same key+opts share one
 * in-flight promise so a burst from one request doesn't double-count.
 */
const fallbackHits = new Map<string, number[]>();
const inflight = new Map<string, Promise<RateLimitResult>>();

function fallbackCheck(
  key: string,
  opts: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const windowStart = now - opts.windowMs;
  const mapKey = `${key}|${opts.limit}|${opts.windowMs}`;
  const hits = (fallbackHits.get(mapKey) ?? []).filter((t) => t > windowStart);

  if (hits.length >= opts.limit) {
    fallbackHits.set(mapKey, hits);
    return { allowed: false, remaining: 0 };
  }

  hits.push(now);
  fallbackHits.set(mapKey, hits);
  return { allowed: true, remaining: opts.limit - hits.length };
}

export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  if (!upstashConfigured()) {
    return fallbackCheck(key, opts);
  }

  const cacheKey = `${key}|${opts.limit}|${opts.windowMs}`;
  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const p = (async (): Promise<RateLimitResult> => {
    const windowSeconds = Math.max(1, Math.ceil(opts.windowMs / 1000));
    const count = await upstashIncr(`ratelimit:${cacheKey}`, windowSeconds);
    if (count === null) return fallbackCheck(key, opts);
    return {
      allowed: count <= opts.limit,
      remaining: Math.max(0, opts.limit - count),
    };
  })();

  inflight.set(cacheKey, p);
  const result = await p;
  inflight.delete(cacheKey);
  return result;
}
