import { describe, it, expect } from "vitest";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

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
