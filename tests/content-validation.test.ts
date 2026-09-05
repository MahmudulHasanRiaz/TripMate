import { describe, expect, it } from "vitest";
import {
  postInput,
  postCategoryInput,
  pageInput,
  slugify,
} from "@/modules/content/validation";
import { STATIC_PAGES, STATIC_POST_CATEGORIES } from "@/modules/content/seed-static-pages";

// Pure-unit suite for the content validation layer. No DB, no server-only
// imports — validation.ts is zod-only so it runs anywhere.
//
// Mirrors tests/catalog-validation.test.ts. Slug uniqueness is deliberately
// NOT covered here (the DB unique constraint owns it; the service surfaces it
// as a typed SLUG_CONFLICT) — only slug SHAPE is validated.

const UUID = "3f3d5b1c-0000-4000-8000-000000000001";

function basePost(overrides: Record<string, unknown> = {}) {
  return {
    title: "Five Sights You Cannot Miss in Dhaka",
    slug: "five-sights-you-cannot-miss-in-dhaka",
    ...overrides,
  };
}

function basePage(overrides: Record<string, unknown> = {}) {
  return {
    title: "About TripMate",
    slug: "about-us",
    sections: [{ type: "markdown", content: "# Who we are\n\nTripMate is a travel agency." }],
    ...overrides,
  };
}

describe("slugify (title → slug generation)", () => {
  it("lowercases and dashes a normal title", () => {
    expect(slugify("Spiritual Journeys in Makkah")).toBe("spiritual-journeys-in-makkah");
  });

  it("strips non-alphanumeric runs to single dashes and trims edges", () => {
    expect(slugify("  Cox's Bazar  &  Sylhet  ")).toBe("cox-s-bazar-sylhet");
    expect(slugify("---Visit---")).toBe("visit");
  });

  it("folds common latin diacritics to ascii", () => {
    expect(slugify("Café du Monde")).toBe("cafe-du-monde");
  });
});

