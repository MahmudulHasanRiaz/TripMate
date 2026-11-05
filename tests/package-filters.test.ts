import { describe, expect, it } from "vitest";

import {
  durationRangeForBucket,
  hasActiveFilters,
  packageFiltersToSearchParams,
  parsePackageSearchParams,
  type PackageFilters,
} from "@/lib/package-filters";

describe("parsePackageSearchParams destination handling (FU-28)", () => {
  it("reads the canonical dest slug", () => {
    expect(parsePackageSearchParams({ dest: "singapore" }).dest).toBe("singapore");
  });

  it("accepts the legacy ?destination=Name alias and slugifies it", () => {
    // Destination pages linked ?destination=<display name> for years and
    // the parser silently ignored it — the filter must honour the alias.
    expect(parsePackageSearchParams({ destination: "Singapore" }).dest).toBe("singapore");
    expect(parsePackageSearchParams({ destination: "Makkah & Madinah" }).dest).toBe(
      "makkah-madinah",
    );
  });

  it("canonical dest wins over the alias", () => {
    expect(parsePackageSearchParams({ dest: "dubai", destination: "Singapore" }).dest).toBe(
      "dubai",
    );
  });

  it("no destination params means no destination filter", () => {
    expect(parsePackageSearchParams({}).dest).toBe("");
  });
});

describe("parsePackageSearchParams duration handling (FU-32)", () => {
  it("accepts every known bucket verbatim", () => {
    for (const bucket of ["1-3", "4-7", "8-14", "15+"]) {
      expect(parsePackageSearchParams({ duration: bucket }).duration).toBe(bucket);
    }
  });

  it("treats a hand-typed ?duration=15+ (plus decoded as space) as the 15+ bucket", () => {
    // URL form-decoding turns the raw "+" into a space, so the parser sees
    // "15 " → trimmed "15"; it must still land on the long-journey bucket.
    expect(parsePackageSearchParams({ duration: "15 " }).duration).toBe("15+");
    expect(parsePackageSearchParams({ duration: "15" }).duration).toBe("15+");
  });

  it("drops junk buckets to 'any duration' instead of filtering on garbage", () => {
    expect(parsePackageSearchParams({ duration: "2-5" }).duration).toBe("");
    expect(parsePackageSearchParams({ duration: "abc" }).duration).toBe("");
    expect(parsePackageSearchParams({}).duration).toBe("");
  });

  it("maps buckets to inclusive day bounds", () => {
    expect(durationRangeForBucket("1-3")).toEqual({ min: 1, max: 3 });
    expect(durationRangeForBucket("4-7")).toEqual({ min: 4, max: 7 });
    expect(durationRangeForBucket("8-14")).toEqual({ min: 8, max: 14 });
    expect(durationRangeForBucket("15+")).toEqual({ min: 15 });
    expect(durationRangeForBucket("")).toBeUndefined();
    expect(durationRangeForBucket("2-5")).toBeUndefined();
  });

  it("serialises the bucket back to the canonical param", () => {
    const filters: PackageFilters = {
      q: "",
      cat: "",
      dest: "",
      duration: "4-7",
      max: undefined,
      page: 1,
    };
    expect(packageFiltersToSearchParams(filters).get("duration")).toBe("4-7");
  });

  it("a duration-only filter counts as active (empty state offers clear-all)", () => {
    const filters = parsePackageSearchParams({ duration: "8-14" });
    expect(hasActiveFilters(filters)).toBe(true);
    expect(hasActiveFilters(parsePackageSearchParams({}))).toBe(false);
  });
});
