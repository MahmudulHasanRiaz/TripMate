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

// ---- contact channel helpers (floating chat widget) ---------------------------------
// Defined BEFORE siteSettingsInputSchema: messenger/instagram rules are const
// (not hoisted), so they must exist before the schema object evaluates them.
function optionalPhone(max: number, message: string) {
  return z.preprocess(
    (v) => (v === null || v === undefined ? undefined : v),
    z
      .string()
      .trim()
      .max(max, message)
      .refine((v) => v === "" || /^[+()\-.\s\d]+$/.test(v), "Enter a valid phone number")
      .optional(),
  );
}

/** Messenger username or page ID (letters, digits, dots — no URL, no spaces). */
const messengerUsernameRule = z.preprocess(
  (v) => (v === null || v === undefined ? undefined : v),
  z
    .string()
    .trim()
    .max(100, "Messenger username must be 100 characters or fewer")
    .refine(
      (v) => v === "" || /^[A-Za-z0-9.]+$/.test(v),
      "Enter just the username (letters, numbers, dots) — not a full URL",
    )
    .optional(),
);

/** Instagram handle (with or without leading @) or a full instagram.com URL. */
const instagramHandleRule = z.preprocess(
  (v) => (v === null || v === undefined ? undefined : v),
  z
    .string()
    .trim()
    .max(150, "Instagram value must be 150 characters or fewer")
    .refine(
      (v) =>
        v === "" ||
        isHttpUrl(v) ||
        /^@?[A-Za-z0-9._]+$/.test(v),
      "Enter the @handle or a full https://instagram.com/… URL",
    )
    .optional(),
);

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
  // Brand lockup mode (Follow-up 09 §3) — a SELECT in the admin form, never
  // free text. Optional: payloads that predate the field preserve the
  // stored mode (updateSiteSettings falls back to the current value).
  logoDisplay: z.enum(["icon-name", "logo-only"]).optional(),
  faviconUrl: urlOrEmpty(2048, "Favicon URL must be 2048 characters or fewer"),
  searchEngineVisibility: z.boolean(),
  footerDescription: clearableOptionalText(
    500,
    "Footer description must be 500 characters or fewer",
  ),
  // Floating chat-widget channels — ALL optional: absent preserves, "" clears
  // (hides that icon), a value replaces. optionalPhone/messenger/instagram
  // rules already return optional schemas, so no second .optional() here —
  // double-optional breaks the inferred input type (never vs string|undefined).
  whatsappNumber: optionalPhone(30, "WhatsApp number must be 30 characters or fewer"),
  whatsappPrefill: clearableOptionalText(300, "WhatsApp prefill must be 300 characters or fewer"),
  messengerUsername: messengerUsernameRule,
  callNumber: optionalPhone(30, "Call number must be 30 characters or fewer"),
  instagramHandle: instagramHandleRule,
  footerColumns: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Column title is required").max(60),
        links: z
          .array(
            z.object({
              label: z.string().trim().min(1, "Link label is required").max(80),
              href: z.string().trim().min(1, "Link URL is required").max(500),
            }),
          )
          .max(12),
      }),
    )
    .max(4)
    .optional(),
  footerSocials: z
    .array(
      z.object({
        network: z.string().trim().min(1, "Network is required").max(40),
        href: z.string().trim().min(1, "URL is required").max(500),
      }),
    )
    .max(8)
    .optional(),
  copyright: clearableOptionalText(200, "Copyright must be 200 characters or fewer"),
  // Accreditation badges (Follow-up 09 §5) — optional: absent preserves the
  // stored list. imageUrl may be "" (credential tile without a logo, e.g. a
  // license number); label is the one required text.
  accreditations: z
    .array(
      z.object({
        imageUrl: urlOrEmpty(2048, "Badge image URL must be 2048 characters or fewer"),
        label: z.string().trim().min(1, "Badge label is required").max(60),
        sublabel: z.string().trim().max(80),
      }),
    )
    .max(8)
    .optional(),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;

// ---- dedicated contact-channels save schema (admin Contact Channels card) ----
// Same five fields as standalone object: lets the Contact tab save channels
// without touching brand fields. Link contracts live in
// src/components/site/contact-channels.ts:
//   whatsappNumber -> https://wa.me/<digits>?text=<encoded prefill>
//   messengerUsername -> https://m.me/<username>
//   callNumber -> tel:+<digits>
//   instagramHandle -> https://instagram.com/<handle>

export const contactChannelsSchema = z.object({
  whatsappNumber: optionalPhone(30, "WhatsApp number must be 30 characters or fewer"),
  whatsappPrefill: clearableOptionalText(
    300,
    "WhatsApp prefill must be 300 characters or fewer",
  ),
  messengerUsername: messengerUsernameRule,
  callNumber: optionalPhone(30, "Call number must be 30 characters or fewer"),
  instagramHandle: instagramHandleRule,
});
export type ContactChannelsInput = z.infer<typeof contactChannelsSchema>;

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
  featuredKicker: clearableOptionalText(80, "Featured kicker must be 80 characters or fewer"),
  featuredTitle: clearableOptionalText(100, "Featured title must be 100 characters or fewer"),
  featuredLead: clearableOptionalText(240, "Featured lead must be 240 characters or fewer"),
  ctaHeadline: clearableOptionalText(140, "CTA headline must be 140 characters or fewer"),
  ctaSub: clearableOptionalText(300, "CTA sub-headline must be 300 characters or fewer"),
  stats: z.array(
    z.object({
      value: z.string().trim().min(1, "Stat value is required").max(24),
      label: z.string().trim().min(1, "Stat label is required").max(80),
    }),
  ).max(6).optional(),
  testimonials: z.array(
    z.object({
      quote: z.string().trim().min(1, "Testimonial quote is required").max(500),
      name: z.string().trim().min(1, "Testimonial name is required").max(140),
      trip: z.string().trim().max(200).nullable().optional(),
    }),
  ).max(12).optional(),
  showHero: z.boolean().optional(),
  showFeatured: z.boolean().optional(),
  showCta: z.boolean().optional(),
  showStats: z.boolean().optional(),
  showTestimonials: z.boolean().optional(),
});
export type HomeSettingsInput = z.infer<typeof homeSettingsInputSchema>;
