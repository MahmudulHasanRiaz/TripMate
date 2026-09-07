import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import "dotenv/config";
import {
  homeSettingsInputSchema,
  siteSettingsInputSchema,
} from "@/modules/settings/site-settings-validation";

// Pure-unit suite for the settings validation layer. No DB, no server-only
// imports — site-settings-validation.ts is zod-only so it runs anywhere (the
// same contract as the bookings/payments/expenses validation suites).

// site-settings.ts imports "server-only" (it throws outside a React Server
// runtime); stub the marker so the gated integration suite below can actually
// run under vitest's node env when RUN_DB_INTEGRATION=1 — the same pattern as
// the other module integration suites.
vi.mock("server-only", () => ({}));

const SEED_SITE_ROW = {
  title: "TripMate",
  logoUrl: "/logo.svg",
  faviconUrl: "/favicon.svg",
  searchEngineVisibility: true,
  phone: "+8801000000000",
  email: "info@tripmate.example",
  address: "Dhaka, Bangladesh",
};

function validSiteInput(overrides: Record<string, unknown> = {}) {
  return { ...SEED_SITE_ROW, ...overrides };
}

// ==============================================================================
// siteSettingsInputSchema
// ==============================================================================

describe("siteSettingsInputSchema", () => {
  it("accepts the seeded settings.site row as-is (the form must be able to re-save it)", () => {
    const parsed = siteSettingsInputSchema.safeParse(SEED_SITE_ROW);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("TripMate");
      expect(parsed.data.logoUrl).toBe("/logo.svg");
      expect(parsed.data.searchEngineVisibility).toBe(true);
    }
  });

  it("trims surrounding whitespace off every text field", () => {
    const parsed = siteSettingsInputSchema.safeParse(
      validSiteInput({ title: "  TripMate  ", phone: " +8801000000000 ", email: " a@b.example " }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("TripMate");
      expect(parsed.data.phone).toBe("+8801000000000");
      expect(parsed.data.email).toBe("a@b.example");
    }
  });

  it("enforces the title bounds (1-120 after trim)", () => {
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ title: "" })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ title: "   " })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ title: "a".repeat(120) })).success).toBe(true);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ title: "a".repeat(121) })).success).toBe(false);
    expect(
      siteSettingsInputSchema.safeParse(validSiteInput({ title: undefined })).success,
    ).toBe(false);
  });

  it("enforces the phone bounds (4-30)", () => {
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ phone: "+88" })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ phone: "+880" })).success).toBe(true);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ phone: "0".repeat(30) })).success).toBe(true);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ phone: "0".repeat(31) })).success).toBe(false);
  });

  it("requires a real email address", () => {
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ email: "info@tripmate.example" })).success).toBe(true);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ email: "not-an-email" })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ email: "" })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ email: undefined })).success).toBe(false);
  });

  it("allows an empty address but caps it at 300 characters", () => {
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ address: "" })).success).toBe(true);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ address: "a".repeat(300) })).success).toBe(true);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ address: "a".repeat(301) })).success).toBe(false);
  });

  describe("logoUrl / faviconUrl (url-or-empty)", () => {
    for (const field of ["logoUrl", "faviconUrl"] as const) {
      it(`${field}: accepts empty (cleared), internal paths and http(s) URLs`, () => {
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "" })).success).toBe(true);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "/logo.svg" })).success).toBe(true);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "/media/brand/x.png" })).success).toBe(true);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "https://cdn.example.com/logo.png" })).success).toBe(true);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "http://cdn.example.com/logo.png" })).success).toBe(true);
      });

      it(`${field}: refuses unsafe and malformed values`, () => {
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "javascript:alert(1)" })).success).toBe(false);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "data:text/html,x" })).success).toBe(false);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "//evil.example.com/logo.png" })).success).toBe(false);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: "logo.svg" })).success).toBe(false);
        expect(siteSettingsInputSchema.safeParse(validSiteInput({ [field]: undefined })).success).toBe(false);
      });
    }
  });

  it("searchEngineVisibility is a strict boolean (no string coercion)", () => {
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ searchEngineVisibility: false })).success).toBe(true);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ searchEngineVisibility: "false" })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ searchEngineVisibility: "true" })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ searchEngineVisibility: 1 })).success).toBe(false);
    expect(siteSettingsInputSchema.safeParse(validSiteInput({ searchEngineVisibility: undefined })).success).toBe(false);
  });

  describe("footerDescription (optional clearable text)", () => {
    it("absent, null and empty string are all valid", () => {
      expect(siteSettingsInputSchema.safeParse(validSiteInput({})).success).toBe(true);
      expect(siteSettingsInputSchema.safeParse(validSiteInput({ footerDescription: null })).success).toBe(true);
      expect(siteSettingsInputSchema.safeParse(validSiteInput({ footerDescription: "" })).success).toBe(true);
    });

    it("null normalizes to undefined (absent); an empty string stays an empty string (cleared)", () => {
      const fromNull = siteSettingsInputSchema.safeParse(validSiteInput({ footerDescription: null }));
      expect(fromNull.success).toBe(true);
      if (fromNull.success) expect(fromNull.data.footerDescription).toBeUndefined();

      const fromEmpty = siteSettingsInputSchema.safeParse(validSiteInput({ footerDescription: "" }));
      expect(fromEmpty.success).toBe(true);
      if (fromEmpty.success) expect(fromEmpty.data.footerDescription).toBe("");
    });

    it("caps at 500 characters and trims", () => {
      expect(siteSettingsInputSchema.safeParse(validSiteInput({ footerDescription: "a".repeat(500) })).success).toBe(true);
      expect(siteSettingsInputSchema.safeParse(validSiteInput({ footerDescription: "a".repeat(501) })).success).toBe(false);
      const parsed = siteSettingsInputSchema.safeParse(validSiteInput({ footerDescription: "  hello  " }));
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.footerDescription).toBe("hello");
    });
  });
});

