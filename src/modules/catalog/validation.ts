import { z } from "zod";

// Zod schemas for the catalog module. Pure (no DB / no server-only) so it can
// be imported from tests, server actions, forms and the service layer alike.
//
// Slug uniqueness is deliberately NOT validated here — it is enforced by the
// DB unique constraint and surfaced as a typed SLUG_CONFLICT error by the
// service layer. This file only validates slug SHAPE.

// Keep in sync with the drizzle pgEnum tables in schema.ts:
//   service_categories.kind  <-> service_kind
//   listings.status          <-> listing_status
export const SERVICE_KINDS = ["package", "inquiry_based", "redirect"] as const;
export const LISTING_STATUSES = ["draft", "published", "archived"] as const;

export const serviceKindSchema = z.enum(SERVICE_KINDS);
export const listingStatusSchema = z.enum(LISTING_STATUSES);

export type ServiceKind = z.infer<typeof serviceKindSchema>;
export type ListingStatus = z.infer<typeof listingStatusSchema>;

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
    "Slug must be lowercase letters/numbers separated by single dashes (no leading/trailing dash, e.g. premium-hajj-2026)",
  );

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");
const urlTextSchema = z.string().trim().min(1, "URL is required").max(2048);

// ---- JSON blob shapes stored in jsonb columns --------------------------------

export const listingImageSchema = z.object({
  url: urlTextSchema,
  alt: z.string().trim().max(200).optional(),
});
export type ListingImage = z.infer<typeof listingImageSchema>;

const itineraryDaySchema = z.preprocess(
  (v) => (typeof v === "number" && Number.isInteger(v) ? String(v) : v),
  z.string().trim().min(1, "Itinerary day is required"),
);
export const itineraryItemSchema = z.object({
  day: itineraryDaySchema,
  title: z.string().trim().min(1, "Itinerary entry title is required").max(200),
  details: z
    .string()
    .trim()
    .min(1, "Itinerary entry details are required")
    .max(4000),
});
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;

export const seoSchema = z
  .object({
    title: z.string().trim().max(70).optional(),
    description: z.string().trim().max(160).optional(),
  })
  .nullable()
  .optional();
export type Seo = { title?: string; description?: string };

const stringListSchema = z
  .array(z.string().trim().min(1).max(500))
  .max(200);

// ---- optional numeric handling ----------------------------------------------
//
// DB numeric/int columns are nullable and the admin form sends them as text
// inputs, so a blank string must mean "clear to NULL", a numeric string must
// coerce to a number, junk must fail, and an *absent* key must stay absent so
// the service can leave the stored value untouched on partial updates.

function nullableNumber(schema: z.ZodNumber) {
  return z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null || (typeof v === "string" && v.trim() === "")) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isNaN(n) ? v : n; // hand junk back to zod for a clear error
    },
    schema.nullable().optional(),
  );
}

const priceSchema = nullableNumber(
  z
    .number()
    .positive("Price must be greater than 0")
    .max(9_999_999_999.99, "Price exceeds the maximum supported")
    .finite(),
);

const ratingSchema = nullableNumber(
  z
    .number()
    .min(0, "Rating must be between 0 and 5")
    .max(5, "Rating must be between 0 and 5"),
);

const durationDaysSchema = nullableNumber(
  z
    .number()
    .int("Duration must be a whole number of days")
    .min(1, "Duration must be at least 1 day")
    .max(9999, "Duration is too long"),
);

const coverImageSchema = z.preprocess(
  (v) => (v === "" ? null : v), // blank text input → no image
  z.string().trim().min(1, "Image URL is required").max(2048).nullable().optional(),
);

// ---- main inputs ------------------------------------------------------------

export const listingInput = z.object({
  // Present when editing (id → update), absent when creating (id → insert).
  id: uuidSchema.optional(),
  categoryId: uuidSchema,
  destinationId: z.preprocess(
    (v) => (v === "" ? null : v),
    uuidSchema.nullable().optional(),
  ),
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugSchema,
  summary: z.string().trim().max(300, "Summary must be 300 characters or fewer").nullable().optional(),
  description: z.string().max(50_000, "Description is too long").nullable().optional(), // markdown
  // Interim: the admin form binds cover image to a URL text field; the service
  // layer wraps it into the stored { url } jsonb shape. Alt text lands in T6's
  // media picker pass.
  coverImage: coverImageSchema,
  gallery: z.array(listingImageSchema).max(60).nullable().optional(),
  videoUrl: z.string().trim().max(2048).nullable().optional(),
  durationDays: durationDaysSchema,
  rating: ratingSchema,
  price: priceSchema,
  costPrice: priceSchema,
  startingPrice: priceSchema,
  isFeatured: z.boolean().default(false).optional(),
  currency: z.string().trim().min(1).max(10).default("BDT"),
  itinerary: z.array(itineraryItemSchema).max(200).nullable().optional(),
  inclusions: stringListSchema.nullable().optional(),
  exclusions: stringListSchema.nullable().optional(),
  formConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  status: listingStatusSchema.optional(), // omit → DB default 'draft'
  seo: seoSchema,
});
export type ListingInput = z.infer<typeof listingInput>;

export const categoryInput = z
  .object({
    id: uuidSchema.optional(),
    name: z.string().trim().min(1, "Name is required").max(100),
    slug: slugSchema,
    kind: serviceKindSchema,
    redirectUrl: z.string().trim().max(2048).nullable().optional(),
    icon: z.string().trim().max(100).nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "redirect" && !data.redirectUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["redirectUrl"],
        message: "redirectUrl is required when kind is 'redirect'",
      });
    }
  });
export type CategoryInput = z.infer<typeof categoryInput>;

export const destinationInput = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: slugSchema,
  image: z.string().trim().max(2048).nullable().optional(),
  isActive: z.boolean().default(true),
});
export type DestinationInput = z.infer<typeof destinationInput>;
