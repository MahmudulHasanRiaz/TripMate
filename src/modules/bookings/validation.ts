import { z } from "zod";
import { formConfigSchema, leadSchemaFieldRules } from "@/modules/landing-pages/section-types";

// Pure zod schemas + constants for the bookings (orders) module — no DB, no
// server-only, no imports from server modules — so it is safe to import from
// server actions, the service layer, admin server components and unit tests
// alike (the same contract as modules/leads/validation.ts).
//
// These must stay in sync with the drizzle pgEnum tables in schema.ts:
//   orders.status  <-> order_status
//   orders.type    <-> order_type
//   orders.source  <-> order_source

export const ORDER_STATUSES = [
  "pending",
  "in_review",
  "quoted",
  "confirmed",
  "cancelled",
  "completed",
] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const ORDER_TYPES = ["package", "inquiry"] as const;
export const orderTypeSchema = z.enum(ORDER_TYPES);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const ORDER_SOURCES = ["website", "lead_conversion", "manual"] as const;
export const orderSourceSchema = z.enum(ORDER_SOURCES);
export type OrderSource = z.infer<typeof orderSourceSchema>;

/** Statuses with no outgoing transitions — the funnel's two exits. */
export const TERMINAL_ORDER_STATUSES = ["cancelled", "completed"] as const;
export type TerminalOrderStatus = (typeof TERMINAL_ORDER_STATUSES)[number];

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

// ---- the status machine -------------------------------------------------------
//
// The legal transition map, keyed by the CURRENT status:
//   - pending    → in_review (review starts), quoted (quote without review), cancelled
//   - in_review  → quoted, cancelled
//   - quoted     → in_review (re-open review to revise the quote), confirmed, cancelled
//   - confirmed  → completed, cancelled
//   - cancelled  / completed — terminal, no outgoing edges
//
// Pinned rules (Plan 5 T1):
//   - cancel is legal from every NON-terminal status,
//   - complete is legal ONLY from confirmed,
//   - quote (quoted as a destination) is legal ONLY from pending/in_review.
// The quoted → in_review edge is the operator's revision path: a quote can be
// re-opened for changes and re-quoted (setQuote's pending/in_review guard makes
// that re-quote go through in_review, never quoted → quoted directly).
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ["in_review", "quoted", "cancelled"],
  in_review: ["quoted", "cancelled"],
  quoted: ["in_review", "confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

/** Same-status transitions are NOT map edges — the service treats them as
 *  idempotent no-ops (the same convention as leads changeLeadStatus). */
export function isLegalOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

// ---- shared string helpers ----------------------------------------------------

/** Optional text scalar. Blank (""), whitespace-only or null all collapse to
 *  `undefined` (the same normalization as section-types optionalText). */
function optionalBoundedText(max: number, message: string) {
  return z.preprocess(
    (v) =>
      v === null || v === undefined || (typeof v === "string" && v.trim() === "")
        ? undefined
        : v,
    z.string().trim().max(max, message).optional(),
  );
}

const PHONE_MIN_MESSAGE = "Phone number must be at least 5 characters";
const PHONE_MAX_MESSAGE = "Phone number must be 20 characters or fewer";

/** Required contact phone for package orders (5-20 chars, format-lenient). */
const requiredPhone = () => z.string().trim().min(5, PHONE_MIN_MESSAGE).max(20, PHONE_MAX_MESSAGE);

/** Optional phone (inquiry orders: phone OR email must be present). */
const optionalPhone = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    requiredPhone().optional(),
  );

/** Optional email — blank collapses to undefined, non-blank must be an address. */
const optionalEmail = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().email("Enter a valid email address").max(320).optional(),
  );

// ---- package order input ------------------------------------------------------

/** The bookable customer contact a package order freezes into customer_snapshot. */
export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: optionalEmail(),
  phone: requiredPhone(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const TRAVELERS_MIN = 1;
export const TRAVELERS_MAX = 10;

/** One traveler row. `dob` is checked for SHAPE (YYYY-MM-DD) only — the same
 *  contract as the landing form's date fields; past dates are the traveller's
 *  own reality, not a schema error. */
export const travelerInputSchema = z.object({
  name: z.string().trim().min(1, "Traveler name is required").max(200),
  passportNo: optionalBoundedText(30, "Passport number must be 30 characters or fewer"),
  dob: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth (YYYY-MM-DD)")
      .optional(),
  ),
  relation: optionalBoundedText(50, "Relation must be 50 characters or fewer"),
});
export type TravelerInput = z.infer<typeof travelerInputSchema>;

export const travelersSchema = z
  .array(travelerInputSchema)
  .min(TRAVELERS_MIN, "Add at least one traveler")
  .max(TRAVELERS_MAX, `Up to ${TRAVELERS_MAX} travelers per order`);

/** The public package-booking form payload (listingId + contact + travelers). */
export const packageOrderInputSchema = z.object({
  listingId: uuidSchema,
  customer: customerInputSchema,
  travelers: travelersSchema,
  specialRequests: optionalBoundedText(
    2000,
    "Special requests must be 2000 characters or fewer",
  ),
});
export type PackageOrderInput = z.infer<typeof packageOrderInputSchema>;

// ---- inquiry order input ------------------------------------------------------

/** Cap on how many extra formConfig-driven answers an inquiry may carry (a
 *  FormConfig defines at most 6 fields; the slack tolerates legacy payloads). */
export const INQUIRY_EXTRA_FIELDS_MAX = 50;

const extraFieldsSchema = z
  .record(z.string().max(120, "Field keys must be 120 characters or fewer"), z.string().max(4000))
  .refine(
    (v) => Object.keys(v).length <= INQUIRY_EXTRA_FIELDS_MAX,
    `An inquiry can carry at most ${INQUIRY_EXTRA_FIELDS_MAX} extra answers`,
  );

