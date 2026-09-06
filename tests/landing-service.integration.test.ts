import { afterEach, describe, expect, it, vi } from "vitest";
import "dotenv/config";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite can actually run under vitest's node env when
// RUN_DB_INTEGRATION=1 — same pattern as tests/leads-service.integration.test.ts.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the landing-pages service. The drizzle client
// connects against process.env.DATABASE_URL at module load, so local
// `vitest run` (no database) keeps this suite OFF — same contract as the other
// module integration suites.
const integration = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!integration)("landing service (integration — Postgres)", () => {
  // Unique-per-run marker so parallel/leftover rows can never be picked up by
  // another run or a failed previous run.
  const marker = `it-land-${Date.now().toString(36)}${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
  const conflictBase = marker;
  const conflictSlugs = [conflictBase, `${conflictBase}-2`, `${conflictBase}-3`];
  const showcaseSlug = `it-land-show-${marker}`;
  const statusSlug = `it-land-status-${marker}`;
  const landingSlugs = [...conflictSlugs, showcaseSlug, statusSlug];
  const categorySlug = `it-land-cat-${marker}`;
  const listingASlug = `it-land-pkg-a-${marker}`;
  const listingBSlug = `it-land-pkg-b-${marker}`;

  /** Hard-delete every row this suite may have created, so a passing or failed
   *  run never strands rows for the next run (unique slugs would then collide). */
  const purge = async () => {
    const { db } = await import("@/db/client");
    const { landingPages } = await import("@/modules/leads/schema");
    const { listings, serviceCategories } = await import("@/modules/catalog/schema");
    const { eq, inArray } = await import("drizzle-orm");

    await db.delete(landingPages).where(inArray(landingPages.slug, landingSlugs));
    await db.delete(listings).where(inArray(listings.slug, [listingASlug, listingBSlug]));
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, categorySlug));
  };
  afterEach(async () => {
    // Best-effort: a failed cleanup must not fail a passing test.
    await purge().catch(() => {});
  });

  const createCategory = async () => {
    const { db } = await import("@/db/client");
    const { serviceCategories } = await import("@/modules/catalog/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(serviceCategories).where(eq(serviceCategories.slug, categorySlug));
    const [row] = await db
      .insert(serviceCategories)
      .values({ name: `Integration Cat ${marker}`, slug: categorySlug, kind: "package" })
      .returning({ id: serviceCategories.id });
    return row.id;
  };

  /** A published listing (the catalog's publish predicate) in the given
   *  category, resolvable by a landing page's packageShowcase. */
  const createListing = async (
    categoryId: string,
    slug: string,
    title: string,
  ): Promise<string> => {
    const { db } = await import("@/db/client");
    const { listings } = await import("@/modules/catalog/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(listings).where(eq(listings.slug, slug));
    const [row] = await db
      .insert(listings)
      .values({
        categoryId,
        slug,
        title,
        status: "published",
        price: "95000",
        currency: "BDT",
        durationDays: 7,
        coverImage: { url: `https://cdn.example/${slug}.jpg`, alt: `${title} cover` },
      })
      .returning({ id: listings.id });
    return row.id;
  };

  const softDeleteListing = async (id: string) => {
    const { db } = await import("@/db/client");
    const { listings } = await import("@/modules/catalog/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(listings)
      .set({ deletedAt: new Date() })
      .where(eq(listings.id, id));
  };

  /** Service-layer landing-page create via the validated write surface. */
  const createLanding = async (
    slug: string,
    extra: { sections?: unknown[]; status?: "draft" | "published" } = {},
  ) => {
    const service = await import("@/modules/landing-pages/service");
    const { landingPageInput } = await import("@/modules/landing-pages/validation");
    const parsed = landingPageInput.parse({
      title: `Integration Landing ${marker}`,
      slug,
      sections: extra.sections ?? [
        { type: "hero", config: { headline: "Book now" } },
      ],
      status: extra.status ?? "draft",
    });
    return service.upsertLandingPage(parsed);
  };

  it("slug recovery: a soft-deleted slug auto-suffixes (-2/-3); a live slug conflicts", async () => {
    await purge();
    const service = await import("@/modules/landing-pages/service");

    const first = await createLanding(conflictBase);
    expect(first.slug).toBe(conflictBase);

    // A second create under the LIVE slug is a genuine typed conflict.
    await expect(createLanding(conflictBase)).rejects.toMatchObject({
      code: "SLUG_CONFLICT",
    });

    // After trashing, re-creating the base climbs the -2 suffix.
    await expect(service.softDeleteLandingPage(first.id)).resolves.toBe(true);
    const recreated = await createLanding(conflictBase);
    expect(recreated.slug).toBe(`${conflictBase}-2`);

    // Trash that too → the next re-create lands on -3.
    await expect(service.softDeleteLandingPage(recreated.id)).resolves.toBe(true);
    const third = await createLanding(conflictBase);
    expect(third.slug).toBe(`${conflictBase}-3`);
  });

  it("published read: hides drafts/soft-deleted pages and resolves packageShowcase to live cards", async () => {
    await purge();
    const service = await import("@/modules/landing-pages/service");

    const categoryId = await createCategory();
    const listingA = await createListing(categoryId, listingASlug, "Listing A");
    const listingB = await createListing(categoryId, listingBSlug, "Listing B");

    const landing = await createLanding(showcaseSlug, {
      status: "draft",
      sections: [
        { type: "hero", config: { headline: "Umrah 2026" } },
        { type: "packageShowcase", config: { listingIds: [listingA, listingB] } },
      ],
    });

    // Draft pages are not on /l/<slug>.
    expect(await service.getPublishedLandingBySlug(showcaseSlug)).toBeNull();

    await service.updateLandingStatus(landing.id, "published");

    const published = await service.getPublishedLandingBySlug(showcaseSlug);
    expect(published).not.toBeNull();
    const showcase = published?.sections.find((s) => s.type === "packageShowcase");
    expect(showcase).toBeDefined();
    if (!showcase || showcase.type !== "packageShowcase") return;
    // Both configured ids resolve into cards, author order preserved.
    expect(showcase.config.listingIds).toEqual([listingA, listingB]);
    expect(showcase.config.listings.map((l) => l.id)).toEqual([listingA, listingB]);
    const byId = new Map(showcase.config.listings.map((l) => [l.id, l]));
    expect(byId.get(listingA)).toMatchObject({
      slug: listingASlug,
      title: "Listing A",
      price: 95000,
      currency: "BDT",
      durationDays: 7,
      coverImage: { url: `https://cdn.example/${listingASlug}.jpg`, alt: "Listing A cover" },
      destinationName: null,
    });

    // Soft-delete one listing → only the live one resolves on re-read.
    await softDeleteListing(listingB);
    const afterDelete = await service.getPublishedLandingBySlug(showcaseSlug);
    const showcaseAfter = afterDelete?.sections.find((s) => s.type === "packageShowcase");
    if (!showcaseAfter || showcaseAfter.type !== "packageShowcase") return;
    expect(showcaseAfter.config.listingIds).toEqual([listingA, listingB]); // pick list intact
    expect(showcaseAfter.config.listings.map((l) => l.id)).toEqual([listingA]); // card dropped

    // Soft-deleting the page takes it off /l/<slug> too.
    await expect(service.softDeleteLandingPage(landing.id)).resolves.toBe(true);
    expect(await service.getPublishedLandingBySlug(showcaseSlug)).toBeNull();
  });

  it("updateLandingStatus + softDeleteLandingPage round-trip", async () => {
    await purge();
    const service = await import("@/modules/landing-pages/service");

    const landing = await createLanding(statusSlug);
    expect(landing.status).toBe("draft");
    expect(await service.getPublishedLandingBySlug(statusSlug)).toBeNull();

    const published = await service.updateLandingStatus(landing.id, "published");
    expect(published.status).toBe("published");
    expect(await service.getPublishedLandingBySlug(statusSlug)).not.toBeNull();

    const backToDraft = await service.updateLandingStatus(landing.id, "draft");
    expect(backToDraft.status).toBe("draft");

    await expect(service.softDeleteLandingPage(landing.id)).resolves.toBe(true);
    // Deleting an already-deleted page reports false (no row updated).
    await expect(service.softDeleteLandingPage(landing.id)).resolves.toBe(false);
    await expect(
      service.updateLandingStatus(landing.id, "published"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
