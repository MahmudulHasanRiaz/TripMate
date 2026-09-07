import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
// getSetting/setSetting are the existing (loosely typed) settings access layer;
// this module is the typed, field-frozen wrapper over the same two rows.
import { getSetting, setSetting } from "./service";
import type { HomeSettingsInput, SiteSettingsInput } from "./site-settings-validation";

// Typed reads + writes for the settings.site and settings.home rows — the
// surface the admin settings page consumes (and the (public) layout reads for
// metadata via getPublicSiteSettings). Server-only — importing it into a client
// bundle fails the build. Conventions mirror the other module services:
//   - settings.value is free-form jsonb at rest: EVERY read projects the raw
//     row defensively onto the documented shapes (a missing/partial/corrupt
//     row degrades to defaults, never a null and never a thrown parse), and
//     every write persists the fully-merged canonical row,
//   - NO updateTag here — cache expiry belongs to the guarded actions layer
//     (site-settings-actions.ts), the same contract as every other module's
//     service: updateTag throws outside a Server Action request, so a service
//     that called it would break scripts/tests that legitimately reuse these
//     fns. Every save through saveSiteSettingsAction / saveHomeSettingsAction
//     expires CACHE_TAGS.settings (see the plan-6 carry-over: ALL settings
//     mutations must expire that tag).
//
// Field names are FROZEN against the seed (src/db/seed.ts seedSettings) and the
// (public) home page consumer (readHomeSetting) — see
// site-settings-validation.ts for the exact key lists.

// ---- site row ---------------------------------------------------------------------

/** Every field the settings.site row carries (the persisted shape + the admin
 *  form's field list). Kept in lockstep with the SiteSettings type — the
 *  `satisfies` below fails the build if a listed key is not a SiteSettings
 *  field. */
export const SITE_SETTING_KEYS = [
  "title",
  "phone",
  "email",
  "address",
  "logoUrl",
  "faviconUrl",
  "searchEngineVisibility",
  "footerDescription",
] as const satisfies readonly (keyof SiteSettings)[];

export type SiteSettings = {
  title: string;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  faviconUrl: string;
  searchEngineVisibility: boolean;
  footerDescription: string | null;
};

/** Brand shown before the setup wizard seeds a `site` row — the seed row's own
 *  values, so a seeded deployment reads back exactly what seedSettings wrote.
 *  searchEngineVisibility defaults TRUE: an absent row means "public site,
 *  indexable", never a silent noindex. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  title: "TripMate",
  phone: "",
  email: "",
  address: "",
  logoUrl: "",
  faviconUrl: "",
  searchEngineVisibility: true,
  footerDescription: null,
};

/** Project a raw jsonb cell onto Record<string, unknown> | null (jsonb may hold
 *  anything; only objects are settings rows). */
function asRow(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Merge one stored string over its default: present-and-non-empty wins, and
 *  the empty-string-is-falsy rule means a cleared field reads back as its
 *  default (the same rule lib/site-settings.ts applies). */
function mergedString(row: Record<string, unknown>, key: string, fallback: string): string {
  const value = row[key];
  return typeof value === "string" && value !== "" ? value : fallback;
}

/**
 * The settings.site row merged over the defaults — NEVER null, safe to feed
 * straight into the admin form or (public) metadata. Uncached by design: the
 * admin settings page is a dynamic server component and needs read-your-writes
 * after a save (the cached public read is getPublicSiteSettings below).
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const row = asRow(await getSetting("site"));
  const footer = row.footerDescription;
  return {
    title: mergedString(row, "title", DEFAULT_SITE_SETTINGS.title),
    phone: mergedString(row, "phone", DEFAULT_SITE_SETTINGS.phone),
    email: mergedString(row, "email", DEFAULT_SITE_SETTINGS.email),
    address: mergedString(row, "address", DEFAULT_SITE_SETTINGS.address),
    logoUrl: mergedString(row, "logoUrl", DEFAULT_SITE_SETTINGS.logoUrl),
    faviconUrl: mergedString(row, "faviconUrl", DEFAULT_SITE_SETTINGS.faviconUrl),
    searchEngineVisibility:
      typeof row.searchEngineVisibility === "boolean"
        ? row.searchEngineVisibility
        : DEFAULT_SITE_SETTINGS.searchEngineVisibility,
    footerDescription: typeof footer === "string" && footer !== "" ? footer : null,
  };
}

/**
 * Update-semantics helper for optional text fields: `undefined` (absent from
 * the payload) preserves the stored value, `""` CLEARS it (stored as null),
 * anything else replaces it. The schema has already trimmed the input.
 */
function mergedText(existing: string | null, incoming: string | undefined): string | null {
  if (incoming === undefined) return existing;
  return incoming === "" ? null : incoming;
}

/**
 * Save the site settings: the validated input overlays the current row (only
 * footerDescription is partial-update-aware — every other field is required by
 * the schema and always lands), and the FULL merged row is persisted so the
 * stored value never accretes legacy keys. Returns the row as stored.
 */
export async function updateSiteSettings(input: SiteSettingsInput): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const next: SiteSettings = {
    title: input.title,
    phone: input.phone,
    email: input.email,
    address: input.address,
    logoUrl: input.logoUrl,
    faviconUrl: input.faviconUrl,
    searchEngineVisibility: input.searchEngineVisibility,
    footerDescription: mergedText(current.footerDescription, input.footerDescription),
  };
  await setSetting("site", next);
  return next;
}

