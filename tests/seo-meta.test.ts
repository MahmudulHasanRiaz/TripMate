import { describe, expect, it } from "vitest";

import { finalizeDetailTitle } from "@/lib/seo-meta";
import { usableRedirectUrl } from "@/lib/redirect-url";

describe("finalizeDetailTitle (FU-28)", () => {
  it("strips a legacy factory suffix and appends the configured brand", () => {
    expect(finalizeDetailTitle("Hajj Packages | TripMate", "FlightBlu")).toBe(
      "Hajj Packages | FlightBlu",
    );
    expect(finalizeDetailTitle("Umrah | TripMate Bangladesh", "FlightBlu")).toBe(
      "Umrah | FlightBlu",
    );
    expect(finalizeDetailTitle("Tours | TripMate Travel", "FlightBlu")).toBe("Tours | FlightBlu");
  });

  it("appends the brand to a bare title", () => {
    expect(finalizeDetailTitle("Hajj Packages", "FlightBlu")).toBe("Hajj Packages | FlightBlu");
  });

  it("keeps an author-supplied suffix verbatim", () => {
    expect(finalizeDetailTitle("Hajj | Best Deals 2026", "FlightBlu")).toBe("Hajj | Best Deals 2026");
  });

  it("does not touch a brand name in prose position", () => {
    expect(finalizeDetailTitle("About TripMate — our story", "FlightBlu")).toBe(
      "About TripMate — our story | FlightBlu",
    );
  });

  it("without a brand, returns the cleaned title for the root template", () => {
    expect(finalizeDetailTitle("Hajj | TripMate")).toBe("Hajj");
    expect(finalizeDetailTitle("Hajj")).toBe("Hajj");
  });
});

describe("usableRedirectUrl (FU-28 placeholder firewall)", () => {
  it("rejects reserved placeholder hosts", () => {
    expect(usableRedirectUrl("https://b2b.tripmate.example/flights")).toBeNull();
    expect(usableRedirectUrl("https://partner.test/book")).toBeNull();
    expect(usableRedirectUrl("http://localhost:3000/x")).toBeNull();
  });

  it("rejects empty and unparsable values", () => {
    expect(usableRedirectUrl("")).toBeNull();
    expect(usableRedirectUrl("   ")).toBeNull();
    expect(usableRedirectUrl(null)).toBeNull();
    expect(usableRedirectUrl("not a url")).toBeNull();
    expect(usableRedirectUrl("ftp://example.com/x")).toBeNull();
  });

  it("passes real partner URLs through trimmed", () => {
    expect(usableRedirectUrl("  https://booking.partner.com/flights ")).toBe(
      "https://booking.partner.com/flights",
    );
  });
});
