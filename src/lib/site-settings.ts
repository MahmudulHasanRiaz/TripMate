import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSetting } from "@/modules/settings/service";

/**
 * Plain, serializable site identity consumed by the public chrome (header,
 * footer, not-found). It exists as its own type so the server layout can read
 * the DB once and hand strings to the client SiteHeader island and to the
 * server SiteFooter/not-found without leaking the full `SiteSetting` shape.
 */
export type SiteSettings = {
  title: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
};

/** Fallback brand shown before the setup wizard seeds a `site` settings row. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  title: "TripMate",
  logoUrl: "",
  phone: "",
  email: "",
  address: "",
};

/**
 * Cached read of the site identity for the public chrome — the same Cache
 * Components contract content pages use (`'use cache'` + `cacheTag`). Tagging
 * with `CACHE_TAGS.settings` means an admin settings mutation that calls
 * `updateTag(CACHE_TAGS.settings)` refreshes the header/footer in exactly the
 * places that read it; `cacheLife("hours")` makes the lifetime explicit
 * (content changes a few times a day at most — the docs recommend always
 * setting a profile rather than relying on the implicit `default`). The
 * `getSetting` call is server-only, so this module must never be imported from
 * a client component — the chrome receives the resolved strings as props
 * instead.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");

  const site = await getSetting("site");
  if (!site) return DEFAULT_SITE_SETTINGS;

  return {
    title: site.title || DEFAULT_SITE_SETTINGS.title,
    logoUrl: site.logoUrl || "",
    phone: site.phone || "",
    email: site.email || "",
    address: site.address || "",
  };
}
