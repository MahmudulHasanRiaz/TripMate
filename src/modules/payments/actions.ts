"use server";

/**
 * Payments — guarded server actions.
 *
 * TWO surfaces live here:
 *
 * 1. SESSION-OWNER group — the customer portal's payment endpoints. Guarded
 *    with withGuard({}) (NOT public: a session is required), then the
 *    ownership check runs INSIDE the handler: the session user must own the
 *    order (order.userId === session.user.id). Guest orders (userId null)
 *    cannot be paid from the portal — an operator records those through
 *    adminCreatePaymentAction. A non-owner gets the same answer as a missing
 *    order ({ok:false, code:"NOT_FOUND"}) — no existence leak, the same
 *    contract as bookings' getMyOrderDetail.
 *
 * 2. ADMIN group — the verification queue (payments.verify) and the gateway
 *    config surface (payments.manage_gateways). Each action is a withGuard +
 *    relay + zod .safeParse boundary (parsed.data, never raw input).
 *
 * Every mutation expires the tags its readers read through:
 *   - CACHE_TAGS.orders + CACHE_TAGS.order(id) — the order board/detail
 *     renders (payments show on the order detail),
 *   - CACHE_TAGS.payments — the verification queue / gateway config reads.
 * updateTag is the read-your-own-writes choice (Next 16; the single-arg
 * revalidateTag form is deprecated).
 *
 * EMAIL HOOKS (Plan 5 T4): verifyPaymentAction / rejectPaymentAction fire the
 * paymentVerified / paymentRejected customer emails after the payment write
 * lands — try/catch never-throw, the same contract as the leads submit emails.
 * The verified/rejected payment is the source of truth; a mail failure only
 * logs and never fails the action response. The customer's email is read from
 * the order's customer_snapshot (getOrderDetail); no email → silent skip.
 *
 * The plain READ service functions (listQueue, listForOrder, listGateways,
 * getOrderPaidTotal, …) are deliberately NOT re-exported from this 'use
 * server' file: re-exporting an async service fn here would expose it as an
 * unguarded client-callable server action. Admin/portal server components
 * import them directly from service.ts (server-only) and carry their own
 * route-level guard — the same split every other module uses.
 */

import { updateTag } from "next/cache";
import { z } from "zod";
import { withGuard, GuardError } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getOrderDetail } from "@/modules/bookings/service";
import { renderPaymentRejected, renderPaymentVerified } from "@/modules/email/templates/order";
import { sendEmail } from "@/modules/email/send";
import {
  adminCreatePaymentInputSchema,
  gatewayInputSchema,
  paymentSubmitInputSchema,
  uuidSchema,
} from "./validation";
import {
  PaymentError,
  rejectPayment,
  reorderGateways,
  selectPayLater,
  setGatewayActive,
  submitManualPayment,
  upsertGateway,
  verifyPayment,
} from "./service";

// ==============================================================================
// Shared relay + parse helpers
// ==============================================================================

export type SubmitMyPaymentResult =
  | { ok: true; paymentId: string }
  | { ok: false; code?: string; error: string };

export type PaymentActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/**
 * Guard + relay wrapper for every payments action: withGuard(opts) +
 * GuardError → { ok:false, error }, PaymentError → { ok:false, code, error }.
 * Anything else re-throws to the global error boundary. `guardOpts` carries
 * either a permission (admin group) or nothing (the session-required
 * portal group — ownership is then checked inside the handler).
 */
function paymentAction<TInput, TOutput extends { ok: boolean }>(
  guardOpts: { permission?: string },
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard(guardOpts, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof PaymentError) {
        return { ok: false, code: e.code, error: e.message } as unknown as TOutput;
      }
      throw e;
    }
  };
}

/** Expire every tag a payment mutation reads through (queue + order views). */
function expireOrderPayments(orderId: string): void {
  updateTag(CACHE_TAGS.orders);
  updateTag(CACHE_TAGS.order(orderId));
  updateTag(CACHE_TAGS.payments);
}

/** Expire the tag the gateway config surface reads through. */
function expireGatewayTags(): void {
  updateTag(CACHE_TAGS.payments);
}

/** First failing zod issue rendered as "path: message" for the UI. Drills
 *  into union failures so the surfaced message is the member's own issue. */
