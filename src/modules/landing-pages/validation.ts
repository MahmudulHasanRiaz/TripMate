import { z } from "zod";
import {
  formConfigSchema,
  landingSectionsSchema,
} from "@/modules/landing-pages/section-types";

// Zod schemas for the landing-pages module (the `landing_pages` write surface).
// Pure (no DB / no server-only) so it can be imported from tests, server
// actions and the service layer alike — same contract as the catalog/content
// validation modules. Section + lead-form shapes live in section-types.ts and
// are reused here wholesale.
//
// Slug uniqueness is deliberately NOT validated here — it is enforced by the DB
// unique constraint and surfaced as a typed SLUG_CONFLICT error by the service
// layer. This file only validates slug SHAPE. Status is `draft | published`
// (mirrors the content module); landing_pages.status is a free text column but
// the zod enum is the contract.

export const LANDING_PAGE_STATUSES = ["draft", "published"] as const;
export const statusSchema = z.enum(LANDING_PAGE_STATUSES);
export type LandingPageStatus = z.infer<typeof statusSchema>;

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

/**
 * Title → slug generation. Lowercases, ASCII-folds common latin diacritics and
 * collapses every run of non-alphanumerics into a single dash. Slugs are
 * ASCII-only (they become URL path segments under /l/<slug>).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks: é → e
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required — auto-fill from the title or enter one manually")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters/numbers separated by single dashes (no leading/trailing dash, e.g. hajj-offer-2026)",
  );

/** Blank text input → null (clears the stored value); absent stays absent. */
const optionalNullableText = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.string().trim().max(255).nullable().optional(),
);

const landingPageSeoSchema = z
  .object({
    title: z.string().trim().max(70).optional(),
    description: z.string().trim().max(160).optional(),
  })
  .nullable()
  .optional();
export type LandingPageSeo = { title?: string; description?: string };

/**
 * The landing-page write surface (create when `id` absent, update when present).
 *
 * `formConfig` is optional at the row level: a page that funnels to WhatsApp /
 * a sticky call CTA and collects no lead form simply stores null. But a page
 * whose sections include a `form` placement marker MUST carry a configured
 * field set with at least one email or tel field — otherwise the renderer would
 * mount a LeadForm that can never submit (the leads row requires reachable
 * contact info, so an all-text/select/date field set rejects every payload and
 * no lead could ever be stored). Those cross-field rules are the superRefine
 * below.
 */
export const landingPageInput = z
  .object({
    // Present when editing (id → update), absent when creating (id → insert).
    id: uuidSchema.optional(),
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: slugSchema,
    sections: landingSectionsSchema,
    formConfig: formConfigSchema.nullable().optional(),
    seo: landingPageSeoSchema,
    status: statusSchema.optional(), // omit → DB default 'draft'
    fbContentId: optionalNullableText,
  })
  .superRefine((data, ctx) => {
    const hasFormSection = data.sections.some((s) => s.type === "form");
    if (hasFormSection) {
      if (!data.formConfig) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["formConfig"],
          message: "A landing page with a form section must define its form fields",
        });
      } else if (
        !data.formConfig.fields.some((f) => f.type === "email" || f.type === "tel")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["formConfig", "fields"],
          message:
            "A landing page with a form section must include a phone or email field so leads are reachable",
        });
      }
    }
  });
export type LandingPageInput = z.infer<typeof landingPageInput>;
