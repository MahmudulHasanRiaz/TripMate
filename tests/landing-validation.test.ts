import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  benefitsConfigSchema,
  buildLeadSchema,
  CONTENT_FIELDS,
  countdownConfigSchema,
  faqConfigSchema,
  formConfigSchema,
  galleryConfigSchema,
  heroConfigSchema,
  landingSectionUnionSchema,
  landingSectionsSchema,
  LANDING_FORM_FIELD_TYPES,
  landingFormFieldSchema,
  packageShowcaseConfigSchema,
  RESERVED_FORM_FIELD_KEYS,
  SECTION_TYPES,
  sectionTypeSchema,
  stickyCtaConfigSchema,
  testimonialsConfigSchema,
  thankYouConfigSchema,
  whatsappCtaConfigSchema,
} from "@/modules/landing-pages/section-types";
import type { LandingFormField } from "@/modules/landing-pages/section-types";
import { HONEYPOT_FIELD } from "@/modules/leads/validation";
import {
  landingPageInput,
  LANDING_PAGE_STATUSES,
  statusSchema,
} from "@/modules/landing-pages/validation";

// Pure validation tests — no DB. Covers the shared section + lead-form schema
// family (section-types.ts) and the page input (validation.ts).

describe("SECTION_TYPES + CONTENT_FIELDS surface", () => {
  it("exposes the 11 documented section types", () => {
    expect(SECTION_TYPES).toEqual([
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
    ]);
    expect(sectionTypeSchema.enum).toHaveProperty("hero");
  });

  it("CONTENT_FIELDS covers every section type with {key,label,kind} rows", () => {
    for (const type of SECTION_TYPES) {
      const fields = CONTENT_FIELDS[type];
      expect(Array.isArray(fields)).toBe(true);
      for (const field of fields) {
        expect(typeof field.key).toBe("string");
        expect(typeof field.label).toBe("string");
        expect(["text", "textarea", "image", "select", "number", "checkbox", "repeatable"]).toContain(
          field.kind,
        );
      }
    }
    // hero drives a headline + image inputs; the form section has no scalar config.
    expect(CONTENT_FIELDS.hero.some((f) => f.key === "headline")).toBe(true);
    expect(CONTENT_FIELDS.hero.some((f) => f.kind === "image")).toBe(true);
    expect(CONTENT_FIELDS.form).toEqual([]);
  });
});

