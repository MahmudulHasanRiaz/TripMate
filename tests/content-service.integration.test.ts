import { describe, expect, it, vi } from "vitest";
import "dotenv/config";
import { postInput, postCategoryInput, pageInput } from "@/modules/content/validation";

// service.ts imports "server-only" (it throws outside a React Server runtime);
// stub the marker so the suite can actually run under vitest's node env when
// RUN_DB_INTEGRATION=1. Same pattern as tests/catalog-service.integration.test.ts.
vi.mock("server-only", () => ({}));

// DB-backed integration suite for the content service. The drizzle client
// connects against process.env.DATABASE_URL at module load, so local
// `vitest run` (no database) keeps this suite OFF — same contract as the
// catalog/settings suites. Plan 7 CI flips it on with RUN_DB_INTEGRATION=1
// against an isolated Postgres (migrated + seeded, which is what the
// seeded-page assertions below rely on).
const integration = process.env.RUN_DB_INTEGRATION === "1";

const CONTENT_CAT = "integration-content-cat";
const USAGE_POST = "content-usage-post";

describe.skipIf(!integration)("content service (integration — Postgres)", () => {
  it("serves the seeded static pages as published markdown", async () => {
    const service = await import("@/modules/content/service");
    const about = await service.getPublishedPageBySlug("about-us");
    expect(about).not.toBeNull();
    expect(about!.status).toBe("published");
    expect(about!.sections.length).toBeGreaterThan(0);
    for (const section of about!.sections) {
      expect(section.type).toBe("markdown");
      expect(section.content.length).toBeGreaterThan(0);
    }
    const faq = await service.getPublishedPageBySlug("faq");
    expect(faq).not.toBeNull();
    expect(faq!.sections.length).toBeGreaterThanOrEqual(5);
    // Unknown slugs and soft-deleted pages are not public.
    expect(await service.getPublishedPageBySlug("definitely-not-a-real-page")).toBeNull();
  });

  it("refuses to delete a post category while posts reference it (IN_USE)", async () => {
    const service = await import("@/modules/content/service");
    const { eq } = await import("drizzle-orm");
    const { posts, postCategories } = await import("@/modules/content/schema");
    const { db } = await import("@/db/client");
    // Pre-run purge for idempotency (a failed/aborted run leaves rows behind).
    await db.delete(posts).where(eq(posts.slug, USAGE_POST));
    await db.delete(postCategories).where(eq(postCategories.slug, CONTENT_CAT));

    const cat = await service.upsertPostCategory(
      postCategoryInput.parse({ name: "Integration Content Cat", slug: CONTENT_CAT }),
    );

    const saved = await service.upsertPost(
      postInput.parse({
        categoryId: cat.id,
        title: "Content Usage Post",
        slug: USAGE_POST,
        status: "published",
      }),
    );
    expect(saved.publishedAt).not.toBeNull(); // auto-stamped on first publish

    // A live (non-deleted) post referencing the category blocks its deletion.
    await expect(service.deletePostCategory(cat.id)).rejects.toMatchObject({ code: "IN_USE" });

    // Trashing the post releases the guard (references held by the trashed row
    // are cleared) so the category can finally be removed.
    await service.softDeletePost(saved.id);
    await expect(service.deletePostCategory(cat.id)).resolves.toBe(true);

    // Hard-cleanup so the shared dev DB stays tidy across runs.
    await db.delete(posts).where(eq(posts.slug, USAGE_POST));
    await db.delete(postCategories).where(eq(postCategories.slug, CONTENT_CAT));
  });

  it("round-trips a post: publishedAt on first publish, typed slug conflict, trash + slug recovery, author/category joins", async () => {
    const service = await import("@/modules/content/service");
    const { eq } = await import("drizzle-orm");
    const { posts, postCategories } = await import("@/modules/content/schema");
    const { users } = await import("@/modules/users/schema");
    const { db } = await import("@/db/client");
    const SLUG = "content-draft-post";
    const EMAIL = "content-tester@example.com";
    // Pre-run purge for idempotency.
    for (const slug of [SLUG, `${SLUG}-2`, `${SLUG}-3`]) {
      await db.delete(posts).where(eq(posts.slug, slug));
    }
    await db.delete(postCategories).where(eq(postCategories.slug, "integration-content-cats"));
    await db.delete(users).where(eq(users.email, EMAIL));

    const user = await db
      .insert(users)
      .values({ name: "Content Tester", email: EMAIL })
      .returning({ id: users.id });
    const cat = await service.upsertPostCategory(
      postCategoryInput.parse({ name: "Integration Content Cats", slug: "integration-content-cats" }),
    );

    const draft = postInput.parse({
      categoryId: cat.id,
      authorId: user[0].id,
      title: "Content Draft Post",
      slug: SLUG,
    });
    const savedDraft = await service.upsertPost(draft);
    expect(savedDraft.status).toBe("draft");
    expect(savedDraft.publishedAt).toBeNull();

    // A draft is not on the public index.
    const hidden = await service.listPublishedPosts({ search: "Content Draft Post" });
    expect(hidden.total).toBe(0);

    // Publishing stamps publishedAt exactly once; author + category names join.
    const published = await service.upsertPost({ ...draft, id: savedDraft.id, status: "published" });
    expect(published.status).toBe("published");
    expect(published.publishedAt).not.toBeNull();
    expect(published.author?.name).toBe("Content Tester");
    expect(published.category?.name).toBe("Integration Content Cats");

    const listing = await service.listPublishedPosts({
      search: "Content Draft Post",
      categorySlug: "integration-content-cats",
    });
    expect(listing.total).toBe(1);
    expect(listing.items[0].author?.name).toBe("Content Tester");
    expect(listing.items[0].slug).toBe(SLUG);

    // Re-saving as published keeps the original publish date (not a new one).
    const kept = await service.upsertPost({ ...draft, id: savedDraft.id, status: "published" });
    expect(kept.publishedAt?.getTime()).toBe(published.publishedAt!.getTime());

    // A second insert under the LIVE slug is a genuine typed conflict…
    await expect(service.upsertPost({ ...draft, id: undefined })).rejects.toMatchObject({
      code: "SLUG_CONFLICT",
    });

    // …but once the base is trashed, recreation auto-suffixes instead.
    await expect(service.softDeletePost(savedDraft.id)).resolves.toBe(true);
    expect(await service.getPostById(savedDraft.id)).toBeNull();
    const recreated = await service.upsertPost({ ...draft, id: undefined, status: "published" });
    expect(recreated.slug).toBe(`${SLUG}-2`);

    // Hard-cleanup so the shared dev DB stays tidy across runs.
    for (const slug of [SLUG, `${SLUG}-2`, `${SLUG}-3`]) {
      await db.delete(posts).where(eq(posts.slug, slug));
    }
    await db.delete(postCategories).where(eq(postCategories.slug, "integration-content-cats"));
    await db.delete(users).where(eq(users.email, EMAIL));
  });

  it("round-trips a page: typed slug conflict while live, trash + slug recovery, admin reads", async () => {
    const service = await import("@/modules/content/service");
    const { eq } = await import("drizzle-orm");
    const { pages } = await import("@/modules/content/schema");
    const { db } = await import("@/db/client");
    const SLUG = "integration-content-page";
    // Pre-run purge for idempotency.
    for (const slug of [SLUG, `${SLUG}-2`, `${SLUG}-3`]) {
      await db.delete(pages).where(eq(pages.slug, slug));
    }

    const input = pageInput.parse({
      title: "Integration Content Page",
      slug: SLUG,
      sections: [
        { type: "markdown", content: "# Intro\n\nSome body text." },
        { type: "markdown", content: "A second block." },
      ],
      status: "published",
    });
    const first = await service.upsertPage(input);
    expect(first.slug).toBe(SLUG);
    expect(first.sections).toHaveLength(2);
    expect((await service.getPublishedPageBySlug(SLUG))?.title).toBe("Integration Content Page");

    // A second insert under the LIVE slug is a typed conflict…
    await expect(
      service.upsertPage(
        pageInput.parse({
          title: "Clone",
          slug: SLUG,
          sections: [{ type: "markdown", content: "x" }],
        }),
      ),
    ).rejects.toMatchObject({ code: "SLUG_CONFLICT" });

    // …once trashed, the page drops off the admin list and public reads…
    await expect(service.softDeletePage(first.id)).resolves.toBe(true);
    expect(await service.getPublishedPageBySlug(SLUG)).toBeNull();
    const afterTrash = await service.listAllPages({ search: "Integration Content Page" });
    expect(afterTrash.total).toBe(0);

    // …and recreation auto-suffixes the slug.
    const recreated = await service.upsertPage(
      pageInput.parse({
        title: "Integration Content Page",
        slug: SLUG,
        sections: [{ type: "markdown", content: "New body." }],
        status: "published",
      }),
    );
    expect(recreated.slug).toBe(`${SLUG}-2`);
    expect((await service.getPageById(recreated.id))?.slug).toBe(`${SLUG}-2`);
    expect((await service.getPublishedPageBySlug(`${SLUG}-2`))?.title).toBe("Integration Content Page");

    // Hard-cleanup so the shared dev DB stays tidy across runs.
    for (const slug of [SLUG, `${SLUG}-2`, `${SLUG}-3`]) {
      await db.delete(pages).where(eq(pages.slug, slug));
    }
  });
});
