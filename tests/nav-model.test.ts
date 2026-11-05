import { describe, expect, it } from "vitest";

import {
  buildNavModel,
  resolveServiceHref,
  FALLBACK_NAV,
  type NavEntry,
} from "@/components/site/nav-model";

const FULL_INPUT = {
  packageCategories: [
    { label: "Umrah Packages", slug: "umrah" },
    { label: "Hajj Packages", slug: "hajj" },
  ],
  services: [
    { label: "Visa Concierge", href: "/visa" },
    { label: "Flight Tickets", href: "https://partners.example-bookings.com/flights", external: true },
    { label: "Passport Services", href: "/services/passport" },
  ],
  destinations: [
    { label: "Dubai, UAE", slug: "dubai" },
    { label: "Maldives", slug: "maldives" },
  ],
};

function group(entries: NavEntry[], label: string) {
  const found = entries.find((e) => e.kind === "group" && e.label === label);
  if (!found || found.kind !== "group") throw new Error(`group ${label} missing`);
  return found;
}

describe("buildNavModel (FU-33)", () => {
  it("builds Packages ▾, Services ▾, Destinations ▾, Blog, About — in that order", () => {
    const entries = buildNavModel(FULL_INPUT);
    expect(entries.map((e) => `${e.kind}:${e.label}`)).toEqual([
      "group:Packages",
      "group:Services",
      "group:Destinations",
      "link:Blog",
      "link:About",
    ]);
    expect(entries[3]).toEqual({ kind: "link", label: "Blog", href: "/blog" });
    expect(entries[4]).toEqual({ kind: "link", label: "About", href: "/about-us" });
  });

  it("opens every group with its All… index link, then the data rows", () => {
    const entries = buildNavModel(FULL_INPUT);
    expect(group(entries, "Packages").items).toEqual([
      { label: "All Packages", href: "/packages" },
      { label: "Umrah Packages", href: "/packages?cat=umrah" },
      { label: "Hajj Packages", href: "/packages?cat=hajj" },
    ]);
    expect(group(entries, "Destinations").items).toEqual([
      { label: "All Destinations", href: "/destinations" },
      { label: "Dubai, UAE", href: "/destinations/dubai" },
      { label: "Maldives", href: "/destinations/maldives" },
    ]);
    expect(group(entries, "Services").items[0]).toEqual({
      label: "All Services",
      href: "/services",
    });
  });

  it("passes resolved service hrefs through untouched (incl. external + /visa)", () => {
    const entries = buildNavModel(FULL_INPUT);
    expect(group(entries, "Services").items.slice(1)).toEqual(FULL_INPUT.services);
  });

  it("preserves the admin/data order inside groups — never re-sorts", () => {
    const entries = buildNavModel({
      ...FULL_INPUT,
      packageCategories: [
        { label: "Zanzibar Tours", slug: "zanzibar" },
        { label: "Alpine Treks", slug: "alpine" },
      ],
    });
    expect(group(entries, "Packages").items.map((i) => i.label)).toEqual([
      "All Packages",
      "Zanzibar Tours",
      "Alpine Treks",
    ]);
  });

  it("omits a group whose list is empty, keeping the rest of the tree", () => {
    const noDestinations = buildNavModel({ ...FULL_INPUT, destinations: [] });
    expect(noDestinations.map((e) => e.label)).toEqual(["Packages", "Services", "Blog", "About"]);

    const onlyPackages = buildNavModel({
      packageCategories: FULL_INPUT.packageCategories,
      services: [],
      destinations: [],
    });
    expect(onlyPackages.map((e) => e.label)).toEqual(["Packages", "Blog", "About"]);
  });

  it("falls back to the flat pre-FU-33 links when every list is empty", () => {
    const entries = buildNavModel({ packageCategories: [], services: [], destinations: [] });
    expect(entries).toEqual(FALLBACK_NAV);
    expect(entries).toEqual([
      { kind: "link", label: "Packages", href: "/packages" },
      { kind: "link", label: "Visa Services", href: "/visa" },
      { kind: "link", label: "Blog", href: "/blog" },
      { kind: "link", label: "About", href: "/about-us" },
    ]);
  });
});

describe("resolveServiceHref (FU-33)", () => {
  it("sends the visa category to /visa — by slug token or name word", () => {
    expect(
      resolveServiceHref({ name: "Visa Concierge", slug: "visa", kind: "inquiry_based", redirectUrl: null }),
    ).toEqual({ href: "/visa", external: false });
    expect(
      resolveServiceHref({ name: "Visa Services", slug: "visa-services", kind: "inquiry_based", redirectUrl: null }),
    ).toEqual({ href: "/visa", external: false });
    expect(
      resolveServiceHref({ name: "Passport & Visa Desk", slug: "passport-desk", kind: "inquiry_based", redirectUrl: null }),
    ).toEqual({ href: "/visa", external: false });
  });

  it("does not mistake a slug that merely contains the letters for the visa category", () => {
    expect(
      resolveServiceHref({ name: "Visakhapatnam Tours", slug: "visakhapatnam", kind: "package", redirectUrl: null }),
    ).toEqual({ href: "/services/visakhapatnam", external: false });
  });

  it("links a redirect category to its configured URL, external, when usable", () => {
    expect(
      resolveServiceHref({
        name: "Flight Tickets",
        slug: "flights",
        kind: "redirect",
        redirectUrl: "https://b2b.partner-air.com/flights",
      }),
    ).toEqual({ href: "https://b2b.partner-air.com/flights", external: true });
  });

  it("falls back to the internal service page when the redirect URL is a placeholder", () => {
    expect(
      resolveServiceHref({
        name: "Flight Tickets",
        slug: "flights",
        kind: "redirect",
        redirectUrl: "https://b2b.tripmate.example/flights",
      }),
    ).toEqual({ href: "/services/flights", external: false });
    expect(
      resolveServiceHref({ name: "Hotel Booking", slug: "hotels", kind: "redirect", redirectUrl: null }),
    ).toEqual({ href: "/services/hotels", external: false });
  });

  it("links internal kinds to /services/[slug]", () => {
    expect(
      resolveServiceHref({ name: "Hajj Packages", slug: "hajj", kind: "package", redirectUrl: null }),
    ).toEqual({ href: "/services/hajj", external: false });
    expect(
      resolveServiceHref({ name: "Passport Services", slug: "passport", kind: "inquiry_based", redirectUrl: null }),
    ).toEqual({ href: "/services/passport", external: false });
  });
});
