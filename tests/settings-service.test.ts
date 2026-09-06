import { describe, expect, it, vi } from "vitest";
import "dotenv/config";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so this suite actually runs under vitest's node env when
// RUN_DB_INTEGRATION=1 — the same pattern as the other module integration
// suites (bookings/payments/expenses). dotenv/config loads DATABASE_URL (and
// friends) before the db client's env validation runs at import time.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the settings service. The drizzle client
// connects against process.env.DATABASE_URL at module load, and local
// `vitest run` has no database, so this suite is OFF by default. Plan 7 CI adds
// an isolated-Postgres job and flips it on with RUN_DB_INTEGRATION=1.
//
// For this task the gate is typecheck-only: tsconfig includes tests/**, so the
// dynamic imports below pull src/modules/settings/service.ts — its getSetting
// overloads and the setSetting(...).onConflictDoUpdate(...) write shape against
// the real settings schema — into `tsc --noEmit`. Nothing here loads the DB
// client while the suite is skipped.
const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("settings service (integration — Postgres)", () => {
  it("getSetting('site') returns a SiteSetting or null", async () => {
    const { getSetting } = await import("@/modules/settings/service");
    const site = await getSetting("site");
    // Overload contract: a non-null 'site' row is shaped like SiteSetting.
    expect(site === null || typeof site.title === "string").toBe(true);
  });

  it("setSetting upserts by key (onConflictDoUpdate)", async () => {
    const service = await import("@/modules/settings/service");
    await service.setSetting("site", {
      title: "TripMate", logoUrl: "", faviconUrl: "",
      searchEngineVisibility: true, phone: "", email: "", address: "",
    });
    const site = await service.getSetting("site");
    expect(site?.title).toBe("TripMate");
  });
});
