import { z } from "zod";

// Pure zod schemas + constants for the expenses module — no DB, no server-only,
// no imports from server modules — so it is safe to import from server actions,
// the service layer, admin server components and unit tests alike (the same
// contract as modules/{leads,bookings,payments}/validation.ts).
//
// These must stay in sync with the drizzle pgEnum tables in schema.ts:
//   expense_categories.kind <-> expense_kind
//   expenses.status         <-> expense_status

export const EXPENSE_KINDS = ["operational", "cost_of_sales", "other"] as const;
export const expenseKindSchema = z.enum(EXPENSE_KINDS);
export type ExpenseKind = z.infer<typeof expenseKindSchema>;

export const EXPENSE_STATUSES = ["pending", "approved", "rejected"] as const;
export const expenseStatusSchema = z.enum(EXPENSE_STATUSES);
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

// ---- shared string helpers (mirror modules/payments/validation.ts) --------------

/** Optional text scalar. Blank (""), whitespace-only or null all collapse to
 *  `undefined` (the same normalization as bookings/leads/payments validation). */
function optionalBoundedText(max: number, message: string) {
  return z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().max(max, message).optional(),
  );
}

/** Optional http(s) URL. Blank collapses to undefined; anything else must both
 *  parse as a URL AND carry an http(s) scheme — the value is stored and later
 *  rendered to operators, so javascript:/data: URLs are refused at the boundary. */
function optionalHttpUrl(max: number, message: string) {
  return z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z
      .string()
      .trim()
      .url("Enter a valid URL")
      .max(max, message)
      .refine(
        (v) => v.startsWith("http://") || v.startsWith("https://"),
        "URL must start with http:// or https://",
      )
      .optional(),
  );
}

// ---- category input ---------------------------------------------------------------

/** Upsert payload for an expense category. `id` present → update, absent →
 *  create. Names carry no uniqueness in v1 (the id is the identity — the same
 *  choice payments made for gateway display names). */
export const expenseCategoryInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  kind: expenseKindSchema,
  description: optionalBoundedText(500, "Description must be 500 characters or fewer"),
  isActive: z.boolean().default(true),
});
export type ExpenseCategoryInput = z.infer<typeof expenseCategoryInputSchema>;

// ---- amounts ------------------------------------------------------------------------

/**
 * A positive money amount with at most two decimal places, capped to fit the
 * expenses.amount numeric(14,2) column. Coerced so form/string inputs parse
 * once, at the boundary.
 *
 * The cap is the column's exact ceiling — 999,999,999,999.99 (12 integer digits
 * + 2 decimals = the full precision 14) — mirroring payments' amountInputSchema
 * but with the boundary pinned AT the ceiling instead of 1e12: a value of
 * exactly 1e12 (13 integer digits) would overflow numeric(14,2) at insert time.
 *
 * The two-decimal check is `Math.round(v * 100) / 100 === v`: a value that IS
 * the nearest double to a two-decimal decimal passes (rounding the scaled
 * value returns the same double), while 10.123 / 0.005 fail.
 */
export const MAX_EXPENSE_AMOUNT = 999999999999.99;

export const amountInputSchema = z.coerce
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a number")
  .positive("Amount must be greater than zero")
  .max(MAX_EXPENSE_AMOUNT, "Amount is too large")
  .refine(
    (v) => Math.round(v * 100) / 100 === v,
    "Amount supports at most two decimal places",
  );

// ---- dates ---------------------------------------------------------------------------

const DATE_SHAPE_MESSAGE = "Enter a valid date (YYYY-MM-DD)";
const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD shape (2026-02-30 and friends fail). */
function isRealCalendarDate(value: string): boolean {
  const t = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === value;
}

/** Today as YYYY-MM-DD in the server's local timezone (expenses are entered by
 *  local staff; the not-future rule compares against their calendar day). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The expense's business date: a real calendar date, never in the future (an
 *  expense cannot be incurred tomorrow; shape-only checks are NOT enough here
 *  the way they are for a traveler's date of birth). */
export const expenseDateSchema = z
  .string()
  .trim()
  .regex(DATE_SHAPE, DATE_SHAPE_MESSAGE)
  .refine(isRealCalendarDate, DATE_SHAPE_MESSAGE)
  .refine((v) => v <= todayIso(), "Date cannot be in the future");

/** A P&L report range bound: a real calendar date, shape-checked only. Reports
 *  may query any historical window (and a `to` equal to today is the common
 *  case), so no not-future rule applies to the bounds themselves. */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(DATE_SHAPE, DATE_SHAPE_MESSAGE)
  .refine(isRealCalendarDate, DATE_SHAPE_MESSAGE);

// ---- entry input -----------------------------------------------------------------------

/** A submitted expense entry. Status is NOT client input — every entry is
 *  created pending and moves through approve/reject (expenses.approve). */
export const expenseEntryInputSchema = z.object({
  categoryId: uuidSchema,
  amount: amountInputSchema,
  date: expenseDateSchema,
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or fewer"),
  vendor: optionalBoundedText(120, "Vendor must be 120 characters or fewer"),
  receiptUrl: optionalHttpUrl(2048, "Receipt URL must be 2048 characters or fewer"),
  /** Optional link to the order this expense directly served (cost_of_sales
   *  entries); the service refuses an id no order carries. */
  orderId: uuidSchema.optional(),
});
export type ExpenseEntryInput = z.infer<typeof expenseEntryInputSchema>;
