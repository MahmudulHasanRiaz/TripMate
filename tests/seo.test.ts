import { describe, it, expect, afterEach, vi } from "vitest";

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
