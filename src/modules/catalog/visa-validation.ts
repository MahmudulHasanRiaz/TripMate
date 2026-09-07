import { z } from "zod";
import { slugSchema, uuidSchema, seoSchema } from "./validation";

function nullableNumber(schema: z.ZodNumber) {
  return z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null || (typeof v === "string" && v.trim() === "")) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isNaN(n) ? v : n;
    },
    schema.nullable().optional(),
  );
}

const priceSchema = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      const trimmed = v.trim();
      return trimmed === "" ? NaN : Number(trimmed);
    }
    return v;
  },
  z.number().positive("Price must be greater than 0").max(9_999_999_999.99).finite(),
);

const costPriceSchema = nullableNumber(
  z.number().positive("Cost price must be greater than 0").max(9_999_999_999.99).finite(),
);

// ----------------------------------------------------------------------------
// Visa Type Schema
// ----------------------------------------------------------------------------

export const visaTypeInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: slugSchema,
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type VisaTypeInput = z.infer<typeof visaTypeInputSchema>;

// ----------------------------------------------------------------------------
// Visa Service (Offering) Schema
// ----------------------------------------------------------------------------

export const visaServiceInputSchema = z.object({
  id: uuidSchema.optional(),
  destinationId: uuidSchema,
  visaTypeId: uuidSchema,
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugSchema,
  price: priceSchema,
  costPrice: costPriceSchema,
  processingTime: z.string().trim().max(100).nullable().optional(),
  validity: z.string().trim().max(100).nullable().optional(),
  stayDuration: z.string().trim().max(100).nullable().optional(),
  requirements: z
    .array(z.string().trim().min(1).max(500))
    .max(100)
    .nullable()
    .optional(),
  description: z.string().max(10_000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  seo: seoSchema,
});

export type VisaServiceInput = z.infer<typeof visaServiceInputSchema>;

// ----------------------------------------------------------------------------
// Service Option (e.g. Passport Tiers) Schema
// ----------------------------------------------------------------------------

export const serviceOptionInputSchema = z.object({
  id: uuidSchema.optional(),
  categoryId: uuidSchema,
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: slugSchema,
  duration: z.string().trim().max(100).nullable().optional(),
  price: priceSchema,
  costPrice: costPriceSchema,
  deliveryTime: z.string().trim().max(100).nullable().optional(),
  requirements: z
    .array(z.string().trim().min(1).max(500))
    .max(100)
    .nullable()
    .optional(),
  description: z.string().max(10_000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  seo: seoSchema,
});

export type ServiceOptionInput = z.infer<typeof serviceOptionInputSchema>;

// ----------------------------------------------------------------------------
// Public Visa Application / Inquiry Schema
// ----------------------------------------------------------------------------

export const visaInquiryInputSchema = z.object({
  visaServiceId: uuidSchema,
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  phone: z
    .string()
    .trim()
    .min(5, "Phone number is required")
    .max(20, "Phone number is too long"),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  travelersCount: z.coerce.number().int().min(1).max(50).default(1),
  passportNo: z.string().trim().max(30).optional().or(z.literal("")),
  targetTravelDate: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type VisaInquiryInput = z.infer<typeof visaInquiryInputSchema>;
