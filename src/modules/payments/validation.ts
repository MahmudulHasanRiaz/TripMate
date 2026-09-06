import { z } from "zod";

// Pure zod schemas + constants for the payments module — no DB, no server-only,
// no imports from server modules — so it is safe to import from server actions,
// the service layer, admin/portal server components and unit tests alike (the
// same contract as modules/{leads,bookings,media}/validation.ts).
//
// These must stay in sync with the drizzle pgEnum tables in schema.ts:
//   payment_gateways.kind <-> gateway_kind
//   payments.status        <-> payment_status

export const GATEWAY_KINDS = [
  "manual",
  "paylater",
  "sslcommerz",
  "bkash",
  "nagad",
] as const;
export const gatewayKindSchema = z.enum(GATEWAY_KINDS);
export type GatewayKind = z.infer<typeof gatewayKindSchema>;

/** Gateway kinds a customer can pay through with a manual transaction-id
 *  submission (send-money + txn id, verified by an operator): the seeded
 *  bKash/Nagad/Bank gateways are all "manual", and future bKash/Nagad-kind
 *  gateways follow the same send-money + txn-id flow until a hosted
 *  integration lands. `paylater` records intent instead (selectPayLater), and
 *  `sslcommerz` is a hosted checkout that verifies through callbacks — never a
 *  manually submitted txn id. */
export const MANUALLY_PAYABLE_GATEWAY_KINDS = ["manual", "bkash", "nagad"] as const;
export type ManuallyPayableGatewayKind = (typeof MANUALLY_PAYABLE_GATEWAY_KINDS)[number];

/** Type guard so the service/tests can check a gateway kind against the
 *  manually-payable set without a string[] cast. */
export function isManuallyPayableGatewayKind(
  kind: GatewayKind,
): kind is ManuallyPayableGatewayKind {
  return (MANUALLY_PAYABLE_GATEWAY_KINDS as readonly GatewayKind[]).includes(kind);
}

export const PAYMENT_STATUSES = [
  "pending",
  "submitted",
  "verified",
  "rejected",
  "refunded",
] as const;
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/** Ids travel as route params / form keys and reach DB uuid columns — parsed
 *  (never trusted raw) at every trust boundary. */
export const uuidSchema = z.string().uuid("Must be a valid UUID");

// ---- shared string helpers ------------------------------------------------------

/** Optional text scalar. Blank (""), whitespace-only or null all collapse to
 *  `undefined` (the same normalization as bookings/leads validation). */
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
 *  rendered, so javascript:/data: URLs are refused at the boundary, not just
 *  malformed ones. */
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

// ---- customer payment submission -------------------------------------------------

/** The portal's manual payment submission (and the admin's on-behalf entry,
 *  minus the screenshot field). methodTxnId bounds match the payments.method_txn_id
 *  text column's practical range. */
export const paymentSubmitInputSchema = z.object({
  orderId: uuidSchema,
  gatewayId: uuidSchema,
  methodTxnId: z
    .string()
    .trim()
    .min(4, "Transaction ID must be at least 4 characters")
    .max(64, "Transaction ID must be 64 characters or fewer"),
  senderNumber: optionalBoundedText(30, "Sender number must be 30 characters or fewer"),
  /** URL only in v1 — the portal's file upload lands with the Plan-5 media
   *  ownership task (T3), which will swap this for an uploaded document key. */
  screenshotUrl: optionalHttpUrl(2048, "Screenshot URL must be 2048 characters or fewer"),
  note: optionalBoundedText(1000, "Note must be 1000 characters or fewer"),
});
export type PaymentSubmitInput = z.infer<typeof paymentSubmitInputSchema>;

/** The admin's manual-entry variant: an operator records a payment a customer
 *  made offline (guest orders included) — no screenshot field on this path. */
export const adminCreatePaymentInputSchema = paymentSubmitInputSchema.omit({
  screenshotUrl: true,
});
export type AdminCreatePaymentInput = z.infer<typeof adminCreatePaymentInputSchema>;

// ---- gateway config ---------------------------------------------------------------

/** Cap on config entries — a gateway's config is DISPLAY data (account number,
 *  bank name, labels) rendered to the customer. It is deliberately a flat
 *  record of strings: NEVER store credentials or API secrets here (those live
 *  in server env vars only, never in this jsonb column). */
export const GATEWAY_CONFIG_MAX_ENTRIES = 20;

export const gatewayConfigSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1, "Config keys cannot be empty")
      .max(100, "Config keys must be 100 characters or fewer"),
    z.string().max(2000, "Config values must be 2000 characters or fewer"),
  )
  .refine(
    (v) => Object.keys(v).length <= GATEWAY_CONFIG_MAX_ENTRIES,
    `Gateway config is limited to ${GATEWAY_CONFIG_MAX_ENTRIES} entries`,
  );

/** Upsert payload for a payment gateway. `id` present → update, absent →
 *  create. Names carry NO uniqueness in v1 (the id is the identity — two
 *  gateways may share a display name; per T2: "name only"). */
export const gatewayInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  kind: gatewayKindSchema,
  config: gatewayConfigSchema.default({}),
  logoUrl: optionalHttpUrl(2048, "Logo URL must be 2048 characters or fewer"),
  instructions: optionalBoundedText(2000, "Instructions must be 2000 characters or fewer"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce
    .number({ invalid_type_error: "Sort order must be a number" })
    .int("Sort order must be a whole number")
    .min(0, "Sort order must be between 0 and 99")
    .max(99, "Sort order must be between 0 and 99")
    .default(0),
});
export type GatewayInput = z.infer<typeof gatewayInputSchema>;

// ---- amounts ----------------------------------------------------------------------

/**
 * A positive money amount with at most two decimal places, capped to fit the
 * numeric(14,2) columns (12 integer digits; the same cap bookings' quoted price
 * uses). Coerced so form/string inputs parse once, at the boundary.
 *
 * The two-decimal check is `Math.round(v * 100) / 100 === v`: a value that IS
 * the nearest double to a two-decimal decimal passes (rounding the scaled
 * value returns the same double), while 10.123 / 0.005 fail.
 */
export const amountInputSchema = z.coerce
  .number({ invalid_type_error: "Amount must be a number" })
  .finite("Amount must be a number")
  .positive("Amount must be greater than zero")
  // numeric(14,2) caps at 999,999,999,999.99 — pin AT the ceiling: exactly
  // 1e12 (13 integer digits) would overflow the column at insert time.
  .max(999_999_999_999.99, "Amount is too large")
  .refine(
    (v) => Math.round(v * 100) / 100 === v,
    "Amount supports at most two decimal places",
  );