function firstIssueMessage(error: z.ZodError): string {
  let issue = error.issues[0];
  while (
    issue &&
    issue.code === "invalid_union" &&
    issue.unionErrors &&
    issue.unionErrors.length > 0
  ) {
    const nested = issue.unionErrors.map((e) => e.issues[0]).find(Boolean);
    if (!nested) break;
    issue = nested;
  }
  const path = issue?.path.join(".") ?? "";
  return path ? `${path}: ${issue.message}` : (issue?.message ?? "Invalid input");
}

function parsePaymentInput<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
): { ok: true; data: T } | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, code: "VALIDATION", error: firstIssueMessage(parsed.error) };
}

/**
 * The portal ownership check: the session user must own the order. Returns
 * the order detail when owned; null for a missing order, a guest order
 * (userId null — operator-entered via adminCreatePaymentAction) or someone
 * else's order (all three read identically to the caller).
 */
async function ownedOrderOrNone(
  orderId: string,
  session: Session | null,
): Promise<{ id: string } | null> {
  if (!session) return null;
  const order = await getOrderDetail(orderId);
  if (!order || order.userId !== session.user.id) return null;
  return order;
}

// ==============================================================================
// PORTAL (session owner) — record a payment / pick pay later
// ==============================================================================

/** The portal's manual payment submit (send-money + transaction id). */
export const submitMyPaymentAction = paymentAction<unknown, SubmitMyPaymentResult>(
  {},
  async (input, session) => {
    const parsed = parsePaymentInput(paymentSubmitInputSchema, input);
    if (!parsed.ok) return parsed;
    if (!session) return { ok: false, error: "UNAUTHORIZED" };

    const order = await ownedOrderOrNone(parsed.data.orderId, session);
    if (!order) return { ok: false, code: "NOT_FOUND", error: "Order not found." };

    const payment = await submitManualPayment({
      ...parsed.data,
      actorUserId: session.user.id,
    });
    expireOrderPayments(order.id);
    return { ok: true, paymentId: payment.id };
  },
);

const selectPayLaterInput = z.object({ orderId: uuidSchema });

/** The portal's "I'll pay later" pick (records a pending marker payment). */
export const selectPayLaterAction = paymentAction<unknown, SubmitMyPaymentResult>(
  {},
  async (input, session) => {
    const parsed = parsePaymentInput(selectPayLaterInput, input);
    if (!parsed.ok) return parsed;
    if (!session) return { ok: false, error: "UNAUTHORIZED" };

    const order = await ownedOrderOrNone(parsed.data.orderId, session);
    if (!order) return { ok: false, code: "NOT_FOUND", error: "Order not found." };

    const payment = await selectPayLater({
      orderId: order.id,
      actorUserId: session.user.id,
    });
    expireOrderPayments(order.id);
    return { ok: true, paymentId: payment.id };
  },
);

// ==============================================================================
// ADMIN — verification queue (payments.verify)
// ==============================================================================

type PaymentIdRef = { id: string };

const verifyPaymentInput = z.object({
  id: uuidSchema,
  note: z.string().trim().max(2000, "Note must be 2000 characters or fewer").optional(),
});

/** Verify a submitted payment (order confirms when the status machine allows). */
export const verifyPaymentAction = paymentAction<unknown, PaymentActionResult<PaymentIdRef>>(
  { permission: "payments.verify" },
  async (input, session) => {
    const parsed = parsePaymentInput(verifyPaymentInput, input);
    if (!parsed.ok) return parsed;
    const payment = await verifyPayment(parsed.data.id, {
      verifiedBy: session?.user.id ?? null,
      note: parsed.data.note ?? null,
    });
    // Customer payment-verified email (Plan 5 T4) — never throws; skips
    // silently when the order's customer snapshot carries no email.
    try {
      const order = await getOrderDetail(payment.orderId);
      if (order?.customer.email) {
        const { subject, html } = renderPaymentVerified({
          orderNo: order.orderNo,
          customerName: order.customer.name,
          amount: payment.amount,
          currency: payment.currency,
        });
        await sendEmail({ to: order.customer.email, subject, html });
      }
    } catch (e) {
      console.error("[payments] payment-verified email failed", e);
    }
    expireOrderPayments(payment.orderId);
    return { ok: true, data: { id: payment.id } };
  },
);