describe("hero config", () => {
  const ok = {
    headline: "Umrah packages 2026",
    sub: "Visa, flights and hotels handled",
    imageUrl: "https://cdn.example/hero.jpg",
    ctaLabel: "Get a quote",
    ctaHref: "/contact",
  };

  it("accepts a fully populated hero", () => {
    expect(heroConfigSchema.safeParse(ok).success).toBe(true);
  });

  it("requires a headline", () => {
    const r = heroConfigSchema.safeParse({ ...ok, headline: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path.join(".")).toBe("headline");
  });

  it("drops blank optional fields on parse (no stored empty strings)", () => {
    const parsed = heroConfigSchema.parse({
      ...ok,
      sub: "   ",
      imageUrl: "",
      ctaLabel: "",
      ctaHref: "",
    });
    expect(parsed.sub).toBeUndefined();
    expect(parsed.imageUrl).toBeUndefined();
    expect(parsed.ctaLabel).toBeUndefined();
    expect(parsed.ctaHref).toBeUndefined();
  });

  it("refuses a CTA label without a link (and vice-versa)", () => {
    const labelOnly = heroConfigSchema.safeParse({ ...ok, ctaHref: "" });
    expect(labelOnly.success).toBe(false);
    if (!labelOnly.success) expect(labelOnly.error.issues[0].path.join(".")).toBe("ctaHref");

    const hrefOnly = heroConfigSchema.safeParse({ ...ok, ctaLabel: "" });
    expect(hrefOnly.success).toBe(false);
    if (!hrefOnly.success) expect(hrefOnly.error.issues[0].path.join(".")).toBe("ctaLabel");
  });

  it("allows a headline-only hero (no sub/image/cta)", () => {
    expect(heroConfigSchema.safeParse({ headline: "Just a headline" }).success).toBe(true);
  });
});

describe("benefits config", () => {
  const one = { icon: "✈️", title: "Direct flights", text: "Fly without layovers." };

  it("accepts 1-6 benefit items", () => {
    expect(benefitsConfigSchema.safeParse({ items: [one] }).success).toBe(true);
    const six = Array.from({ length: 6 }, () => ({ ...one }));
    expect(benefitsConfigSchema.safeParse({ items: six }).success).toBe(true);
  });

  it("rejects zero items (min 1)", () => {
    const r = benefitsConfigSchema.safeParse({ items: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/at least one/i);
  });

  it("rejects more than 6 items", () => {
    const seven = Array.from({ length: 7 }, () => ({ ...one }));
    expect(benefitsConfigSchema.safeParse({ items: seven }).success).toBe(false);
  });

  it("rejects an item missing its title or text; icon is optional", () => {
    expect(benefitsConfigSchema.safeParse({ items: [{ icon: "x", text: "no title" }] }).success).toBe(false);
    expect(benefitsConfigSchema.safeParse({ items: [{ title: "t", text: "" }] }).success).toBe(false);
    expect(benefitsConfigSchema.safeParse({ items: [{ title: "t", text: "ok" }] }).success).toBe(true);
  });
});

describe("packageShowcase config", () => {
  const id = "6d0a6b6a-4f7a-4b0a-9f22-1c3f6d4f2a1b";

  it("accepts an empty or full pick list (min 0, max 6)", () => {
    expect(packageShowcaseConfigSchema.safeParse({ listingIds: [] }).success).toBe(true);
    const six = Array.from({ length: 6 }, () => id);
    expect(packageShowcaseConfigSchema.safeParse({ listingIds: six }).success).toBe(true);
  });

  it("rejects a 7th id and non-uuid ids", () => {
    const seven = Array.from({ length: 7 }, () => id);
    expect(packageShowcaseConfigSchema.safeParse({ listingIds: seven }).success).toBe(false);
    expect(packageShowcaseConfigSchema.safeParse({ listingIds: ["not-a-uuid"] }).success).toBe(false);
  });
});

describe("gallery / testimonials / faq configs", () => {
  it("gallery: valid image rows; a row needs a url", () => {
    expect(galleryConfigSchema.safeParse({ images: [{ url: "https://x/1.jpg", alt: "beach" }] }).success).toBe(true);
    expect(galleryConfigSchema.safeParse({ images: [{}] }).success).toBe(false);
    expect(galleryConfigSchema.safeParse({ images: [] }).success).toBe(true); // min 0 (default)
  });

  it("testimonials: quote + name required, trip optional", () => {
    const ok = { items: [{ quote: "Best trip ever", name: "Rafiq", trip: "Hajj 2025" }] };
    expect(testimonialsConfigSchema.safeParse(ok).success).toBe(true);
    expect(testimonialsConfigSchema.safeParse({ items: [{ name: "Rafiq" }] }).success).toBe(false);
    expect(testimonialsConfigSchema.safeParse({ items: [{ quote: "q", name: "n" }] }).success).toBe(true);
  });

  it("faq: q + a required", () => {
    const ok = { items: [{ q: "Visa included?", a: "Yes for package guests." }] };
    expect(faqConfigSchema.safeParse(ok).success).toBe(true);
    expect(faqConfigSchema.safeParse({ items: [{ q: "Only a question" }] }).success).toBe(false);
  });
});

describe("countdown / stickyCta / whatsappCta / thankYou configs", () => {
  it("countdown: targetDate must parse; label optional", () => {
    expect(countdownConfigSchema.safeParse({ targetDate: "2026-12-31T23:59:59+06:00", label: "Offer ends" }).success).toBe(true);
    expect(countdownConfigSchema.safeParse({ targetDate: "not-a-date" }).success).toBe(false);
    expect(countdownConfigSchema.safeParse({ targetDate: "" }).success).toBe(false);
    expect(countdownConfigSchema.safeParse({ targetDate: "2026-12-31" }).success).toBe(true);
  });

  it("stickyCta + whatsappCta need text and a phone", () => {
    expect(stickyCtaConfigSchema.safeParse({ text: "Call now", phone: "+8801712345678" }).success).toBe(true);
    expect(stickyCtaConfigSchema.safeParse({ text: "Call now" }).success).toBe(false);
    expect(whatsappCtaConfigSchema.safeParse({ text: "Chat", phone: "01712345678", prefill: "Hello" }).success).toBe(true);
    expect(whatsappCtaConfigSchema.safeParse({ text: "Chat", phone: "" }).success).toBe(false);
  });

  it("thankYou: message required, redirectUrl optional", () => {
    expect(thankYouConfigSchema.safeParse({ message: "Thanks!", redirectUrl: "/packages" }).success).toBe(true);
    expect(thankYouConfigSchema.safeParse({ message: "Thanks!" }).success).toBe(true);
    expect(thankYouConfigSchema.safeParse({ redirectUrl: "/x" }).success).toBe(false);
  });
});

describe("section rows", () => {
  const heroRow = {
    type: "hero",
    config: { headline: "Hajj 2026" },
  };

  it("accepts a valid typed row and coerces numeric order", () => {
    expect(landingSectionUnionSchema.safeParse(heroRow).success).toBe(true);
    expect(landingSectionUnionSchema.safeParse({ ...heroRow, order: "2" }).success).toBe(true);
    expect(landingSectionUnionSchema.safeParse({ ...heroRow, order: -1 }).success).toBe(false);
  });

  it("rejects unknown types and per-type-invalid configs", () => {
    expect(landingSectionUnionSchema.safeParse({ type: "nope", config: {} }).success).toBe(false);
    // hero headline required — the type discriminant must drive its own schema.
    expect(landingSectionUnionSchema.safeParse({ type: "hero", config: {} }).success).toBe(false);
    // benefits empty items rejected.
    expect(landingSectionUnionSchema.safeParse({ type: "benefits", config: { items: [] } }).success).toBe(false);
  });

  it("sections array needs at least one row", () => {
    expect(landingSectionsSchema.safeParse([]).success).toBe(false);
    expect(landingSectionsSchema.safeParse([heroRow]).success).toBe(true);
  });
});

describe("landing form field rules", () => {
  const base = (over: Record<string, unknown> = {}) => ({
    key: "full_name",
    label: "Full name",
    type: "text",
    required: false,
    ...over,
  });

  it("validates the LandingFormField shape and normalizes required default", () => {
    const parsed = landingFormFieldSchema.parse({ key: "name", label: "Name", type: "text" });
    expect(parsed.required).toBe(false);
    expect(landingFormFieldSchema.safeParse(base({ key: "" })).success).toBe(false);
    expect(landingFormFieldSchema.safeParse(base({ label: "" })).success).toBe(false);
    expect(landingFormFieldSchema.safeParse(base({ key: "Full Name" })).success).toBe(false);
    expect(landingFormFieldSchema.safeParse(base({ key: "full_name" })).success).toBe(true);
    expect(LANDING_FORM_FIELD_TYPES).toContain("email");
  });

  it("requires options for a select field and forbids them elsewhere", () => {
    const select = base({ key: "trip_type", type: "select" });
    expect(landingFormFieldSchema.safeParse(select).success).toBe(false);
    const withOpts = { ...select, options: ["Hajj", "Umrah"] };
    expect(landingFormFieldSchema.safeParse(withOpts).success).toBe(true);
    expect(landingFormFieldSchema.safeParse(base({ options: ["x"] })).success).toBe(false);
  });

  it("formConfig: 1-6 fields, unique keys", () => {
    const fields = [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "phone", label: "Phone", type: "tel", required: true },
    ];
    expect(formConfigSchema.safeParse({ title: "Enquire", fields }).success).toBe(true);
    expect(formConfigSchema.safeParse({ fields: [] }).success).toBe(false);
    const dup = [
      { key: "phone", label: "A", type: "text", required: false },
      { key: "phone", label: "B", type: "text", required: false },
    ];
    expect(formConfigSchema.safeParse({ fields: dup }).success).toBe(false);
    const many = Array.from({ length: 7 }, (_, i) => ({
      key: `f${i}`,
      label: `Field ${i}`,
      type: "text",
      required: false,
    }));
    expect(formConfigSchema.safeParse({ fields: many }).success).toBe(false);
  });
});

describe("reserved form field keys (honeypot collision)", () => {
  const base = (over: Record<string, unknown> = {}) => ({
    key: "full_name",
    label: "Full name",
    type: "text",
    required: false,
    ...over,
  });

  it("exposes company_website as the single reserved key", () => {
    expect(RESERVED_FORM_FIELD_KEYS).toEqual(["company_website"]);
  });

  it("stays in sync with the leads runtime honeypot marker", () => {
    // leads treats a non-empty formData["company_website"] as a bot; an author
    // field keyed the same would silently drop genuine fills. Assert the two
    // constants never drift apart.
    expect(RESERVED_FORM_FIELD_KEYS).toContain(HONEYPOT_FIELD);
  });

  it("rejects a field keyed company_website while ordinary keys pass", () => {
    const r = landingFormFieldSchema.safeParse(base({ key: "company_website" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path.join(".")).toBe("key");
    expect(landingFormFieldSchema.safeParse(base({ key: "company_website_alt" })).success).toBe(true);
    expect(landingFormFieldSchema.safeParse(base({ key: "website" })).success).toBe(true);
  });

  it("rejects a formConfig carrying the reserved key (author cannot create it)", () => {
    const bad = {
      fields: [
        base({ key: "name" }),
        base({ key: "company_website" }),
      ],
    };
    const parsed = formConfigSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.join(".") === "fields.1.key")).toBe(true);
    }
  });
});