describe("pageInput — sections shape (v1: markdown-only)", () => {
  it("accepts a single well-formed markdown section", () => {
    const res = pageInput.safeParse(basePage());
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.sections).toHaveLength(1);
  });

  it("accepts several markdown sections", () => {
    const res = pageInput.safeParse(
      basePage({
        sections: [
          { type: "markdown", content: "# Intro" },
          { type: "markdown", content: "More text here." },
        ],
      }),
    );
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.sections).toHaveLength(2);
  });

  it("rejects an empty sections array (min 1)", () => {
    const res = pageInput.safeParse(basePage({ sections: [] }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.includes("sections"))).toBe(true);
    }
  });

  it("rejects sections that are missing entirely", () => {
    const res = pageInput.safeParse(basePage({ sections: undefined }));
    expect(res.success).toBe(false);
  });

  it("rejects a non-markdown section type (v1 is markdown-only)", () => {
    expect(
      pageInput.safeParse(
        basePage({ sections: [{ type: "hero", content: "H1" }] }),
      ).success,
    ).toBe(false);
    expect(
      pageInput.safeParse(
        basePage({
          sections: [
            { type: "markdown", content: "ok" },
            { type: "testimonial", content: "not yet" },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects a section with missing or blank content", () => {
    expect(pageInput.safeParse(basePage({ sections: [{ type: "markdown" }] })).success).toBe(false);
    expect(
      pageInput.safeParse(basePage({ sections: [{ type: "markdown", content: "   " }] })).success,
    ).toBe(false);
  });

  it("rejects a non-array sections value", () => {
    expect(pageInput.safeParse(basePage({ sections: { type: "markdown", content: "x" } })).success).toBe(false);
  });
});

describe("postInput — base shape", () => {
  it("accepts a minimal title+slug post and leaves status unset", () => {
    const res = postInput.safeParse(basePost());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.slug).toBe("five-sights-you-cannot-miss-in-dhaka");
      expect(res.data.status).toBeUndefined();
      expect(res.data.categoryId).toBeUndefined();
    }
  });

  it("requires a title and a valid slug shape", () => {
    expect(postInput.safeParse(basePost({ title: "  " })).success).toBe(false);
    expect(postInput.safeParse(basePost({ title: undefined })).success).toBe(false);
    expect(postInput.safeParse(basePost({ slug: "Not A Slug" })).success).toBe(false);
    // shape-only: uniqueness is not enforced here
    expect(postInput.safeParse(basePost({ slug: "1-2-3" })).success).toBe(true);
  });

  it("accepts status draft/published and rejects unknown/archived values", () => {
    expect(postInput.safeParse(basePost({ status: "draft" })).success).toBe(true);
    expect(postInput.safeParse(basePost({ status: "published" })).success).toBe(true);
    expect(postInput.safeParse(basePost({ status: "archived" })).success).toBe(false);
    expect(postInput.safeParse(basePost({ status: "deleted" })).success).toBe(false);
  });
});

describe("postInput — excerpt/content bounds", () => {
  it("accepts excerpt at exactly 500 chars and rejects beyond", () => {
    const exact = "x".repeat(500);
    expect(postInput.safeParse(basePost({ excerpt: exact })).success).toBe(true);
    expect(postInput.safeParse(basePost({ excerpt: "x".repeat(501) })).success).toBe(false);
  });

  it("allows excerpt to be omitted or null", () => {
    expect(postInput.safeParse(basePost({})).success).toBe(true);
    expect(postInput.safeParse(basePost({ excerpt: null })).success).toBe(true);
    expect(postInput.safeParse(basePost({ excerpt: "" })).success).toBe(true);
  });

  it("accepts markdown content up to 100k chars and rejects beyond", () => {
    expect(postInput.safeParse(basePost({ content: "x".repeat(100_000) })).success).toBe(true);
    expect(postInput.safeParse(basePost({ content: "x".repeat(100_001) })).success).toBe(false);
  });

  it("allows content to be omitted (draft body)", () => {
    expect(postInput.safeParse(basePost({})).success).toBe(true);
    expect(postInput.safeParse(basePost({ content: null })).success).toBe(true);
  });
});

describe("postInput — featuredImage {url, alt?}", () => {
  it("accepts a well-formed featured image and null", () => {
    expect(
      postInput.safeParse(basePost({ featuredImage: { url: "https://cdn.example/cover.jpg", alt: "Kaaba at dusk" } })).success,
    ).toBe(true);
    expect(postInput.safeParse(basePost({ featuredImage: { url: "https://cdn.example/cover.jpg" } })).success).toBe(true);
    expect(postInput.safeParse(basePost({ featuredImage: null })).success).toBe(true);
  });

  it("rejects an image with a missing or blank url", () => {
    expect(postInput.safeParse(basePost({ featuredImage: {} })).success).toBe(false);
    expect(postInput.safeParse(basePost({ featuredImage: { url: "   " } })).success).toBe(false);
    expect(postInput.safeParse(basePost({ featuredImage: { url: 123 } })).success).toBe(false);
  });

  it("rejects an over-long alt text", () => {
    expect(
      postInput.safeParse(basePost({ featuredImage: { url: "https://cdn.example/cover.jpg", alt: "x".repeat(201) } })).success,
    ).toBe(false);
  });
});

describe("postInput — gallery (blank/empty → null carry-in)", () => {
  it("accepts a populated gallery and preserves its entries", () => {
    const gallery = [
      { url: "https://cdn.example/1.jpg", alt: "Sundarbans mangroves" },
      { url: "https://cdn.example/2.jpg" },
    ];
    const res = postInput.safeParse(basePost({ gallery }));
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.gallery).toEqual(gallery);
  });

  it("coerces an empty array to null (no gallery stored)", () => {
    const res = postInput.safeParse(basePost({ gallery: [] }));
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.gallery).toBeNull();
  });

  it("coerces a blank string to null", () => {
    const res = postInput.safeParse(basePost({ gallery: "" }));
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.gallery).toBeNull();
  });

  it("accepts null and absent gallery", () => {
    expect(postInput.safeParse(basePost({ gallery: null })).success).toBe(true);
    expect(postInput.safeParse(basePost({})).success).toBe(true);
  });

  it("rejects entries missing a url and enforces the 60-row cap", () => {
    expect(postInput.safeParse(basePost({ gallery: [{ alt: "no url" }] })).success).toBe(false);
    const tooMany = Array.from({ length: 61 }, (_, i) => ({
      url: `https://cdn.example/${i}.jpg`,
    }));
    expect(postInput.safeParse(basePost({ gallery: tooMany })).success).toBe(false);
  });
});

