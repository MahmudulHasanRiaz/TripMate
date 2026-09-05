import { describe, it, expect, vi } from "vitest";
import { withGuard } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";

// guard.ts is server-only (throws outside a React Server runtime); stub the
// marker so the module imports cleanly under vitest's node env.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth-helpers", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { getSession } from "@/lib/auth-helpers";
const mockSession = getSession as ReturnType<typeof vi.fn>;

const staffSession = {
  user: { id: "u1", email: "s@x.com", name: "S", role: "staff", phone: null },
  session: { id: "s1", userId: "u1", expiresAt: new Date() },
} as unknown as Session;

describe("withGuard", () => {
  it("runs public actions without session", async () => {
    mockSession.mockResolvedValue(null);
    const fn = withGuard({ public: true }, async (x: number) => x * 2);
    expect(await fn(21)).toBe(42);
  });

  it("blocks non-public actions without session", async () => {
    mockSession.mockResolvedValue(null);
    const fn = withGuard({}, async () => 1);
    await expect(fn(null)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks missing permission", async () => {
    mockSession.mockResolvedValue(staffSession);
    const fn = withGuard({ permission: "users.manage" }, async () => 1);
    await expect(fn(null)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows when permission held", async () => {
    mockSession.mockResolvedValue(staffSession);
    const fn = withGuard({ permission: "leads.manage" }, async () => "ok");
    expect(await fn(null)).toBe("ok");
  });

  it("rate limits per key", async () => {
    mockSession.mockResolvedValue(staffSession);
    const fn = withGuard(
      { public: true, rateLimit: { limit: 2, windowMs: 60_000 } },
      async () => "ok",
    );
    expect(await fn(null, "k1")).toBe("ok");
    expect(await fn(null, "k1")).toBe("ok");
    await expect(fn(null, "k1")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(await fn(null, "k2")).toBe("ok");
  });
});