describe("buildLeadSchema: per-field + reachability", () => {
  type FieldShape = {
    key: string;
    type: LandingFormField["type"];
    label?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
  };
  const field = (shape: FieldShape): LandingFormField => ({
    key: shape.key,
    label: shape.label ?? "Contact",
    type: shape.type,
    required: shape.required ?? false,
    ...(shape.placeholder !== undefined ? { placeholder: shape.placeholder } : {}),
    ...(shape.options !== undefined ? { options: shape.options } : {}),
  });

  /** A realistic lead form carries a reachable contact field, so the phone-or-
   *  email guarantee can be satisfied; the targeted field rides alongside it. */
  const withPhone = (target: FieldShape) => ({
    fields: [
      field({ ...target }),
      field({ key: "phone", label: "Phone", type: "tel", required: true }),
    ],
  });
  const pay = (extra: Record<string, string>) => ({ phone: "01712345678", ...extra });

  it("applies per-field email and tel validation", () => {
    const email = buildLeadSchema({ fields: [field({ key: "em", type: "email", required: true })] });
    expect(email.safeParse({ em: "not-an-email" }).success).toBe(false);
    expect(email.safeParse({ em: "a@b.com" }).success).toBe(true);

    const tel = buildLeadSchema({ fields: [field({ key: "ph", type: "tel", required: true })] });
    expect(tel.safeParse({ ph: "abc" }).success).toBe(false);
    expect(tel.safeParse({ ph: "+8801712345678" }).success).toBe(true);
  });

  it("required vs optional blank handling", () => {
    const required = buildLeadSchema(withPhone(field({ key: "c1", type: "text", required: true })));
    expect(required.safeParse(pay({ c1: "" })).success).toBe(false);
    expect(required.safeParse(pay({ c1: "   " })).success).toBe(false);
    expect(required.safeParse(pay({ c1: "Karim" })).success).toBe(true);

    const optional = buildLeadSchema(withPhone(field({ key: "c1", type: "text", required: false })));
    expect(optional.safeParse(pay({ c1: "" })).success).toBe(true);
  });

  it("validates email/tel only when the field is non-blank (optional)", () => {
    const optionalEmail = buildLeadSchema({ fields: [field({ key: "em", type: "email", required: false })] });
    expect(optionalEmail.safeParse({ em: "junk" }).success).toBe(false);
    expect(optionalEmail.safeParse({ em: "a@b.com" }).success).toBe(true);
    expect(optionalEmail.safeParse({ em: "" }).success).toBe(false); // reachability: no contact
  });

  it("validates select values against the configured options", () => {
    const select = buildLeadSchema(
      withPhone(field({ key: "trip", type: "select", required: true, options: ["Hajj", "Umrah"] })),
    );
    expect(select.safeParse(pay({ trip: "Visa" })).success).toBe(false);
    expect(select.safeParse(pay({ trip: "Hajj" })).success).toBe(true);
  });

  it("guarantees at least one of email/phone is present", () => {
    const config = buildLeadSchema({
      fields: [
        field({ key: "name", type: "text", required: true }),
        field({ key: "email", type: "email", required: false }),
        field({ key: "phone", type: "tel", required: false }),
      ],
    });
    // name alone (both optional contacts blank) must fail…
    expect(config.safeParse({ name: "Karim", email: "", phone: "" }).success).toBe(false);
    // …an email alone or a phone alone satisfies it.
    expect(config.safeParse({ name: "Karim", email: "a@b.com", phone: "" }).success).toBe(true);
    expect(config.safeParse({ name: "Karim", email: "", phone: "01712345678" }).success).toBe(true);
  });

  it("trims submitted values", () => {
    const schema = buildLeadSchema(withPhone(field({ key: "c1", type: "text", required: true })));
    const out = schema.parse(pay({ c1: "  hello  " }));
    expect(out.c1).toBe("hello");
  });

  it("caps a text field at 500 characters", () => {
    const schema = buildLeadSchema(
      withPhone(field({ key: "c1", type: "text", required: false })),
    );
    // 501 chars is rejected with a clear length message; the boundary passes.
    const over = schema.safeParse(pay({ c1: "x".repeat(501) }));
    expect(over.success).toBe(false);
    if (!over.success) {
      expect(over.error.issues.some((i) => i.message.includes("500 characters"))).toBe(true);
    }
    expect(schema.safeParse(pay({ c1: "x".repeat(500) })).success).toBe(true);
    // An over-long value is still rejected on a required text field even when
    // the required-blank rule would otherwise be the first thing checked.
    const required = buildLeadSchema(
      withPhone(field({ key: "c1", type: "text", required: true })),
    );
    expect(required.safeParse(pay({ c1: "x".repeat(501) })).success).toBe(false);
  });

  it("caps a textarea field at 4000 characters", () => {
    const schema = buildLeadSchema(
      withPhone(field({ key: "c1", type: "textarea", required: false })),
    );
    const over = schema.safeParse(pay({ c1: "y".repeat(4001) }));
    expect(over.success).toBe(false);
    if (!over.success) {
      expect(over.error.issues.some((i) => i.message.includes("4000 characters"))).toBe(true);
    }
    expect(schema.safeParse(pay({ c1: "y".repeat(4000) })).success).toBe(true);
  });
});

