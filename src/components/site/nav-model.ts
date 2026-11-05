import { usableRedirectUrl } from "@/lib/redirect-url";
import type { ServiceKind } from "@/modules/catalog/validation";

/**
 * Public header navigation model (FU-33) — PURE and tenant-free.
 *
 * The header used to hardcode four flat links (Packages / Visa Services /
 * Blog / About) while the site's real services, package categories and
 * destinations had no path from the menu at all. The tree is now BUILT
 * from the tenant's live catalog data (see nav-data.ts for the cached
 * server read): any tenant's categories and destinations appear in the
 * menu automatically, in the admin's own sort order — nothing about a
 * specific business (names, slugs, URLs) is written here.
 *
 * This module is shared by the server gate (which builds the tree) and
 * the client SiteHeader (which renders it), so it must stay free of
 * server-only imports; every input is a plain serializable slice.
 */

/** One clickable row inside a group panel / accordion section. */
export type NavLeaf = {
  label: string;
  href: string;
  /** External partner URL → rendered as a new-tab anchor, never a Link. */
  external?: boolean;
};

/** A top-level header entry: a flat link, or a group with a drop-down. */
export type NavEntry =
  | { kind: "link"; label: string; href: string; external?: boolean }
  | { kind: "group"; label: string; items: NavLeaf[] };

/** Raw slices the builder needs — prepared by nav-data.ts from the DB. */
export type NavModelInput = {
  /** Active catalog categories, admin order — the /packages filter set. */
  packageCategories: ReadonlyArray<{ label: string; slug: string }>;
  /** Active catalog categories with hrefs ALREADY resolved (see below). */
  services: ReadonlyArray<NavLeaf>;
  /** Active destinations, admin order. */
  destinations: ReadonlyArray<{ label: string; slug: string }>;
};

export const EMPTY_NAV_INPUT: NavModelInput = {
  packageCategories: [],
  services: [],
  destinations: [],
};

/**
 * The pre-FU-33 flat menu. It is the degradation target, never the plan:
 * when a tenant has no categories and no destinations at all (or the
 * catalog read failed), the header falls back to these structural links
 * instead of rendering an empty or broken nav.
 */
export const FALLBACK_NAV: NavEntry[] = [
  { kind: "link", label: "Packages", href: "/packages" },
  { kind: "link", label: "Visa Services", href: "/visa" },
  { kind: "link", label: "Blog", href: "/blog" },
  { kind: "link", label: "About", href: "/about-us" },
];

/**
 * Resolve one catalog category to the href the Services menu points at.
 * Mirrors the ServiceGrid resolution (home page + /services index) so
 * the menu can never drift from the cards:
 *   - the visa category → /visa (the visa explorer is the canonical
 *     visa surface; the old flat header linked there too);
 *   - a redirect category with a USABLE configured URL → that URL,
 *     external (the FU-28 placeholder firewall decides "usable");
 *   - anything else → the internal service landing /services/[slug].
 */
export function resolveServiceHref(category: {
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string | null;
}): { href: string; external: boolean } {
  if (isVisaCategory(category)) return { href: "/visa", external: false };
  if (category.kind === "redirect") {
    const usable = usableRedirectUrl(category.redirectUrl);
    if (usable) return { href: usable, external: true };
  }
  return { href: `/services/${category.slug}`, external: false };
}

/**
 * "The" visa category, matched the way the rest of the codebase finds
 * its special categories (homepage flight/hotel/hajj matchers): a whole
 * slug token or a whole name word — "visa", "visa-services",
 * "visa-passport", "Visa Concierge" match; "visakhapatnam" does not.
 */
function isVisaCategory(category: { name: string; slug: string }): boolean {
  const slugTokens = category.slug.toLowerCase().split(/[^a-z0-9]+/);
  if (slugTokens.includes("visa")) return true;
  const nameWords = category.name.toLowerCase().split(/[^a-z0-9]+/);
  return nameWords.includes("visa");
}

/**
 * Assemble the ordered header tree:
 *   Packages ▾ · Services ▾ · Destinations ▾ · Blog · About
 * Each group opens with its "All …" index link, then the data rows in
 * the order they were given (admin sortOrder — never re-sorted here).
 * A group whose list is empty is omitted entirely; when ALL lists are
 * empty the flat FALLBACK_NAV is returned instead.
 */
export function buildNavModel(input: NavModelInput): NavEntry[] {
  const { packageCategories, services, destinations } = input;
  if (packageCategories.length === 0 && services.length === 0 && destinations.length === 0) {
    return FALLBACK_NAV;
  }

  const entries: NavEntry[] = [];

  if (packageCategories.length > 0) {
    entries.push({
      kind: "group",
      label: "Packages",
      items: [
        { label: "All Packages", href: "/packages" },
        ...packageCategories.map((c) => ({
          label: c.label,
          href: `/packages?cat=${c.slug}`,
        })),
      ],
    });
  }

  if (services.length > 0) {
    entries.push({
      kind: "group",
      label: "Services",
      items: [{ label: "All Services", href: "/services" }, ...services],
    });
  }

  if (destinations.length > 0) {
    entries.push({
      kind: "group",
      label: "Destinations",
      items: [
        { label: "All Destinations", href: "/destinations" },
        ...destinations.map((d) => ({
          label: d.label,
          href: `/destinations/${d.slug}`,
        })),
      ],
    });
  }

  entries.push({ kind: "link", label: "Blog", href: "/blog" });
  entries.push({ kind: "link", label: "About", href: "/about-us" });
  return entries;
}
