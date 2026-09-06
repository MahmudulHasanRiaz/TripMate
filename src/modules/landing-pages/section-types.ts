import { z } from "zod";

// Pure, shared landing-page section + lead-form types for Plan 4's landing
// builder. NO DB / NO server-only here — this file is safe to import from the
// client builder, the leads submit action and the service layer alike (same
// contract as modules/content/validation.ts).
//
// Two families live together because the builder edits both:
//   1. SECTION_TYPES / per-type config schemas / CONTENT_FIELDS — the page
//      skeleton a builder author composes top-to-bottom. Each row is
//      `{ type, config, order? }`; the array is the visual order.
//   2. The landing LEAD form (`formConfig`) — the field set an advertiser wants
//      a visitor to fill in. `buildLeadSchema(formConfig)` turns a config into
//      the zod schema the leads submit action validates submissions against.
//
// Config scalars are normalized on parse: optional strings that arrive blank
// are dropped (no `sub: ""` in stored jsonb); required scalars must be
// non-empty after trim.

export const SECTION_TYPES = [
  "hero",
  "benefits",
  "packageShowcase",
  "gallery",
  "testimonials",
  "faq",
  "countdown",
  "stickyCta",
  "whatsappCta",
  "form",
  "thankYou",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
export const sectionTypeSchema = z.enum(SECTION_TYPES);

// ---- generic string field builders -----------------------------------------

/** Required text scalar: trimmed, non-empty after trim. */
function requiredText(message: string, max: number): z.ZodString {
  return z.string().trim().min(1, message).max(max);
}

/**
 * Optional text scalar. Blank (""), whitespace-only or null all collapse to
 * `undefined` so stored config objects never carry empty strings for optional
 * keys; an absent/undefined value passes straight through.
 */
function optionalText(
  max: number,
): z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown> {
  return z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().max(max).optional(),
  );
}

const OPTIONAL_IMAGE_URL = optionalText(2048);

function imageUrlRequired() {
  return requiredText("Image URL is required", 2048);
}

/** A trimmed string that must be a valid UUID (listing ids in packageShowcase). */
const uuidStringSchema = z.string().uuid("Package id must be a valid UUID");

// ---- per-type config schemas -------------------------------------------------
//
// These are the STRICT saved shapes: type mismatches reject (that is what
// "config coerced through the per-type schema" means at save time). Arrays with
// no explicit min bound in the Plan-4 spec default to min 0 so a draft section
// can exist before it is populated; benefits is min 1 per spec.

export const heroConfigSchema = z
  .object({
    headline: requiredText("Hero headline is required", 300),
    sub: optionalText(1000),
    imageUrl: OPTIONAL_IMAGE_URL,
    ctaLabel: optionalText(120),
    ctaHref: optionalText(2048),
  })
  .superRefine((cfg, ctx) => {
    const hasLabel = Boolean(cfg.ctaLabel?.trim());
    const hasHref = Boolean(cfg.ctaHref?.trim());
    if (hasLabel !== hasHref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLabel ? ["ctaHref"] : ["ctaLabel"],
        message: "CTA label and link must be provided together",
      });
    }
  });
export type HeroConfig = z.infer<typeof heroConfigSchema>;

export const benefitItemSchema = z.object({
  icon: optionalText(120),
  title: requiredText("Benefit title is required", 200),
  text: requiredText("Benefit text is required", 1000),
});
export type BenefitItem = z.infer<typeof benefitItemSchema>;

export const benefitsConfigSchema = z.object({
  items: z
    .array(benefitItemSchema)
    .min(1, "Add at least one benefit")
    .max(6, "Up to 6 benefits per section"),
});
export type BenefitsConfig = z.infer<typeof benefitsConfigSchema>;

export const packageShowcaseConfigSchema = z.object({
  listingIds: z
    .array(uuidStringSchema)
    .max(6, "Showcase up to 6 packages"), // min 0: a placeholder row may precede the pick
});
export type PackageShowcaseConfig = z.infer<typeof packageShowcaseConfigSchema>;

