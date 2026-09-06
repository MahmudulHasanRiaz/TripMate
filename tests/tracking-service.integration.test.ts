import { describe, expect, it, vi, afterEach } from "vitest";
import "dotenv/config";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite can actually run under vitest's node env when
// RUN_DB_INTEGRATION=1 — same pattern as tests/catalog-service.integration.test.ts.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the tracking service. The drizzle client
// connects against process.env.DATABASE_URL at module load, so local
// `vitest run` (no database) keeps this suite OFF — same contract as
// tests/settings-service.test.ts. Plan 7 CI flips it on with RUN_DB_INTEGRATION=1
// against an isolated Postgres.
const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("tracking service (integration — Postgres)", () => {
  // Unique-per-run anon marker so parallel/leftover rows can never be picked up
  // by another run or a failed previous run.
  const marker = `it-tracking-${Date.now().toString(36)}${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;

  const purge = async () => {
    const { db } = await import("@/db/client");
    const { trackingEvents } = await import("@/modules/tracking/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(trackingEvents).where(eq(trackingEvents.anonId, marker));
  };
  afterEach(async () => {
    // Best-effort: a failed cleanup must not fail a passing test nor strand a
    // row for the next test. Pre-run purge below keeps the suites independent.
    await purge().catch(() => {});
  });

  it("logTrackingEvent → listTrackingEvents round-trips and feeds counts", async () => {
    const { logTrackingEvent, listTrackingEvents, getTrackingEventCounts } =
      await import("@/modules/tracking/service");

    // Pre-run purge — a failed/aborted run leaves rows behind.
    await purge();
    const { id } = await logTrackingEvent({
      eventName: "Lead",
      anonId: marker,
      sourceUrl: "https://tripmate.example/contact",
      referrer: "https://www.facebook.com/",
      fbParams: { fbclid: "abc-123" },
      capiStatus: "sent",
      capiResponse: { ok: true, status: 200 },
    });
    expect(id).toBeTruthy();

    const page = await listTrackingEvents({ search: marker, eventName: "Lead" });
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      id,
      eventName: "Lead",
      anonId: marker,
      capiStatus: "sent",
      sourceUrl: "https://tripmate.example/contact",
    });
    expect(page.items[0].fbParams).toEqual({ fbclid: "abc-123" });

    const counts = await getTrackingEventCounts();
    expect(counts.total).toBeGreaterThan(0);
    expect(Array.isArray(counts.byStatus)).toBe(true);
    expect(counts.byEventName.some((r) => r.eventName === "Lead")).toBe(true);
  });

  it("trackCapiEvent persists the row then records meta_not_configured when Meta env is unset", async () => {
    const { trackCapiEvent } = await import("@/modules/tracking/service");
    const { db } = await import("@/db/client");
    const { trackingEvents } = await import("@/modules/tracking/schema");
    const { eq } = await import("drizzle-orm");

    // Pre-run purge — a failed/aborted run leaves rows behind.
    await purge();
    // Force the not-configured short-circuit so the send makes no network call
    // (and the test never depends on live Meta credentials).
    delete process.env.META_PIXEL_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;
    delete process.env.META_CAPI_TEST_CODE;

    const res = await trackCapiEvent(
      {
        eventName: "Lead",
        user: { email: "a@b.com" },
        customData: { value: 5 },
      },
      {
        anonId: marker,
        sourceUrl: "https://tripmate.example/lead",
        fbParams: { fbclid: "x" },
      },
    );
    expect(res.capiStatus).toBe("meta_not_configured");
    expect(res.eventId).toBeTruthy();

    const rows = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.anonId, marker));
    expect(rows).toHaveLength(1);
    expect(rows[0].capiStatus).toBe("meta_not_configured");
    const capiResponse = rows[0].capiResponse as { error?: string } | null;
    expect(capiResponse?.error).toBe("meta_not_configured");
  });
});