// ==============================================================================
// homeSettingsInputSchema
// ==============================================================================

describe("homeSettingsInputSchema", () => {
  it("accepts an empty object (a partial save touching nothing)", () => {
    const parsed = homeSettingsInputSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("accepts the seeded settings.home row as-is", () => {
    const parsed = homeSettingsInputSchema.safeParse({
      heroHeadline: "Your Journey Begins Here",
      heroSub: "Hajj, Umrah, tours, flights & visa — one trusted agency.",
    });
    expect(parsed.success).toBe(true);
  });

  it("normalizes null to absent on every optional field", () => {
    const parsed = homeSettingsInputSchema.safeParse({
      heroHeadline: null,
      heroSub: null,
      heroImage: null,
      heroButtonLabel: null,
      heroButtonLink: null,
      heroImageAlt: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.heroHeadline).toBeUndefined();
      expect(parsed.data.heroButtonLink).toBeUndefined();
    }
  });

  it("keeps empty strings (cleared) distinct from absent fields", () => {
    const parsed = homeSettingsInputSchema.safeParse({ heroHeadline: "", heroButtonLink: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.heroHeadline).toBe("");
      expect(parsed.data.heroButtonLink).toBe("");
    }
  });

  it("enforces the text length bounds (160/300/40/160)", () => {
    expect(homeSettingsInputSchema.safeParse({ heroHeadline: "a".repeat(160) }).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ heroHeadline: "a".repeat(161) }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ heroSub: "a".repeat(300) }).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ heroSub: "a".repeat(301) }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ heroButtonLabel: "a".repeat(40) }).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ heroButtonLabel: "a".repeat(41) }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ heroImageAlt: "a".repeat(160) }).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ heroImageAlt: "a".repeat(161) }).success).toBe(false);
  });

  it("heroImage accepts empty, internal paths and http(s) URLs; refuses unsafe values", () => {
    expect(homeSettingsInputSchema.safeParse({ heroImage: "" }).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ heroImage: "/media/hero/cover.webp" }).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ heroImage: "https://cdn.example.com/hero.jpg" }).success).toBe(true);
    expect(homeSettingsInputSchema.safeParse({ heroImage: "javascript:alert(1)" }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ heroImage: "//evil.example.com/x.jpg" }).success).toBe(false);
    expect(homeSettingsInputSchema.safeParse({ heroImage: "hero.jpg" }).success).toBe(false);
  });

  describe("heroButtonLink (internal-path-or-url)", () => {
    it("accepts internal paths and full http(s) URLs", () => {
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "/packages" }).success).toBe(true);
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "/blog/hajj-guide?utm=x" }).success).toBe(true);
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "https://partner.example.com/tour" }).success).toBe(true);
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "http://partner.example.com/tour" }).success).toBe(true);
    });

    it("refuses protocol-relative, scheme-unsafe and bare-relative values", () => {
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "//evil.example.com" }).success).toBe(false);
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "javascript:alert(1)" }).success).toBe(false);
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "packages" }).success).toBe(false);
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "mailto:x@y.example" }).success).toBe(false);
    });

    it("caps at 200 characters", () => {
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "/x".padEnd(200, "a") }).success).toBe(true);
      expect(homeSettingsInputSchema.safeParse({ heroButtonLink: "/x".padEnd(201, "a") }).success).toBe(false);
    });
  });
});

// ==============================================================================
// Gated integration: update + read round-trip (Postgres)
// ==============================================================================