export const galleryImageSchema = z.object({
  url: imageUrlRequired(),
  alt: optionalText(200),
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;

export const galleryConfigSchema = z.object({
  images: z.array(galleryImageSchema).max(60, "Up to 60 images per gallery"),
});
export type GalleryConfig = z.infer<typeof galleryConfigSchema>;

export const testimonialItemSchema = z.object({
  quote: requiredText("Testimonial quote is required", 2000),
  name: requiredText("Testimonial name is required", 200),
  trip: optionalText(300),
});
export type TestimonialItem = z.infer<typeof testimonialItemSchema>;

export const testimonialsConfigSchema = z.object({
  items: z.array(testimonialItemSchema).max(24, "Up to 24 testimonials"),
});
export type TestimonialsConfig = z.infer<typeof testimonialsConfigSchema>;

export const faqItemSchema = z.object({
  q: requiredText("FAQ question is required", 500),
  a: requiredText("FAQ answer is required", 4000),
});
export type FaqItem = z.infer<typeof faqItemSchema>;

export const faqConfigSchema = z.object({
  items: z.array(faqItemSchema).max(50, "Up to 50 FAQ entries"),
});
export type FaqConfig = z.infer<typeof faqConfigSchema>;

/** Countdown target must parse as a date-time (ISO or a date the browser can
 *  count down to). Past targets are the author's choice, not a schema error. */
const isoDateStringSchema = z
  .string()
  .trim()
  .min(1, "Countdown target date is required")
  .max(64)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date-time (e.g. 2026-12-31T23:59:59)");

export const countdownConfigSchema = z.object({
  targetDate: isoDateStringSchema,
  label: optionalText(200),
});
export type CountdownConfig = z.infer<typeof countdownConfigSchema>;

export const stickyCtaConfigSchema = z.object({
  text: requiredText("CTA text is required", 300),
  phone: requiredText("Phone number is required", 40),
});
export type StickyCtaConfig = z.infer<typeof stickyCtaConfigSchema>;

export const whatsappCtaConfigSchema = z.object({
  text: requiredText("WhatsApp CTA text is required", 300),
  phone: requiredText("WhatsApp number is required", 40),
  prefill: optionalText(1000),
});
export type WhatsappCtaConfig = z.infer<typeof whatsappCtaConfigSchema>;

/** A `form` section is a placement MARKER for the LeadForm island; the actual
 *  field set lives in the page-level `formConfig`. Empty config is the signal. */
export const formSectionConfigSchema = z.object({});
export type FormSectionConfig = z.infer<typeof formSectionConfigSchema>;

export const thankYouConfigSchema = z.object({
  message: requiredText("Thank-you message is required", 1000),
  redirectUrl: optionalText(2048),
});
export type ThankYouConfig = z.infer<typeof thankYouConfigSchema>;

// ---- section rows -------------------------------------------------------------

const orderSchema = z.coerce.number().int("Order must be a whole number").min(0).optional();

/** One typed page row: `type` discriminates, `config` is validated by that
 *  type's schema, `order` is accepted/echoed but the array is the visual order. */
function section<TConfigSchema extends z.ZodTypeAny>(
  type: SectionType,
  configSchema: TConfigSchema,
) {
  return z.object({
    type: z.literal(type),
    config: configSchema,
    order: orderSchema,
  });
}

export const landingSectionUnionSchema = z.discriminatedUnion("type", [
  section("hero", heroConfigSchema),
  section("benefits", benefitsConfigSchema),
  section("packageShowcase", packageShowcaseConfigSchema),
  section("gallery", galleryConfigSchema),
  section("testimonials", testimonialsConfigSchema),
  section("faq", faqConfigSchema),
  section("countdown", countdownConfigSchema),
  section("stickyCta", stickyCtaConfigSchema),
  section("whatsappCta", whatsappCtaConfigSchema),
  section("form", formSectionConfigSchema),
  section("thankYou", thankYouConfigSchema),
]);

// The section-row types are declared as an EXPLICIT discriminated union rather
// than `z.infer`d from the schema: a zod-discriminated-union inference is not
// always recognized by TS as a discriminated union (its `type` key can widen to
// the SectionType union), which breaks `.type` narrowing in the service and
// renderer. These aliases carry the same literal discriminants so callers get
// reliable narrowing; they are structurally identical to what the schema parses.
export type HeroSection = { type: "hero"; config: HeroConfig; order?: number };
export type BenefitsSection = { type: "benefits"; config: BenefitsConfig; order?: number };
export type PackageShowcaseSection = {
  type: "packageShowcase";
  config: PackageShowcaseConfig;
  order?: number;
};
export type GallerySection = { type: "gallery"; config: GalleryConfig; order?: number };
export type TestimonialsSection = { type: "testimonials"; config: TestimonialsConfig; order?: number };
export type FaqSection = { type: "faq"; config: FaqConfig; order?: number };
export type CountdownSection = { type: "countdown"; config: CountdownConfig; order?: number };
export type StickyCtaSection = { type: "stickyCta"; config: StickyCtaConfig; order?: number };
export type WhatsappCtaSection = { type: "whatsappCta"; config: WhatsappCtaConfig; order?: number };
export type FormSection = { type: "form"; config: FormSectionConfig; order?: number };
export type ThankYouSection = { type: "thankYou"; config: ThankYouConfig; order?: number };

export type LandingSection =
  | HeroSection
  | BenefitsSection
  | PackageShowcaseSection
  | GallerySection
  | TestimonialsSection
  | FaqSection
  | CountdownSection
  | StickyCtaSection
  | WhatsappCtaSection
  | FormSection
  | ThankYouSection;

/** A landing page needs at least one section (same rule as content pages). */
export const landingSectionsSchema = z
  .array(landingSectionUnionSchema)
  .min(1, "A landing page needs at least one section")
  .max(200, "Too many sections");
export type LandingSections = z.infer<typeof landingSectionsSchema>;

// ---- CONTENT_FIELDS: builder config-form descriptor ---------------------------
//
// For every section type, the list of config keys the builder renders into a
// form. `kind` selects the input control. For `repeatable` entries the array is
// the per-type config's item array (add/remove rows); the item shape is defined
// by that type's config schema in this module.

export const CONTENT_FIELD_KINDS = [
  "text",
  "textarea",
  "image",
  "select",
  "number",
  "checkbox",
  "repeatable",
] as const;
export type ContentFieldKind = (typeof CONTENT_FIELD_KINDS)[number];

export type ContentField = { key: string; label: string; kind: ContentFieldKind };

export const CONTENT_FIELDS: Record<SectionType, ContentField[]> = {
  hero: [
    { key: "headline", label: "Headline", kind: "text" },
    { key: "sub", label: "Subheadline", kind: "textarea" },
    { key: "imageUrl", label: "Background image URL", kind: "image" },
    { key: "ctaLabel", label: "CTA button text", kind: "text" },
    { key: "ctaHref", label: "CTA link", kind: "text" },
  ],
  benefits: [{ key: "items", label: "Benefits", kind: "repeatable" }],
  packageShowcase: [{ key: "listingIds", label: "Packages", kind: "repeatable" }],
  gallery: [{ key: "images", label: "Images", kind: "repeatable" }],
  testimonials: [{ key: "items", label: "Testimonials", kind: "repeatable" }],
  faq: [{ key: "items", label: "FAQ entries", kind: "repeatable" }],
  countdown: [
    { key: "targetDate", label: "Target date/time (ISO)", kind: "text" },
    { key: "label", label: "Countdown label", kind: "text" },
  ],
  stickyCta: [
    { key: "text", label: "CTA text", kind: "text" },
    { key: "phone", label: "Phone number", kind: "text" },
  ],
  whatsappCta: [
    { key: "text", label: "CTA text", kind: "text" },
    { key: "phone", label: "WhatsApp number", kind: "text" },
    { key: "prefill", label: "Prefilled message", kind: "textarea" },
  ],
  form: [],
  thankYou: [
    { key: "message", label: "Thank-you message", kind: "textarea" },
    { key: "redirectUrl", label: "Redirect URL (optional)", kind: "text" },
  ],
};

// ---- the landing LEAD form (formConfig) --------------------------------------

export const LANDING_FORM_FIELD_TYPES = [
  "text",
  "tel",
  "email",
  "select",
  "textarea",
  "date",
] as const;
export type LandingFormFieldType = (typeof LANDING_FORM_FIELD_TYPES)[number];

/**
 * Field keys an author may NOT use: the leads module treats a non-empty
 * `company_website` value as the honeypot (a bot marker) at submit time and
 * silently drops such payloads, so a legitimate author field with that key
 * would swallow every genuine fill. The runtime honeypot check stays; blocking
 * the key here closes the collision at authoring time. Keep in sync with
 * HONEYPOT_FIELD in @/modules/leads/validation (a test asserts the overlap).
 */
export const RESERVED_FORM_FIELD_KEYS: readonly string[] = ["company_website"];

/** Key must be form-safe (used as a formData property key and the stored
 *  jsonb row key) — lowercase letters/numbers joined by - or _ — and must not
 *  collide with a key the platform reserves (e.g. the honeypot). */
const fieldKeySchema = z
  .string()
  .trim()
  .min(1, "Field key is required")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/,
    "Field key must be lowercase letters/numbers separated by - or _",
  )
  .refine(
    (key) => !RESERVED_FORM_FIELD_KEYS.includes(key),
    (key) => ({
      message: `"${key}" is reserved by the platform and cannot be used as a field key`,
    }),
  );

export const landingFormFieldSchema = z
  .object({
    key: fieldKeySchema,
    label: z.string().trim().min(1, "Field label is required").max(200),
    type: z.enum(LANDING_FORM_FIELD_TYPES),
    required: z.boolean().default(false),
    placeholder: optionalText(200),
    options: z.array(z.string().trim().min(1, "Option cannot be blank").max(300)).max(50).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select") {
      if (!field.options || field.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Select fields need at least one option",
        });
      }
    } else if (field.options && field.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Options only apply to select fields",
      });
    }
  });