export const INQUIRY_REACHABILITY_MESSAGE =
  "Provide at least a phone number or an email so we can reach you";

/** The inquiry's cross-field reachability rule, shared by the public inquiry
 *  schema and the lead-conversion union below (both need it as a predicate
 *  because a superRefine'd schema can no longer be .extend()-ed). */
export function inquiryHasReachableContact(input: { phone?: string; email?: string }): boolean {
  return Boolean(input.phone?.trim() || input.email?.trim());
}

/** The plain inquiry object (no refinement) — exported so the lead-conversion
 *  union in this file and the public action envelope can extend it. */
export const inquiryOrderInputObject = z.object({
  listingId: uuidSchema.optional(),
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: optionalPhone(),
  email: optionalEmail(),
  details: optionalBoundedText(4000, "Details must be 4000 characters or fewer"),
  extraFields: extraFieldsSchema.optional(),
});

/** The public inquiry payload: structured contact + optional listing + the
 *  formConfig-driven extra answers. Phone and email are each optional, but at
 *  least one must be present. */
export const inquiryOrderInputSchema = inquiryOrderInputObject.superRefine((input, ctx) => {
  if (!inquiryHasReachableContact(input)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phone"],
      message: INQUIRY_REACHABILITY_MESSAGE,
    });
  }
});
export type InquiryOrderInput = z.infer<typeof inquiryOrderInputSchema>;

/** An admin converting a lead picks which kind of order to create; `type`
 *  discriminates the two payloads (a plain union — not z.discriminatedUnion —
 *  because the inquiry member's superRefine makes it a ZodEffects, which
 *  discriminatedUnion cannot host). */
export const convertLeadOrderInputSchema = z
  .union([
    packageOrderInputSchema.extend({ type: z.literal("package") }),
    inquiryOrderInputObject.extend({ type: z.literal("inquiry") }),
  ])
  .superRefine((input, ctx) => {
    if (input.type === "inquiry" && !inquiryHasReachableContact(input)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: INQUIRY_REACHABILITY_MESSAGE,
      });
    }
  });
export type ConvertLeadOrderInput = z.infer<typeof convertLeadOrderInputSchema>;

// ---- inquiry extra fields vs the listing's formConfig --------------------------
//
// CHOICE (documented per Plan 5 T1): a services listing's `formConfig` reuses
// the landing-pages FormConfig shape, so its inquiry extras are validated with
// the SAME per-field machinery the landing submit path uses — leadSchemaFieldRules,
// the exact primitive buildLeadSchema composes over. One buildLeadSchema
// guarantee is deliberately NOT applied here: its email/tel reachability
// superRefine. That rule exists because a landing form is the lead's ONLY
// contact path; an inquiry's reachability is already enforced at the top level
// by inquiryOrderInputSchema's phone-or-email rule (the structured fields), so
// re-applying it would reject every listing whose form asks only non-contact
// questions. Everything else is identical — per-field types, required/optional
// blanks, length caps, select options — so the same field accepts exactly the
// same answers on a landing and on a services listing. Further consequences,
// deliberate:
//   - a formConfig that does not parse as FormConfig is treated as ABSENT — it
//     is not trusted to define fields, so extraFields are then rejected
//     outright rather than stored unvalidated,
//   - keys the form does not declare are stripped by the z.object default (the
//     same stripping the landing path applies), and the CLEANED record is what
//     the caller persists.

export type InquiryExtraFieldsValidation =
  | { ok: true; data: Record<string, string> }
  | { ok: false; fieldErrors: Record<string, string> };

/** Map zod issues to field keys (empty path → the top-level "form" key). */
export function inquiryFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * Validate an inquiry's extraFields against a listing's formConfig. Returns
 * the CLEANED field values on success (unknown keys stripped), or field-keyed
 * errors. Pure — the action layer calls this before handing the payload to
 * the service. See the CHOICE block above for the buildLeadSchema divergence.
 */
export function validateInquiryExtraFields(
  formConfig: unknown,
  extraFields: Record<string, string> | undefined,
): InquiryExtraFieldsValidation {
  const parsedForm = formConfigSchema.safeParse(formConfig);
  if (!parsedForm.success) {
    if (extraFields && Object.keys(extraFields).length > 0) {
      return {
        ok: false,
        fieldErrors: { form: "This listing does not define an inquiry form." },
      };
    }
    return { ok: true, data: {} };
  }
  // The same shape buildLeadSchema builds — per-field rules only, no landing
  // reachability superRefine (the structured phone-or-email rule covers it).
  // One leniency: an ABSENT key reads as a blank (the landing island always
  // submits every configured key; the inquiry endpoint additionally tolerates
  // a missing one — required fields still fail, optional ones read as blank).
  const shape: Record<string, z.ZodType<string, z.ZodTypeDef, unknown>> = {};
  for (const field of parsedForm.data.fields) {
    shape[field.key] = z.preprocess(
      (v) => (v === undefined ? "" : v),
      leadSchemaFieldRules(field),
    );
  }
  const form = z.object(shape).safeParse(extraFields ?? {});
  if (!form.success) {
    return { ok: false, fieldErrors: inquiryFieldErrors(form.error.issues) };
  }
  return { ok: true, data: form.data };
}

// ---- order numbers -------------------------------------------------------------

/** TM-YYYY-NNNNN — the human-facing order number (NNNNN zero-padded to five
 *  digits; the pattern allows the sequence to grow past 99999 untouched). */
export const ORDER_NO_REGEX = /^TM-\d{4}-\d{5,}$/;

/** Format a (year, sequence) pair as the canonical order number. */
export function formatOrderNo(year: number, sequence: number): string {
  return `TM-${year}-${String(sequence).padStart(5, "0")}`;
}
