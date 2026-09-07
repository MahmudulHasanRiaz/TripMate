import { z } from "zod";
import { uuidSchema } from "@/modules/catalog/validation";

export const quotationStatusEnum = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "converted",
]);

export type QuotationStatus = z.infer<typeof quotationStatusEnum>;

export function formatQuoteNo(seq: number, year: number): string {
  return `QT-${year}-${String(seq).padStart(4, "0")}`;
}

export const quotationItemInputSchema = z.object({
  id: uuidSchema.optional(),
  description: z.string().trim().min(1, "Description is required").max(500),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").default(1),
  unitPrice: z.coerce
    .number()
    .min(0, "Unit price cannot be negative")
    .max(999_999_999.99),
  unitCost: z.coerce
    .number()
    .min(0, "Unit cost cannot be negative")
    .max(999_999_999.99)
    .default(0),
});

export type QuotationItemInput = z.infer<typeof quotationItemInputSchema>;

export const quotationInputSchema = z.object({
  id: uuidSchema.optional(),
  leadId: uuidSchema.nullable().optional(),
  customerName: z.string().trim().min(2, "Customer name is required").max(120),
  customerPhone: z.string().trim().min(5, "Valid phone number is required").max(25),
  customerEmail: z.string().trim().email("Invalid email").nullable().optional().or(z.literal("")),
  notes: z.string().trim().max(3000).nullable().optional(),
  validUntil: z.string().trim().nullable().optional(),
  items: z.array(quotationItemInputSchema).min(1, "At least one line item is required"),
});

export type QuotationInput = z.infer<typeof quotationInputSchema>;

export const quotationStatusInputSchema = z.object({
  id: uuidSchema,
  status: quotationStatusEnum,
  note: z.string().trim().max(1000).optional(),
});

export type QuotationStatusInput = z.infer<typeof quotationStatusInputSchema>;

export const convertQuotationInputSchema = z.object({
  quotationId: uuidSchema,
  note: z.string().trim().max(1000).optional(),
});

export type ConvertQuotationInput = z.infer<typeof convertQuotationInputSchema>;