export type LandingFormField = z.infer<typeof landingFormFieldSchema>;

/** The landing's lead-capture form: an optional heading plus 1-6 fields whose
 *  `key`s are unique (each key maps to one formData property on submit). */
export const formConfigSchema = z
  .object({
    title: optionalText(200),
    subtitle: optionalText(500),
    fields: z
      .array(landingFormFieldSchema)
      .min(1, "Add at least one form field")
      .max(6, "Up to 6 fields per form"),
  })
  .superRefine((config, ctx) => {
    const seen = new Set<string>();
    config.fields.forEach((field, index) => {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "key"],
          message: `Duplicate field key "${field.key}"`,
        });
      }
      seen.add(field.key);
    });
  });
export type FormConfig = z.infer<typeof formConfigSchema>;

export type LeadFormData = Record<string, string>;

/** 7–15 digits after stripping separators — lenient enough for international
 *  numbers (+880…, +1…) while refusing alphabetics and bare dashes. */
function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^\+?[\d\s().-]+$/.test(value);
}

const EMAIL_REQUIRED_MESSAGE = "Enter a valid email address";
const PHONE_REQUIRED_MESSAGE = "Enter a valid phone number";
const DATE_REQUIRED_MESSAGE = "Enter a valid date (YYYY-MM-DD)";
const OPTIONS_REQUIRED_MESSAGE = "Select one of the available options";