const rejectPaymentInput = z.object({
  id: uuidSchema,
  note: z
    .string()
    .trim()
    .min(1, "A rejection reason is required")
    .max(2000, "Note must be 2000 characters or fewer"),
});

/** Reject a submitted payment with a mandatory reason. */
export const rejectPaymentAction = paymentAction<unknown, PaymentActionResult<PaymentIdRef>>(
  { permission: "payments.verify" },
  async (input, session) => {
    const parsed = parsePaymentInput(rejectPaymentInput, input);
    if (!parsed.ok) return parsed;
    const payment = await rejectPayment(parsed.data.id, {
      rejectedBy: session?.user.id ?? null,
      note: parsed.data.note,
    });
    // Customer payment-rejected email (Plan 5 T4) — never throws; skips
    // silently when the order's customer snapshot carries no email. The
    // operator's note passes through and is entity-escaped inside the template.
    try {
      const order = await getOrderDetail(payment.orderId);
      if (order?.customer.email) {
        const { subject, html } = renderPaymentRejected({
          orderNo: order.orderNo,
          customerName: order.customer.name,
          note: parsed.data.note,
        });
        await sendEmail({ to: order.customer.email, subject, html });
      }
    } catch (e) {
      console.error("[payments] payment-rejected email failed", e);
    }
    expireOrderPayments(payment.orderId);
    return { ok: true, data: { id: payment.id } };
  },
);

/** Manual entry on behalf of a customer (guest orders included): the operator
 *  records a payment the customer made offline. */
export const adminCreatePaymentAction = paymentAction<unknown, PaymentActionResult<PaymentIdRef>>(
  { permission: "payments.verify" },
  async (input, session) => {
    const parsed = parsePaymentInput(adminCreatePaymentInputSchema, input);
    if (!parsed.ok) return parsed;
    const payment = await submitManualPayment({
      ...parsed.data,
      actorUserId: session?.user.id ?? null,
    });
    expireOrderPayments(payment.orderId);
    return { ok: true, data: { id: payment.id } };
  },
);

// ==============================================================================
// ADMIN — gateway config (payments.manage_gateways)
// ==============================================================================

type GatewayIdRef = { id: string };

/** Create or update a payment gateway (config is display data only — never
 *  secrets; the zod boundary enforces a flat record of strings). */
export const upsertGatewayAction = paymentAction<unknown, PaymentActionResult<GatewayIdRef>>(
  { permission: "payments.manage_gateways" },
  async (input) => {
    const parsed = parsePaymentInput(gatewayInputSchema, input);
    if (!parsed.ok) return parsed;
    const gateway = await upsertGateway(parsed.data);
    expireGatewayTags();
    return { ok: true, data: { id: gateway.id } };
  },
);

const setGatewayActiveInput = z.object({
  id: uuidSchema,
  isActive: z.boolean(),
});

/** Activate / deactivate a gateway (inactive = hidden from payment options). */
export const setGatewayActiveAction = paymentAction<unknown, PaymentActionResult<GatewayIdRef>>(
  { permission: "payments.manage_gateways" },
  async (input) => {
    const parsed = parsePaymentInput(setGatewayActiveInput, input);
    if (!parsed.ok) return parsed;
    const gateway = await setGatewayActive(parsed.data.id, parsed.data.isActive);
    expireGatewayTags();
    return { ok: true, data: { id: gateway.id } };
  },
);

const reorderGatewaysInput = z.object({
  items: z
    .array(
      z.object({
        id: uuidSchema,
        sortOrder: z.coerce
          .number({ invalid_type_error: "Sort order must be a number" })
          .int("Sort order must be a whole number")
          .min(0, "Sort order must be between 0 and 99")
          .max(99, "Sort order must be between 0 and 99"),
      }),
    )
    .min(1, "Provide at least one gateway to reorder")
    .max(100, "Too many gateway reorder items"),
});

/** Bulk sortOrder write for the config surface's drag-reorder. */
export const reorderGatewaysAction = paymentAction<unknown, PaymentActionResult>(
  { permission: "payments.manage_gateways" },
  async (input) => {
    const parsed = parsePaymentInput(reorderGatewaysInput, input);
    if (!parsed.ok) return parsed;
    await reorderGateways(parsed.data.items);
    expireGatewayTags();
    return { ok: true };
  },
);
