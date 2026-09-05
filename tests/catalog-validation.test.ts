import { describe, expect, it } from "vitest";
import {
  listingInput,
  categoryInput,
  destinationInput,
  slugify,
} from "@/modules/catalog/validation";

// Pure-unit suite for the catalog validation layer. No DB, no server-only
// imports — validation.ts is zod-only so it runs anywhere.

const UUID = "3f3d5b1c-0000-4000-8000-000000000001";

function baseListing(overrides: Record<string, unknown> = {}) {
  return {
    title: "Premium Hajj Package 2026",
    slug: "premium-hajj-2026",
    categoryId: UUID,
    ...overrides,
  };
}

describe("slugify (title → slug generation)", () => {
  it("lowercases and dashes a normal title", () => {
    expect(slugify("Premium Hajj Package 2026")).toBe("premium-hajj-package-2026");
  });

  it("strips non-alphanumeric runs to single dashes and trims edges", () => {
    expect(slugify("  Cox's Bazar  &  Sylhet  ")).toBe("cox-s-bazar-sylhet");
    expect(slugify("---Visit---")).toBe("visit");
  });

  it("folds common latin diacritics to ascii", () => {
    expect(slugify("Café du Monde")).toBe("cafe-du-monde");
  });
});

describe("listingInput — price", () => {
  it("coerces a numeric string to a positive number", () => {
    const res = listingInput.safeParse(baseListing({ price: "150000" }));
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.price).toBe(150000);
  });

  it("rejects zero and negative prices", () => {
    expect(listingInput.safeParse(baseListing({ price: 0 })).success).toBe(false);
    expect(listingInput.safeParse(baseListing({ price: -5 })).success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(listingInput.safeParse(baseListing({ price: "abc" })).success).toBe(false);
  });

  it("allows price to be omitted (inquiry/draft listings)", () => {
    const res = listingInput.safeParse(baseListing());
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.price).toBeUndefined();
  });
});

describe("listingInput — rating bounds", () => {
  it("accepts 0 and 5 and coerces numeric strings", () => {
    for (const [input, expected] of [
      [5, 5],
      [0, 0],
      ["4.5", 4.5],
    ] as const) {
      const res = listingInput.safeParse(baseListing({ rating: input }));
      expect(res.success).toBe(true);
      if (res.success) expect(res.data.rating).toBe(expected);
    }
  });

  it("rejects out-of-range ratings", () => {
    expect(listingInput.safeParse(baseListing({ rating: 5.5 })).success).toBe(false);
    expect(listingInput.safeParse(baseListing({ rating: -0.1 })).success).toBe(false);
  });
});

describe("listingInput — durationDays positive int", () => {
  it("accepts positive whole days and coerces numeric strings", () => {
    const res = listingInput.safeParse(baseListing({ durationDays: "10" }));
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.durationDays).toBe(10);
  });

  it("rejects zero, negatives and non-integers", () => {
    expect(listingInput.safeParse(baseListing({ durationDays: 0 })).success).toBe(false);
    expect(listingInput.safeParse(baseListing({ durationDays: -2 })).success).toBe(false);
    expect(listingInput.safeParse(baseListing({ durationDays: 2.5 })).success).toBe(false);
  });
});

describe("listingInput — gallery url+alt shape", () => {
  it("accepts well-formed gallery entries", () => {
    const res = listingInput.safeParse(
      baseListing({
        gallery: [{ url: "https://cdn.example/hajj.jpg", alt: "Kaaba" }],
      }),
    );
    expect(res.success).toBe(true);
  });

  it("rejects entries with a missing/blank url or non-string url", () => {
    expect(listingInput.safeParse(baseListing({ gallery: [{ alt: "no url" }] })).success).toBe(false);
    expect(listingInput.safeParse(baseListing({ gallery: [{ url: "  " }] })).success).toBe(false);
    expect(listingInput.safeParse(baseListing({ gallery: [{ url: 123 }] })).success).toBe(false);
  });

  it("rejects a non-array gallery", () => {
    expect(listingInput.safeParse(baseListing({ gallery: "nope" })).success).toBe(false);
  });
});

describe("listingInput — itinerary {day,title,details}", () => {
  it("accepts a well-formed itinerary and coerces numeric days to strings", () => {
    const res = listingInput.safeParse(
      baseListing({
        itinerary: [{ day: 1, title: "Arrival", details: "Hotel check-in." }],
      }),
    );
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.itinerary?.[0].day).toBe("1");
  });

  it("rejects entries missing title or with blank details", () => {
    expect(
      listingInput.safeParse(
        baseListing({ itinerary: [{ day: "1", details: "x" }] }),
      ).success,
    ).toBe(false);
    expect(
      listingInput.safeParse(
        baseListing({ itinerary: [{ day: "1", title: "x", details: "  " }] }),
      ).success,
    ).toBe(false);
  });

  it("rejects a non-array itinerary", () => {
    expect(listingInput.safeParse(baseListing({ itinerary: { day: 1 } })).success).toBe(false);
  });
});

describe("listingInput — base shape", () => {
  it("defaults currency to BDT and keeps status unset", () => {
    const res = listingInput.safeParse(baseListing());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.currency).toBe("BDT");
      expect(res.data.status).toBeUndefined();
      expect(res.data.slug).toBe("premium-hajj-2026");
    }
  });

  it("rejects a bad slug shape but never enforces uniqueness", () => {
    expect(listingInput.safeParse(baseListing({ slug: "Not A Slug" })).success).toBe(false);
    expect(listingInput.safeParse(baseListing({ slug: "1-2-3-4" })).success).toBe(true);
  });

  it("requires a uuid categoryId", () => {
    expect(listingInput.safeParse(baseListing({ categoryId: "nope" })).success).toBe(false);
  });

  it("accepts status draft/published/archived and rejects others", () => {
    expect(listingInput.safeParse(baseListing({ status: "published" })).success).toBe(true);
    expect(listingInput.safeParse(baseListing({ status: "deleted" })).success).toBe(false);
  });
});

describe("categoryInput", () => {
  it("accepts a non-redirect category without a redirectUrl", () => {
    const res = categoryInput.safeParse({ name: "Hajj", slug: "hajj", kind: "package" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.isActive).toBe(true);
  });

  it("requires redirectUrl exactly when kind is redirect", () => {
    expect(
      categoryInput.safeParse({ name: "Partner", slug: "partner", kind: "redirect" }).success,
    ).toBe(false);
    const ok = categoryInput.safeParse({
      name: "Partner",
      slug: "partner",
      kind: "redirect",
      redirectUrl: "https://partner.example",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects an unknown kind", () => {
    expect(categoryInput.safeParse({ name: "X", slug: "x", kind: "bogus" }).success).toBe(false);
  });

  it("rejects an invalid slug shape", () => {
    expect(categoryInput.safeParse({ name: "X", slug: "X Y", kind: "package" }).success).toBe(false);
  });
});

describe("destinationInput", () => {
  it("accepts a minimal destination and defaults isActive", () => {
    const res = destinationInput.safeParse({ name: "Dubai", slug: "dubai" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.isActive).toBe(true);
  });

  it("rejects a slug with spaces", () => {
    expect(destinationInput.safeParse({ name: "Cox's Bazar", slug: "coxs bazar" }).success).toBe(
      false,
    );
  });
});