// Length caps for free-text lead values. A landing form is public and
// rate-limited (10/min/IP), so an unbounded text/textarea value would let a
// visitor persist arbitrary-length strings into leads.message + form_data jsonb
// (a DB-bloat/capacity vector). text and textarea have no content-level check,
// so they get an explicit cap here; the other types are structurally bounded
// by their own content checks (date shape, one-of-options, phone digit range,
// email format) and share the permissive-but-finite trim path below.
const TEXT_VALUE_MAX = 500;
const TEXTAREA_VALUE_MAX = 4000;

/** Per-field content check, message or null. Blank handling is separate: a
 *  blank only fails when the field is required. */
function contentError(value: string, field: LandingFormField): string | null {
  switch (field.type) {
    case "email":
      return z.string().email(EMAIL_REQUIRED_MESSAGE).safeParse(value).success ? null : EMAIL_REQUIRED_MESSAGE;
    case "tel":
      return looksLikePhone(value) ? null : PHONE_REQUIRED_MESSAGE;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : DATE_REQUIRED_MESSAGE;
    case "select":
      return field.options?.includes(value) ? null : OPTIONS_REQUIRED_MESSAGE;
    case "text":
    case "textarea":
    default:
      return null;
  }
}

/**
 * The zod rule for ONE configured form field's submitted value — the shared
 * primitive both `buildLeadSchema` and the leads submit action compose over.
 * A value is trimmed; blank passes when the field is optional, fails with
 * "This field is required" when it is required; a non-blank value must satisfy
 * its type (email / phone / date / one-of-options) and its length cap (free
 * text is capped at 500 chars, free-form multi-line at 4000). The returned
 * schema always yields a string (the trimmed answer).
 */
