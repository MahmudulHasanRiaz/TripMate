import { z } from "zod";

// Zod schemas for the content module (posts, post categories, pages). Pure (no
// DB / no server-only) so it can be imported from tests, server actions, forms
// and the service layer alike — same contract as modules/catalog/validation.ts.
//
// Slug uniqueness is deliberately NOT validated here — it is enforced by the DB
// unique constraint and surfaced as a typed SLUG_CONFLICT error by the service
// layer. This file only validates slug SHAPE.

// Keep in sync with the drizzle pgEnum table in schema.ts:
//   content_status  <-> posts.status / pages.status
export const CONTENT_STATUSES = ["draft", "published"] as const;
export const contentStatusSchema = z.enum(CONTENT_STATUSES);

export type ContentStatus = z.infer<typeof contentStatusSchema>;

/**
 * Title → slug generation. Lowercases, ASCII-folds common latin diacritics and
 * collapses every run of non-alphanumerics into a single dash. Slugs are
 * ASCII-only (they become URL path segments) — a fully non-latin title yields
 * "" and needs a manual latin slug; callers should surface that to the author.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks: é → e
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
    "Slug must be lowercase letters/numbers separated by single dashes (no leading/trailing dash, e.g. about-us)",
  );

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

const urlTextSchema = z.string().trim().min(1, "URL is required").max(2048);

/** A blank-text input for a nullable uuid field means "clear to NULL". */
function nullableOptionalUuid(description: string) {
  return z.preprocess(
    (v) => (v === "" ? null : v),
    uuidSchema.nullable().optional().describe(description),
  );
}

// ---- JSON blob shapes stored in jsonb columns --------------------------------

/** Image cell used by posts (featuredImage cells, gallery entries). */
export const contentImageSchema = z.object({
  url: urlTextSchema,
  alt: z.string().trim().max(200).optional(),
});
export type ContentImage = z.infer<typeof contentImageSchema>;

const featuredImageSchema = z.preprocess(
  (v) => (v === "" ? null : v), // blank text input → no image
  contentImageSchema.nullable().optional(),
);

export const gallerySchema = z.array(contentImageSchema).max(60);

export const seoSchema = z
  .object({
    title: z.string().trim().max(70).optional(),
    description: z.string().trim().max(160).optional(),
  })
  .nullable()
  .optional();
export type Seo = { title?: string; description?: string };

/** Cap shared by post body and page-section markdown. */
export const MAX_MARKDOWN_CHARS = 100_000;

const markdownTextSchema = z
  .string()
  .trim()
  .max(MAX_MARKDOWN_CHARS, `Content exceeds ${MAX_MARKDOWN_CHARS.toLocaleString()} characters`);

// ---- pages: sections model v1 ------------------------------------------------
//
// v1 is a single section type: `{ type: "markdown", content }`. Plan 4's LP
// section system (hero cards, CTAs, testimonials…) extends this union — new
// members are added here and the page renderer grows a branch per type. The
// `z.literal("markdown")` member is what refuses unknown types today.

export const markdownSectionSchema = z.object({
  type: z.literal("markdown"),
  content: markdownTextSchema.min(1, "Section content is required"),
});
export type PageSection = z.infer<typeof markdownSectionSchema>;

const pageSectionsSchema = z
  .array(markdownSectionSchema)
  .min(1, "A page needs at least one section")
  .max(200, "Too many sections");
export type PageSections = z.infer<typeof pageSectionsSchema>;

// ---- main inputs ------------------------------------------------------------

export const postInput = z.object({
  // Present when editing (id → update), absent when creating (id → insert).
  id: uuidSchema.optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugSchema,
  excerpt: z
    .string()
    .trim()
    .max(500, "Excerpt must be 500 characters or fewer")
    .nullable()
    .optional(),
  content: markdownTextSchema.nullable().optional(), // markdown body
  featuredImage: featuredImageSchema,
  gallery: gallerySchema.nullable().optional(),
  videoUrl: z.string().trim().max(2048).nullable().optional(),
  categoryId: nullableOptionalUuid("post category id"),
  authorId: nullableOptionalUuid("author user id"),
  status: contentStatusSchema.optional(), // omit → DB default 'draft'
  seo: seoSchema,
});
export type PostInput = z.infer<typeof postInput>;

export const postCategoryInput = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: slugSchema,
});
export type PostCategoryInput = z.infer<typeof postCategoryInput>;

export const pageInput = z.object({
  id: uuidSchema.optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugSchema,
  sections: pageSectionsSchema,
  status: contentStatusSchema.optional(), // omit → DB default 'draft'
  seo: seoSchema,
});
export type PageInput = z.infer<typeof pageInput>;