// DB-backed round-trip for the site/home services. The drizzle client connects
// against process.env.DATABASE_URL at module load, and local `vitest run` may
// have no database, so this suite is OFF by default — Plan 7 CI flips it on
// with RUN_DB_INTEGRATION=1. When it runs, the site/home rows are snapshotted
// in beforeAll and restored in afterAll so the dev DB is left as found.

const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("site settings round-trip (integration — Postgres)", () => {
  let originalSite: unknown;
  let originalHome: unknown;
  let setSettingRaw: (key: string, value: unknown) => Promise<void>;

  beforeAll(async () => {
    const raw = await import("@/modules/settings/service");
    originalSite = await raw.getSetting("site");
    originalHome = await raw.getSetting("home");
    setSettingRaw = raw.setSetting;
  });

  afterAll(async () => {
    // setSetting cannot delete a row, so a DB that started WITHOUT the row
    // keeps the test's row (the reads degrade to defaults either way).
    if (originalSite !== null && originalSite !== undefined) {
      await setSettingRaw("site", originalSite);
    }
    if (originalHome !== null && originalHome !== undefined) {
      await setSettingRaw("home", originalHome);
    }
  });

  it("updateSiteSettings persists the merged row and getSiteSettings reads it back", async () => {
    const svc = await import("@/modules/settings/site-settings");
    const saved = await svc.updateSiteSettings({
      title: "Round Trip Agency",
      phone: "+8801700000000",
      email: "ops@roundtrip.example",
      address: "Test Street 1",
      logoUrl: "",
      faviconUrl: "/favicon.svg",
      searchEngineVisibility: false,
      footerDescription: "Journeys, planned.",
    });
    expect(saved.searchEngineVisibility).toBe(false);

    const read = await svc.getSiteSettings();
    expect(read).toEqual({
      title: "Round Trip Agency",
      phone: "+8801700000000",
      email: "ops@roundtrip.example",
      address: "Test Street 1",
      logoUrl: "",
      faviconUrl: "/favicon.svg",
      searchEngineVisibility: false,
      footerDescription: "Journeys, planned.",
    });
  });

  it("an absent footerDescription preserves the stored value; an empty string clears it", async () => {
    const svc = await import("@/modules/settings/site-settings");
    const base = {
      title: "Round Trip Agency",
      phone: "+8801700000000",
      email: "ops@roundtrip.example",
      address: "Test Street 1",
      logoUrl: "",
      faviconUrl: "",
      searchEngineVisibility: true,
    };
    await svc.updateSiteSettings({ ...base, footerDescription: "Keep me" });
    await svc.updateSiteSettings({ ...base, footerDescription: undefined });
    expect((await svc.getSiteSettings()).footerDescription).toBe("Keep me");

    await svc.updateSiteSettings({ ...base, footerDescription: "" });
    expect((await svc.getSiteSettings()).footerDescription).toBeNull();
  });

  it("getSiteSettings merges defaults over a missing/partial site row (never null)", async () => {
    const svc = await import("@/modules/settings/site-settings");
    await setSettingRaw("site", { title: "Partial Co" });
    const site = await svc.getSiteSettings();
    expect(site.title).toBe("Partial Co");
    expect(site.searchEngineVisibility).toBe(true); // default, not undefined/null
    expect(site.phone).toBe("");
    expect(site.footerDescription).toBeNull();
  });

  it("updateHomeSettings partial-saves preserve untouched keys and clear on empty string", async () => {
    const svc = await import("@/modules/settings/site-settings");
    await svc.updateHomeSettings({ heroHeadline: "First headline", heroSub: "Sub stays" });
    await svc.updateHomeSettings({ heroHeadline: "Second headline" });

    let home = await svc.getHomeSettings();
    expect(home.heroHeadline).toBe("Second headline");
    expect(home.heroSub).toBe("Sub stays");

    await svc.updateHomeSettings({ heroSub: "" });
    home = await svc.getHomeSettings();
    expect(home.heroSub).toBeNull();
    expect(home.heroHeadline).toBe("Second headline");
  });

  it("getHomeSettings on a missing row returns all-null hero keys (never null itself)", async () => {
    const svc = await import("@/modules/settings/site-settings");
    await setSettingRaw("home", {});
    const home = await svc.getHomeSettings();
    expect(home).toEqual({
      heroHeadline: null,
      heroSub: null,
      heroImage: null,
      heroButtonLabel: null,
      heroButtonLink: null,
      heroImageAlt: null,
      featuredKicker: null,
      featuredTitle: null,
      featuredLead: null,
      ctaHeadline: null,
      ctaSub: null,
      stats: null,
      testimonials: null,
    });
  });
});