describe("postInput — category/author ids", () => {
  it("accepts a valid uuid, null and absent categoryId", () => {
    expect(postInput.safeParse(basePost({ categoryId: UUID })).success).toBe(true);
    expect(postInput.safeParse(basePost({ categoryId: null })).success).toBe(true);
    expect(postInput.safeParse(basePost({ categoryId: "" })).success).toBe(true); // blank → null
    expect(postInput.safeParse(basePost({})).success).toBe(true);
  });

  it("rejects a malformed categoryId", () => {
    expect(postInput.safeParse(basePost({ categoryId: "nope" })).success).toBe(false);
  });

  it("accepts a valid uuid or null authorId", () => {
    expect(postInput.safeParse(basePost({ authorId: UUID })).success).toBe(true);
    expect(postInput.safeParse(basePost({ authorId: null })).success).toBe(true);
    expect(postInput.safeParse(basePost({ authorId: "bad" })).success).toBe(false);
  });
});

describe("postInput — seo", () => {
  it("accepts undefined/null or a bounded seo object", () => {
    expect(postInput.safeParse(basePost({})).success).toBe(true);
    expect(postInput.safeParse(basePost({ seo: null })).success).toBe(true);
    expect(
      postInput.safeParse(basePost({ seo: { title: "A title", description: "A description" } })).success,
    ).toBe(true);
  });

  it("rejects seo title over 70 or description over 160 chars", () => {
    expect(postInput.safeParse(basePost({ seo: { title: "x".repeat(71) } })).success).toBe(false);
    expect(postInput.safeParse(basePost({ seo: { description: "x".repeat(161) } })).success).toBe(false);
  });
});

describe("postCategoryInput", () => {
  it("accepts a minimal category", () => {
    const res = postCategoryInput.safeParse({ name: "Travel Tips", slug: "travel-tips" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.name).toBe("Travel Tips");
  });

  it("rejects an empty name or an invalid slug shape", () => {
    expect(postCategoryInput.safeParse({ name: "", slug: "travel-tips" }).success).toBe(false);
    expect(postCategoryInput.safeParse({ name: "Travel Tips", slug: "Travel Tips" }).success).toBe(false);
    expect(postCategoryInput.safeParse({ name: "Travel Tips", slug: "" }).success).toBe(false);
  });
});

// Guard the seed data against drift: every static page/category must keep
// passing the same schemas the admin form and service trust.
describe("static seed conformance", () => {
  it("has post categories that all parse under postCategoryInput", () => {
    expect(STATIC_POST_CATEGORIES.length).toBeGreaterThan(0);
    for (const category of STATIC_POST_CATEGORIES) {
      const res = postCategoryInput.safeParse({ name: category.name, slug: category.slug });
      expect(res.success).toBe(true);
    }
  });

  it("has pages that all parse under pageInput as published markdown content", () => {
    expect(STATIC_PAGES.length).toBeGreaterThan(0);
    for (const page of STATIC_PAGES) {
      const res = pageInput.safeParse({
        title: page.title,
        slug: page.slug,
        sections: page.sections,
        status: "published",
        seo: page.seo,
      });
      expect(res.success).toBe(true);
      expect(page.sections.length).toBeGreaterThan(0);
      for (const section of page.sections) {
        expect(section.type).toBe("markdown");
        expect(section.content.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("seeds five FAQ Q&A sections under the ## Question pattern", () => {
    const faq = STATIC_PAGES.find((p) => p.slug === "faq");
    expect(faq?.sections).toHaveLength(5);
    for (const section of faq!.sections) {
      expect(section.content.startsWith("## ")).toBe(true);
      expect(section.content.split("\n\n").length).toBeGreaterThanOrEqual(2); // Q + answer
    }
  });
});