// ---- home row -----------------------------------------------------------------------

export type HomeSettings = {
  heroHeadline: string | null;
  heroSub: string | null;
  heroImage: string | null;
  heroButtonLabel: string | null;
  heroButtonLink: string | null;
  heroImageAlt: string | null;
};

/**
 * The settings.home row projected onto the hero keys the (public) home page
 * consumes (readHomeSetting) — NEVER null. Absent/empty keys read as null and
 * the PAGE supplies its marketing fallback copy; the admin form renders
 * placeholders instead of pre-filling fake "saved" defaults.
 */
export async function getHomeSettings(): Promise<HomeSettings> {
  const row = asRow(await getSetting("home"));
  const text = (key: string): string | null => {
    const value = row[key];
    return typeof value === "string" && value !== "" ? value : null;
  };
  return {
    heroHeadline: text("heroHeadline"),
    heroSub: text("heroSub"),
    heroImage: text("heroImage"),
    heroButtonLabel: text("heroButtonLabel"),
    heroButtonLink: text("heroButtonLink"),
    heroImageAlt: text("heroImageAlt"),
  };
}

/**
 * Save the hero copy: a partial payload touches only the keys it carries
 * (undefined preserves, "" clears, a value replaces — mergedText), and the
 * canonical six-key row is persisted. Returns the row as stored.
 */
export async function updateHomeSettings(input: HomeSettingsInput): Promise<HomeSettings> {
  const current = await getHomeSettings();
  const next: HomeSettings = {
    heroHeadline: mergedText(current.heroHeadline, input.heroHeadline),
    heroSub: mergedText(current.heroSub, input.heroSub),
    heroImage: mergedText(current.heroImage, input.heroImage),
    heroButtonLabel: mergedText(current.heroButtonLabel, input.heroButtonLabel),
    heroButtonLink: mergedText(current.heroButtonLink, input.heroButtonLink),
    heroImageAlt: mergedText(current.heroImageAlt, input.heroImageAlt),
  };
  await setSetting("home", next);
  return next;
}

// ---- cached public read ---------------------------------------------------------------

/**
 * Cached read of the site identity for the (public) root layout's metadata
 * (title/favicon/noindex) — the same Cache Components contract the public
 * chrome uses (lib/site-settings.ts), but returning the FULL site row
 * (searchEngineVisibility included — that flag is exactly what the metadata
 * robots decision needs). 'use cache' + cacheTag means an admin save calling
 * updateTag(CACHE_TAGS.settings) refreshes every public metadata read at once;
 * cacheLife("hours") keeps the lifetime explicit. Plain strings/booleans/null
 * only — no Dates, so the entry is fully serializable.
 */
export async function getPublicSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(CACHE_TAGS.settings);
  cacheLife("hours");

  return getSiteSettings();
}