describe("landingPageInput", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    title: "Hajj 2026 offer",
    slug: "hajj-2026-offer",
    sections: [
      {
        type: "hero",
        config: { headline: "Book Hajj now" },
        order: 0,
      },
    ],
    formConfig: {
      fields: [
        { key: "phone", label: "Phone", type: "tel", required: true },
      ],
    },
    seo: { title: "Hajj 2026 | TripMate", description: "Book your Hajj package." },
    status: "draft",
    fbContentId: "812394501234567",
    ...over,
  });

  it("accepts a valid page input", () => {
    expect(landingPageInput.safeParse(row()).success).toBe(true);
  });

  it("normalizes a blank fbContentId to null", () => {
    const parsed = landingPageInput.parse(row({ fbContentId: "" }));
    expect(parsed.fbContentId).toBeNull();
  });

  it("enforces status enum and slug shape", () => {
    expect(landingPageInput.safeParse(row({ status: "bogus" })).success).toBe(false);
    expect(landingPageInput.safeParse(row({ slug: "Bad Slug" })).success).toBe(false);
    expect(landingPageInput.safeParse(row({ slug: "" })).success).toBe(false);
    expect(statusSchema.safeParse("published").success).toBe(true);
    expect(LANDING_PAGE_STATUSES).toEqual(["draft", "published"]);
  });

  it("rejects zero sections", () => {
    expect(landingPageInput.safeParse(row({ sections: [] })).success).toBe(false);
  });

  it("accepts a page without a lead form when it has no form section", () => {
    const noForm = row({ formConfig: null });
    expect(landingPageInput.safeParse(noForm).success).toBe(true);
  });

  it("requires formConfig when a form section is present", () => {
    const withFormSection = row({
      sections: [
        { type: "form", config: {} },
        { type: "stickyCta", config: { text: "Call us", phone: "01712345678" } },
      ],
      formConfig: null,
    });
    const r = landingPageInput.safeParse(withFormSection);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path.join(".")).toBe("formConfig");
  });

  it("passes when the form section carries its configured fields", () => {
    const withForm = row({
      sections: [
        { type: "form", config: {} },
        { type: "stickyCta", config: { text: "Call us", phone: "01712345678" } },
      ],
    });
    expect(landingPageInput.safeParse(withForm).success).toBe(true);
  });

  it("rejects a form section whose field set cannot reach the visitor", () => {
    // formConfig exists but holds only text/select/date fields — buildLeadSchema
    // would reject every submission (no phone-or-email), so the page is
    // unpublishable and must fail validation now.
    const allText = row({
      sections: [{ type: "form", config: {} }],
      formConfig: {
        fields: [
          { key: "name", label: "Name", type: "text", required: true },
          { key: "budget", label: "Budget", type: "select", options: ["Under 1L", "1L+"] },
        ],
      },
    });
    const r = landingPageInput.safeParse(allText);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path.join(".")).toBe("formConfig.fields");
  });

  it("accepts a form section when a tel or email field is present", () => {
    for (const type of ["tel", "email"] as const) {
      const ok = row({
        sections: [{ type: "form", config: {} }],
        formConfig: {
          fields: [
            { key: "name", label: "Name", type: "text", required: true },
            { key: "contact", label: "Contact", type, required: true },
          ],
        },
      });
      expect(landingPageInput.safeParse(ok).success).toBe(true);
    }
  });

  it("does not leak the raw zod instance shape into the typed input", () => {
    // Sanity: sections survive as the discriminated union.
    const parsed = landingPageInput.parse(row());
    expect(parsed.sections[0].type).toBe("hero");
    const unionTyped: z.infer<typeof landingSectionUnionSchema> = parsed.sections[0];
    expect(unionTyped.type).toBe("hero");
  });
});
