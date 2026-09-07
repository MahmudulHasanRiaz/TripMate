import { z } from "zod";

// Pure zod schemas for the settings admin surface (the `site` and `home`
// settings rows) — no DB, no server-only, no imports from server modules — so
// it is safe to import from server actions, the service layer, admin server
// components and unit tests alike (the same contract as
// modules/{leads,bookings,payments,expenses}/validation.ts).
//
// FIELD NAMES ARE FROZEN against the seeded rows and their live consumers:
//   - settings.site  <- src/db/seed.ts seedSettings:
//     { title, logoUrl, faviconUrl, searchEngineVisibility, phone, email,
//       address } (+ the optional footerDescription added by this module),
//   - settings.home  <- the marketing home page's readHomeSetting
//     (src/app/(public)/page.tsx) reads EXACTLY:
//     heroHeadline, heroSub, heroButtonLabel, heroButtonLink, heroImage,
//     heroImageAlt. Renaming any key here without touching both consumers
//     silently orphans the stored value.

// ---- shared string/url helpers ----------------------------------------------------

/** Optional CLEARABLE text scalar: null normalizes to undefined (absent), but
 *  an empty string STAYS an empty string — in the settings update semantics
 *  (site-settings.ts) `undefined` means "leave the stored value alone" while
 *  `""` means "the operator cleared the field", so the two must not collapse
 *  into one state the way other modules' optionalBoundedText does. */
function clearableOptionalText(max: number, message: string) {
  return z.preprocess(
    (v) => (v === null ? undefined : v),
    z.string().trim().max(max, message).optional(),
  );
}

/** Root-relative internal path ("/packages", "/media/x.png"). A leading "//"
 *  is deliberately NOT internal — a protocol-relative URL resolves against the
 *  page's scheme and is a classic injection/redirect vector. */
function isInternalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

/** Absolute http(s) URL only — javascript:, data: and friends never pass. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * "URL or empty": "" (field cleared), an absolute http(s) URL (an externally
 * hosted asset), or a root-relative internal path. The internal-path arm is
 * REQUIRED, not a nicety: the seeded site row stores logoUrl "/logo.svg" and
 * faviconUrl "/favicon.svg", and a plain z.string().url() rule would refuse
 * the seeded values — the settings form could then never save without
 * rewriting the brand paths.
 */
const URL_OR_EMPTY_MESSAGE =
  "Enter a full https:// URL, an internal path starting with /, or leave the field empty";

function urlOrEmptyRule(value: string): boolean {
  return value === "" || isHttpUrl(value) || isInternalPath(value);
}

/** REQUIRED key whose value may be empty ("cleared"): "" | http(s) URL | /path. */
function urlOrEmpty(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .refine(urlOrEmptyRule, URL_OR_EMPTY_MESSAGE);
}

/** OPTIONAL urlOrEmpty (undefined = absent from the payload = preserve). */
function optionalUrlOrEmpty(max: number, message: string) {
  return z.preprocess(
    (v) => (v === null ? undefined : v),
    z.string().trim().max(max, message).refine(urlOrEmptyRule, URL_OR_EMPTY_MESSAGE).optional(),
  );
}

// ---- site settings input ------------------------------------------------------------

/**
 * The settings.site row's editable payload (the admin settings form). The
 * seeded row (seedSettings) validates as-is — including the /logo.svg-style
 * internal brand paths. searchEngineVisibility is a strict boolean: string
 * coercions ("true"/"false") are refused so a checkbox wired to real booleans
 * is the only way through (z.coerce.boolean would happily turn the STRING
 * "false" into true).
 */
export const siteSettingsInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Site title is required")
    .max(120, "Site title must be 120 characters or fewer"),
  phone: z
    .string()
    .trim()
    .min(4, "Phone must be at least 4 characters")
    .max(30, "Phone must be 30 characters or fewer"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(254, "Email must be 254 characters or fewer"),
  address: z
    .string()
    .trim()
    .max(300, "Address must be 300 characters or fewer"),
  logoUrl: urlOrEmpty(2048, "Logo URL must be 2048 characters or fewer"),
  faviconUrl: urlOrEmpty(2048, "Favicon URL must be 2048 characters or fewer"),
  searchEngineVisibility: z.boolean(),
  footerDescription: clearableOptionalText(
    500,
    "Footer description must be 500 characters or fewer",
  ),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;

// ---- home settings input --------------------------------------------------------------

/**
 * The settings.home row's editable payload (the hero copy). Every field is
 * optional — the marketing home page (readHomeSetting) keeps its own fallback
 * copy for absent/empty keys, so a partial save only touches what it carries:
 *   - absent (undefined)  → the stored value is preserved,
 *   - "" (empty string)   → the stored value is CLEARED (page fallback renders),
 *   - a value             → the stored value is replaced.
 *
 * heroButtonLink accepts an internal path OR a full http(s) URL OR "" — broader
 * than the current page consumer, which only HONOURS internal paths (external
 * links fall back to /packages). The schema is the storage contract; whether
 * the hero renders an external CTA is a frontend decision.
 */
export const homeSettingsInputSchema = z.object({
  heroHeadline: clearableOptionalText(160, "Headline must be 160 characters or fewer"),
  heroSub: clearableOptionalText(300, "Sub-headline must be 300 characters or fewer"),
  heroImage: optionalUrlOrEmpty(2048, "Hero image URL must be 2048 characters or fewer"),
  heroButtonLabel: clearableOptionalText(40, "Button label must be 40 characters or fewer"),
  heroButtonLink: optionalUrlOrEmpty(200, "Button link must be 200 characters or fewer"),
  heroImageAlt: clearableOptionalText(160, "Image alt text must be 160 characters or fewer"),
});
export type HomeSettingsInput = z.infer<typeof homeSettingsInputSchema>;
