import { describe, it, expect, afterEach, vi } from "vitest";

import { seoVisibilityDecision } from "@/lib/seo";

const VALID_SECRET = "a".repeat(32);

const STUB_KEYS = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: VALID_SECRET,
} as const;

/**
 * origin() reads getEnv(), which memoises parseEnv(process.env) at first call.
 * resetModules + a fresh dynamic import give each test its own module graph so
 * the cache never leaks between cases; stubEnv restores process.env afterwards.
 */
async function freshOrigin(appUrl: string): Promise<() => string> {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", STUB_KEYS.DATABASE_URL);
  vi.stubEnv("AUTH_SECRET", STUB_KEYS.AUTH_SECRET);
  vi.stubEnv("APP_URL", appUrl);
  const { origin } = await import("@/lib/seo");
  return origin;
}

describe("lib/seo origin()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns APP_URL unchanged when it has no trailing slash", async () => {
    const origin = await freshOrigin("https://tripmate.example");
    expect(origin()).toBe("https://tripmate.example");
  });

  it("collapses trailing slashes so path concatenation never double-separates", async () => {
    const origin = await freshOrigin("https://tripmate.example/");
    expect(origin()).toBe("https://tripmate.example");
    expect(`${origin()}/sitemap.xml`).toBe(
      "https://tripmate.example/sitemap.xml",
    );
  });

  it("collapses repeated trailing slashes", async () => {
    const origin = await freshOrigin("https://tripmate.example///");
    expect(origin()).toBe("https://tripmate.example");
  });
});

// Pure decision helper for the settings.site searchEngineVisibility flag —
// the ONE place robots.ts and sitemap.ts both consult (Plan 6 T3), so the two
// special routes can never disagree. The routes themselves are DB-dependent
// (they read getPublicSiteSettings through the settings cache tag) and stay
// uncovered here — a documented gap: typecheck pins their wiring, and there
// is no robots/sitemap e2e suite today.
describe("lib/seo seoVisibilityDecision()", () => {
  it("visible=true keeps the public-allow rules and the sitemap entries", () => {
    const decision = seoVisibilityDecision(true);
    expect(decision.robots).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/setup"],
    });
    expect(decision.includeSitemapUrls).toBe(true);
  });

  it("visible=false disallows everything for all agents and empties the sitemap", () => {
    const decision = seoVisibilityDecision(false);
    // A single `Disallow: /` with NO allow key — nothing is permitted.
    expect(decision.robots).toEqual({ userAgent: "*", disallow: "/" });
    expect(decision.robots).not.toHaveProperty("allow");
    expect(decision.includeSitemapUrls).toBe(false);
  });

  it("keeps the two halves of the decision in lockstep for both flags", () => {
    // The pairing is the contract: a hidden site is hidden in BOTH routes, a
    // visible site is enumerated in BOTH — never mixed.
    expect(seoVisibilityDecision(true).includeSitemapUrls).toBe(true);
    expect(seoVisibilityDecision(false).includeSitemapUrls).toBe(false);
  });
});
