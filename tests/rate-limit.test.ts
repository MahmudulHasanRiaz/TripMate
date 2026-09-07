import { describe, it, expect } from "vitest";
import { SlidingWindowRateLimiter, checkRateLimit } from "@/lib/rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows up to limit requests within the window", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.check("ip-1", 1000).allowed).toBe(true);
    expect(rl.check("ip-1", 2000).allowed).toBe(true);
    expect(rl.check("ip-1", 3000).allowed).toBe(true);
    expect(rl.check("ip-1", 4000).allowed).toBe(false);
  });

  it("allows again after the window slides past old hits", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 2, windowMs: 10_000 });
    rl.check("ip-1", 1000);
    rl.check("ip-1", 2000);
    expect(rl.check("ip-1", 3000).allowed).toBe(false);
    expect(rl.check("ip-1", 11_500).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(rl.check("a", 1000).allowed).toBe(true);
    expect(rl.check("b", 1000).allowed).toBe(true);
    expect(rl.check("a", 2000).allowed).toBe(false);
  });

  it("reports remaining count", () => {
    const rl = new SlidingWindowRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.check("k", 1000).remaining).toBe(2);
    expect(rl.check("k", 2000).remaining).toBe(1);
  });
});

describe("checkRateLimit (async, Upstash-agnostic fallback)", () => {
  it("falls back to the per-process window when Upstash is unset", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const r1 = await checkRateLimit("k", { limit: 2, windowMs: 60_000 });
    const r2 = await checkRateLimit("k", { limit: 2, windowMs: 60_000 });
    const r3 = await checkRateLimit("k", { limit: 2, windowMs: 60_000 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(false);
  });

  it("counts every call on the fallback path (each check is a hit)", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    // No Upstash → no in-flight dedup: each call counts, exactly like two
    // separate requests would. (The dedup guard only wraps the shared
    // Redis path, where one request firing two identical checks must not
    // double-count against the GLOBAL budget.)
    const a = await checkRateLimit("burst", { limit: 1, windowMs: 60_000 });
    const b = await checkRateLimit("burst", { limit: 1, windowMs: 60_000 });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(false);
  });

  it("isolates keys and opts on the fallback path", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const a = await checkRateLimit("iso", { limit: 1, windowMs: 60_000 });
    const b = await checkRateLimit("iso", { limit: 2, windowMs: 60_000 });
    const c = await checkRateLimit("other", { limit: 1, windowMs: 60_000 });
    expect(a.allowed && b.allowed && c.allowed).toBe(true);
  });
});
