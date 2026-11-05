import { describe, expect, it } from "vitest";

import { resolveVisaDestinationId } from "@/app/(public)/visa/_lib/resolve-destination";

const DESTINATIONS = [
  { id: "dest-ms", name: "Malaysia & Singapore", slug: "malaysia-singapore" },
  { id: "dest-dubai", name: "Dubai, UAE", slug: "dubai" },
  { id: "dest-maldives", name: "Maldives", slug: "maldives" },
];

describe("resolveVisaDestinationId (FU-32)", () => {
  it("resolves the display NAME the homepage panel sends", () => {
    expect(resolveVisaDestinationId("Malaysia & Singapore", DESTINATIONS)).toBe("dest-ms");
  });

  it("matches names case-insensitively and trims whitespace", () => {
    expect(resolveVisaDestinationId("  malaysia & singapore ", DESTINATIONS)).toBe("dest-ms");
    expect(resolveVisaDestinationId("DUBAI, UAE", DESTINATIONS)).toBe("dest-dubai");
  });

  it("accepts a slug as a fallback", () => {
    expect(resolveVisaDestinationId("maldives", DESTINATIONS)).toBe("dest-maldives");
    expect(resolveVisaDestinationId("Malaysia-Singapore", DESTINATIONS)).toBe("dest-ms");
  });

  it("returns null for an unknown destination (explorer opens unfiltered)", () => {
    expect(resolveVisaDestinationId("Japan", DESTINATIONS)).toBeNull();
  });

  it("returns null when the param is absent or blank", () => {
    expect(resolveVisaDestinationId(undefined, DESTINATIONS)).toBeNull();
    expect(resolveVisaDestinationId("", DESTINATIONS)).toBeNull();
    expect(resolveVisaDestinationId("   ", DESTINATIONS)).toBeNull();
  });

  it("uses the first value of a repeated param", () => {
    expect(resolveVisaDestinationId(["Maldives", "Dubai, UAE"], DESTINATIONS)).toBe(
      "dest-maldives",
    );
  });
});
