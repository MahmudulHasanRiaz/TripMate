import { describe, expect, it } from "vitest";

import { listingPhotos } from "@/lib/listing-photos";

const cover = { url: "/uploads/cover.jpg", alt: "Cover" };
const g1 = { url: "/uploads/a.jpg", alt: "A" };
const g2 = { url: "/uploads/b.jpg", alt: "B" };

describe("listingPhotos (FU-32 photo-count unification)", () => {
  it("prepends the cover when it is not in the gallery", () => {
    expect(listingPhotos(cover, [g1, g2]).map((p) => p.url)).toEqual([
      "/uploads/cover.jpg",
      "/uploads/a.jpg",
      "/uploads/b.jpg",
    ]);
  });

  it("never double-counts a cover that is already in the gallery", () => {
    // The Dubai package QA caught: gallery of 2 including the cover —
    // the hero pill read 3 while the lightbox showed 2.
    const result = listingPhotos(cover, [cover, g1]);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.url)).toEqual(["/uploads/cover.jpg", "/uploads/a.jpg"]);
  });

  it("returns the gallery untouched when there is no cover", () => {
    expect(listingPhotos(null, [g1, g2])).toHaveLength(2);
    expect(listingPhotos(undefined, [g1])).toHaveLength(1);
  });

  it("returns an empty set when neither exists", () => {
    expect(listingPhotos(null, [])).toEqual([]);
  });
});
