import { describe, expect, it, vi } from "vitest";
import "dotenv/config";
import { listingInput, categoryInput, destinationInput } from "@/modules/catalog/validation";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite can actually run under vitest's node env when
// RUN_DB_INTEGRATION=1. Same pattern as tests/guard.test.ts.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the catalog service. The drizzle client
// connects against process.env.DATABASE_URL at module load, so local
// `vitest run` (no database) keeps this suite OFF — same contract as
// tests/settings-service.test.ts. Plan 7 CI flips it on with RUN_DB_INTEGRATION=1
// against an isolated Postgres.
const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("catalog service (integration — Postgres)", () => {
  it("lists published listings with refs and pagination", async () => {
    const { listPublishedListings } = await import("@/modules/catalog/service");
    const { items, total } = await listPublishedListings({
      search: "hajj",
      categorySlug: "hajj",
      page: 1,
      perPage: 12,
    });
    expect(Array.isArray(items)).toBe(true);
    expect(typeof total).toBe("number");
    for (const l of items) {
      expect(l.status).toBe("published");
      expect(typeof l.price).toBe("number");
      expect(l.category.name.length).toBeGreaterThan(0);
    }
  });

  it("returns null for an unknown published slug", async () => {
    const { getListingBySlug } = await import("@/modules/catalog/service");
    expect(await getListingBySlug("definitely-not-a-real-slug")).toBeNull();
  });

  it("lists categories/destinations honoring the active filter", async () => {
    const { listCategories, listDestinations } = await import("@/modules/catalog/service");
    const cats = await listCategories(true);
    expect(cats.every((c) => c.isActive)).toBe(true);
    const all = await listCategories(false);
    expect(all.length).toBeGreaterThanOrEqual(cats.length);
    expect((await listDestinations()).every((d) => d.isActive)).toBe(true);
  });

  it("upserts and soft-deletes a listing (slug conflict is typed)", async () => {
    const service = await import("@/modules/catalog/service");
    const { eq } = await import("drizzle-orm");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { db } = await import("@/db/client");
    // Pre-run purge (a failed/aborted run leaves soft-deleted rows behind; a
    // unique slug would then collide on the next insert).
    await db.delete(listings).where(eq(listings.slug, "integration-test-package"));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-pkg"));

    const cat = await service.upsertCategory(
      categoryInput.parse({ name: "Integration Pkg", slug: "integration-pkg", kind: "package" }),
    );
    const parsed = listingInput.safeParse({
      categoryId: cat.id,
      title: "Integration Test Package",
      slug: "integration-test-package",
      price: "99000",
      currency: "BDT",
      summary: "Round-trip via upsertListing.",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const saved = await service.upsertListing(parsed.data);
    expect(saved.slug).toBe("integration-test-package");

    await expect(
      service.upsertListing({ ...parsed.data, id: undefined }),
    ).rejects.toMatchObject({ code: "SLUG_CONFLICT" });

    const again = await service.upsertListing({ ...parsed.data, id: saved.id });
    expect(again.id).toBe(saved.id);

    await expect(service.softDeleteListing(saved.id)).resolves.toBe(true);
    expect(await service.getListingById(saved.id)).toBeNull();

    // Hard-cleanup so the shared dev DB stays tidy across runs.
    await db.delete(listings).where(eq(listings.slug, saved.slug));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-pkg"));
  });

  it("refuses to soft-delete a referenced category/destination", async () => {
    const service = await import("@/modules/catalog/service");
    const { eq } = await import("drizzle-orm");
    const { listings, serviceCategories, destinations } = await import("@/modules/catalog/schema");
    const { db } = await import("@/db/client");
    // Pre-run purge for idempotency (see sibling test).
    await db.delete(listings).where(eq(listings.slug, "referencing-listing"));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-cats"));
    await db.delete(destinations).where(eq(destinations.slug, "integration-land"));

    const cat = await service.upsertCategory(
      categoryInput.parse({ name: "Integration Cats", slug: "integration-cats", kind: "package" }),
    );
    const dest = await service.upsertDestination(
      destinationInput.parse({ name: "Integration Land", slug: "integration-land" }),
    );

    const listing = listingInput.parse({
      categoryId: cat.id,
      destinationId: dest.id,
      title: "Referencing Listing",
      slug: "referencing-listing",
      price: "1",
    });
    const saved = await service.upsertListing(listing);

    await expect(service.softDeleteCategory(cat.id)).rejects.toMatchObject({ code: "IN_USE" });
    await expect(service.softDeleteDestination(dest.id)).rejects.toMatchObject({ code: "IN_USE" });

    // Hard-cleanup so the shared dev DB stays tidy across runs.
    await db.delete(listings).where(eq(listings.slug, saved.slug));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-cats"));
    await db.delete(destinations).where(eq(destinations.slug, "integration-land"));
  });
});