export function leadSchemaFieldRules(field: LandingFormField) {
  const stringRules = z.string().trim();
  const capped =
    field.type === "textarea"
      ? stringRules.max(
          TEXTAREA_VALUE_MAX,
          `This field is limited to ${TEXTAREA_VALUE_MAX} characters`,
        )
      : field.type === "text"
        ? stringRules.max(
            TEXT_VALUE_MAX,
            `This field is limited to ${TEXT_VALUE_MAX} characters`,
          )
        : stringRules;
  return capped.refine(
    (value) => {
      if (value === "") return !field.required;
      return contentError(value, field) === null;
    },
    (value) => ({
      message:
        value === "" && field.required
          ? "This field is required"
          : contentError(value, field) ?? "Invalid value",
    }),
  );
}

/**
 * The submission schema for a configured landing form. Produces an object with
 * ONE property per configured field (its trimmed value), then guarantees the
 * visitor is reachable: at least one configured email/tel field must hold a
 * value. A form with no reachable field at all (or none configured) can never
 * satisfy that guarantee and rejects every payload with a clear message — such
 * a form cannot produce a storable lead (the leads row requires contact info).
 */
export function buildLeadSchema(
  formConfig: Pick<FormConfig, "title" | "subtitle" | "fields">,
) {
  const fields = Array.isArray(formConfig?.fields)
    ? formConfig.fields.filter((f) => Boolean(f) && typeof f.key === "string" && f.key !== "")
    : [];

  const reachable = fields.filter((f) => f.type === "email" || f.type === "tel");
  const shape: Record<string, z.ZodType<string>> = {};
  for (const field of fields) shape[field.key] = leadSchemaFieldRules(field);

  return z.object(shape).superRefine((data, ctx) => {
    if (fields.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This landing page has no lead form fields configured.",
      });
      return;
    }
    const missing = reachable.filter((f) => (data[f.key] ?? "").trim() === "");
    if (missing.length === reachable.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: reachable[0] ? [reachable[0].key] : [],
        message: reachable[0]
          ? "Provide at least a phone number or an email so we can reach you"
          : "This form needs a phone or email field to collect a reachable lead",
      });
    }
  });
}
