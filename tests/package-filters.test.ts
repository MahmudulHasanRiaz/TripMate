import { describe, expect, it } from "vitest";

import { parsePackageSearchParams } from "@/lib/package-filters";

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
