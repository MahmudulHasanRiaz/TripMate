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

  it("refuses a full-replace upsert that would deactivate a referenced category/destination", async () => {
    const service = await import("@/modules/catalog/service");
    const { eq } = await import("drizzle-orm");
    const { listings, serviceCategories, destinations } = await import("@/modules/catalog/schema");
    const { db } = await import("@/db/client");
    const { categoryInput, destinationInput, listingInput } = await import("@/modules/catalog/validation");
    // Pre-run purge for idempotency.
    await db.delete(listings).where(eq(listings.slug, "edit-inuse-listing"));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-edit-inuse"));
    await db.delete(destinations).where(eq(destinations.slug, "integration-edit-inuse-land"));

    const cat = await service.upsertCategory(
      categoryInput.parse({ name: "Edit IN_USE", slug: "integration-edit-inuse", kind: "package" }),
    );
    const dest = await service.upsertDestination(
      destinationInput.parse({ name: "Edit IN_USE Land", slug: "integration-edit-inuse-land" }),
    );
    const saved = await service.upsertListing(
      listingInput.parse({
        categoryId: cat.id,
        destinationId: dest.id,
        title: "Edit IN_USE Listing",
        slug: "edit-inuse-listing",
        price: "1",
      }),
    );

    // Deactivating via the EDIT path (not the trash path) is refused the same way.
    await expect(
      service.upsertCategory(
        categoryInput.parse({
          id: cat.id,
          name: "Edit IN_USE",
          slug: "integration-edit-inuse",
          kind: "package",
          isActive: false,
        }),
      ),
    ).rejects.toMatchObject({ code: "IN_USE" });
    await expect(
      service.upsertDestination(
        destinationInput.parse({
          id: dest.id,
          name: "Edit IN_USE Land",
          slug: "integration-edit-inuse-land",
          isActive: false,
        }),
      ),
    ).rejects.toMatchObject({ code: "IN_USE" });

    // Unreferenced rows may still be deactivated through the edit path.
    await service.softDeleteListing(saved.id);
    const deactivatedCat = await service.upsertCategory(
      categoryInput.parse({
        id: cat.id,
        name: "Edit IN_USE",
        slug: "integration-edit-inuse",
        kind: "package",
        isActive: false,
      }),
    );
    expect(deactivatedCat.isActive).toBe(false);
    const deactivatedDest = await service.upsertDestination(
      destinationInput.parse({
        id: dest.id,
        name: "Edit IN_USE Land",
        slug: "integration-edit-inuse-land",
        isActive: false,
      }),
    );
    expect(deactivatedDest.isActive).toBe(false);

    // Hard-cleanup so the shared dev DB stays tidy across runs.
    await db.delete(listings).where(eq(listings.slug, saved.slug));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-edit-inuse"));
    await db.delete(destinations).where(eq(destinations.slug, "integration-edit-inuse-land"));
  });

  it("refuses a listing save whose category/destination is missing or inactive (INVALID_REFERENCE)", async () => {
    const service = await import("@/modules/catalog/service");
    const { eq } = await import("drizzle-orm");
    const { listings, serviceCategories, destinations } = await import("@/modules/catalog/schema");
    const { db } = await import("@/db/client");
    const { categoryInput, destinationInput, listingInput } = await import("@/modules/catalog/validation");
    // Pre-run purge for idempotency (see sibling tests).
    await db.delete(listings).where(eq(listings.slug, "inactive-ref-listing"));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-inactive-cat"));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-active-cat"));
    await db.delete(destinations).where(eq(destinations.slug, "integration-inactive-land"));

    const inactiveCat = await service.upsertCategory(
      categoryInput.parse({
        name: "Inactive Cat",
        slug: "integration-inactive-cat",
        kind: "package",
        isActive: false,
      }),
    );
    const activeCat = await service.upsertCategory(
      categoryInput.parse({ name: "Active Cat", slug: "integration-active-cat", kind: "package" }),
    );
    const inactiveDest = await service.upsertDestination(
      destinationInput.parse({ name: "Inactive Land", slug: "integration-inactive-land", isActive: false }),
    );

    await expect(
      service.upsertListing(
        listingInput.parse({
          categoryId: inactiveCat.id,
          title: "Inactive-ref Listing",
          slug: "inactive-ref-listing",
          price: "1",
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });

    await expect(
      service.upsertListing(
        listingInput.parse({
          categoryId: activeCat.id,
          destinationId: inactiveDest.id,
          title: "Inactive-ref Listing",
          slug: "inactive-ref-listing",
          price: "1",
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });

    // An unknown category id is refused the same way.
    await expect(
      service.upsertListing(
        listingInput.parse({
          categoryId: "00000000-0000-4000-8000-000000000000",
          title: "Inactive-ref Listing",
          slug: "inactive-ref-listing",
          price: "1",
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });

    await db.delete(listings).where(eq(listings.slug, "inactive-ref-listing"));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-inactive-cat"));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-active-cat"));
    await db.delete(destinations).where(eq(destinations.slug, "integration-inactive-land"));
  });

  it("auto-suffixes a new listing slug when the base is only soft-deleted", async () => {
    const service = await import("@/modules/catalog/service");
    const { eq } = await import("drizzle-orm");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { db } = await import("@/db/client");
    const { categoryInput, listingInput } = await import("@/modules/catalog/validation");
    // Pre-run purge for idempotency.
    for (const slug of ["recycle-package", "recycle-package-2", "recycle-package-3"]) {
      await db.delete(listings).where(eq(listings.slug, slug));
    }
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-recycle"));

    const cat = await service.upsertCategory(
      categoryInput.parse({ name: "Recycle", slug: "integration-recycle", kind: "package" }),
    );
    const base = listingInput.parse({
      categoryId: cat.id,
      title: "Recycle Package",
      slug: "recycle-package",
      price: "1",
    });

    const first = await service.upsertListing(base);
    expect(first.slug).toBe("recycle-package");

    // Base is held by a LIVE row → a second identical insert is still a typed conflict.
    await expect(service.upsertListing({ ...base, id: undefined })).rejects.toMatchObject({
      code: "SLUG_CONFLICT",
    });

    await service.softDeleteListing(first.id);
    // Now the base slug belongs to a soft-deleted row → insert auto-suffixes.
    const recreated = await service.upsertListing({ ...base, id: undefined });
    expect(recreated.slug).toBe("recycle-package-2");

    // Recreate again after trashing that one: climbs to the next free suffix.
    await service.softDeleteListing(recreated.id);
    const third = await service.upsertListing({ ...base, id: undefined });
    expect(third.slug).toBe("recycle-package-3");

    for (const slug of ["recycle-package", "recycle-package-2", "recycle-package-3"]) {
      await db.delete(listings).where(eq(listings.slug, slug));
    }
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, "integration-recycle"));
  });
});
