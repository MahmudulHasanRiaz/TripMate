import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { paginate } from "@/lib/db-utils";
import { paymentGateways, payments } from "./schema";
// The queue/list reads join orders for orderNo + customer name — the same
// cross-module-table convention modules/bookings uses for listings/users.
import { orders } from "@/modules/bookings/schema";
import {
  confirmOrder,
  getOrderDetail,
  OrderError,
  type OrderDetail,
} from "@/modules/bookings/service";
import { trackCapiEvent } from "@/modules/tracking/service";
import {
  isManuallyPayableGatewayKind,
  type GatewayInput,
  type GatewayKind,
  type PaymentStatus,
} from "./validation";

// All DB queries for the payments module. Server-only — importing it into a
// client bundle fails the build. Conventions mirror modules/{leads,bookings}:
//   - jsonb cells (gateway config) are free-form at rest; every read is
//     projected defensively into the documented shape,
//   - typed PaymentError for every recoverable failure; anything else
//     propagates to the global error boundary via the action relay,
//   - NO updateTag here — cache expiry belongs to the guarded actions layer,
//   - gateway CONFIG is display data only (a record of strings validated at
//     the boundary); credentials never touch the jsonb column.
//
// There is deliberately NO UI in this module: the admin verification queue,
// gateway config and the customer portal are separate frontend surfaces that
// consume the exports here (and the guarded actions in actions.ts). Reads are
// exported plainly for admin/portal server components (they carry their own
// route-level guards); every write path that reaches a browser goes through
// the guarded actions.
//
// Documented v1 choices (Plan 5 T2):
//   1. selectPayLater records ONLY a payment row (status pending) — no
//      orderStatusEvents row. The order event log is status-scoped (every row
//      is a from→to transition); "customer picked pay later" is not a status
//      change, and transitionOrder to the same status is refused by the map,
//      so the payment row is the whole record.
//   2. verifyPayment confirms the order via the bookings service's
//      confirmOrder — but the T1 status machine only carries a
//      quoted → confirmed edge. A verified payment on a pending/in_review
//      order (e.g. an unquoted package order paid upfront) therefore leaves
//      the order status untouched (logged, not failed); the operator quotes,
//      then confirms — or a later verified payment confirms it. The verified
//      payment itself always stands.
//   3. finalPrice is NOT written by payments. It stays managed by the orders
//      surface (the operator's final agreed price); getOrderPaidTotal is the
//      "what has actually been paid" read.
//   4. The payments table has no submitted_by / rejected_by columns in v1:
//      verifyPayment records its actor in verified_by; submitManualPayment's
//      actorUserId and rejectPayment's rejectedBy are accepted for call-site
//      symmetry (and a future migration) but are NOT persisted — the note is
//      the reject-side audit trail.
//   5. A manual submission is refused when another submitted/verified payment
//      already claims the same (gateway, method_txn_id) — one transfer cannot
//      pay two orders. A REJECTED claim does not block: the customer re-sends
//      the same txn id with better information after a rejection.

// ---- public types --------------------------------------------------------------

export type Paginated<T> = { items: T[]; total: number };

export type GatewayView = {
  id: string;
  name: string;
  logoUrl: string | null;
  kind: GatewayKind;
  /** Display-only data (account numbers, labels) — never secrets. */
  config: Record<string, string>;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentView = {
  id: string;
  orderId: string;
  /** Joined from orders — the queue/list renders without a second read. */
  orderNo: string;
  customerName: string;
  gatewayId: string | null;
  gatewayName: string | null;
  gatewayKind: GatewayKind | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  methodTxnId: string | null;
  senderNumber: string | null;
  screenshotUrl: string | null;
  verifiedBy: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentQueueQuery = {
  /** Defaults to "submitted" — the verification queue. */
  status?: PaymentStatus;
  page?: number;
  perPage?: number;
};

// ---- errors --------------------------------------------------------------------

export class PaymentError extends Error {
  constructor(
    public code: "NOT_FOUND" | "INVALID_STATE" | "NOT_IMPLEMENTED" | "VALIDATION",
    message: string,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

// ---- row helpers ----------------------------------------------------------------

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** Project a gateway config jsonb cell defensively (non-string values drop). */
function asStringMap(value: unknown): Record<string, string> | null {
  const obj = asObject(value);
  if (!obj) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * The amount a customer owes for an order right now: the quote when one is
 * set, else the frozen listing price (package orders). An order with neither —
 * an unquoted general inquiry — has no payable amount yet; v1 requires a quote
 * before any payment can be recorded against such an order.
 */
function payableAmount(order: OrderDetail): number | null {
  const candidates = [order.quotedPrice, order.listingSnapshot?.price ?? null];
  for (const value of candidates) {
    if (value !== null && Number.isFinite(value) && value > 0 && value < 1e12) {
      return value;
    }
  }
  return null;
}

// ---- gateway reads / CRUD ---------------------------------------------------------

const gatewayCols = {
  id: paymentGateways.id,
  name: paymentGateways.name,
  logoUrl: paymentGateways.logoUrl,
  kind: paymentGateways.kind,
  config: paymentGateways.config,
  instructions: paymentGateways.instructions,
  isActive: paymentGateways.isActive,
  sortOrder: paymentGateways.sortOrder,
  createdAt: paymentGateways.createdAt,
  updatedAt: paymentGateways.updatedAt,
} as const;

type GatewayRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  kind: GatewayKind;
  config: unknown;
  instructions: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function toGatewayView(row: GatewayRow): GatewayView {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logoUrl,
    kind: row.kind,
    config: asStringMap(row.config) ?? {},
    instructions: row.instructions,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** All gateways ordered for display (sortOrder, then name). `activeOnly`
 *  filters to the ones the customer-facing surfaces may offer. */
export async function listGateways(activeOnly = false): Promise<GatewayView[]> {
  const rows = (await db
    .select(gatewayCols)
    .from(paymentGateways)
    .where(activeOnly ? eq(paymentGateways.isActive, true) : undefined)
    .orderBy(asc(paymentGateways.sortOrder), asc(paymentGateways.name))) as unknown as GatewayRow[];
  return rows.map(toGatewayView);
}

/**
 * Insert or update a gateway (`input.id` present → update). Names carry no
 * uniqueness in v1 — the id is the identity; two gateways may share a display
 * name (per T2: "name only"). The config record is display data validated at
 * the action boundary (record of strings, no secrets).
 */
export async function upsertGateway(input: GatewayInput): Promise<GatewayView> {
  const values = {
    name: input.name,
    kind: input.kind,
    config: input.config,
    logoUrl: input.logoUrl ?? null,
    instructions: input.instructions ?? null,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    updatedAt: new Date(),
  };
  const [row] = input.id
    ? await db
        .update(paymentGateways)
        .set(values)
        .where(eq(paymentGateways.id, input.id))
        .returning(gatewayCols)
    : await db.insert(paymentGateways).values(values).returning(gatewayCols);
  if (!row) throw new PaymentError("NOT_FOUND", `Gateway ${input.id} not found.`);
  return toGatewayView(row as unknown as GatewayRow);
}

/** Flip a gateway's active flag (inactive gateways disappear from the
 *  customer-facing surfaces but keep their history). */
export async function setGatewayActive(id: string, isActive: boolean): Promise<GatewayView> {
  const [row] = await db
    .update(paymentGateways)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(paymentGateways.id, id))
    .returning(gatewayCols);
  if (!row) throw new PaymentError("NOT_FOUND", `Gateway ${id} not found.`);
  return toGatewayView(row as unknown as GatewayRow);
}

/** Bulk sortOrder write (the config surface's drag-reorder). All-or-nothing:
 *  an unknown id fails the whole batch inside one transaction. Bounds (0-99)
 *  are enforced at the action's zod boundary. */
export async function reorderGateways(
  items: { id: string; sortOrder: number }[],
): Promise<void> {
  if (items.length === 0) return;
  await db.transaction(async (tx) => {
    for (const item of items) {
      const [row] = await tx
        .update(paymentGateways)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(paymentGateways.id, item.id))
        .returning({ id: paymentGateways.id });
      if (!row) throw new PaymentError("NOT_FOUND", `Gateway ${item.id} not found.`);
    }
  });
}

// ---- payment reads ----------------------------------------------------------------

const paymentListCols = {
  id: payments.id,
  orderId: payments.orderId,
  amount: payments.amount,
  currency: payments.currency,
  status: payments.status,
  methodTxnId: payments.methodTxnId,
  senderNumber: payments.senderNumber,
  screenshotUrl: payments.submittedScreenshotUrl,
  verifiedBy: payments.verifiedBy,
  note: payments.note,
  createdAt: payments.createdAt,
  updatedAt: payments.updatedAt,
  orderNo: orders.orderNo,
  customerName: sql<string>`coalesce(${orders.customerSnapshot} ->> 'name', '')`,
  gatewayId: paymentGateways.id,
  gatewayName: paymentGateways.name,
  gatewayKind: paymentGateways.kind,
} as const;

type PaymentRow = {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  methodTxnId: string | null;
  senderNumber: string | null;
  screenshotUrl: string | null;
  verifiedBy: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  orderNo: string;
  customerName: string;
  gatewayId: string | null;
  gatewayName: string | null;
  gatewayKind: GatewayKind | null;
};

function toPaymentView(row: PaymentRow): PaymentView {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNo: row.orderNo,
    customerName: row.customerName,
    gatewayId: row.gatewayId,
    gatewayName: row.gatewayName,
    gatewayKind: row.gatewayKind,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    methodTxnId: row.methodTxnId,
    senderNumber: row.senderNumber,
    screenshotUrl: row.screenshotUrl,
    verifiedBy: row.verifiedBy,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function paymentQuery() {
  return db
    .select(paymentListCols)
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .leftJoin(paymentGateways, eq(payments.gatewayId, paymentGateways.id));
}

/** One payment (joined for display), or null when the id is unknown. */
async function getPaymentById(id: string): Promise<PaymentView | null> {
  const [row] = await paymentQuery().where(eq(payments.id, id)).limit(1);
  return row ? toPaymentView(row as unknown as PaymentRow) : null;
}

/**
 * The verification queue: payments in a given status (default submitted),
 * newest first, joined with the gateway name and the order's number/customer
 * for the queue's list rendering. perPage defaults to 20 and caps at 50.
 */
export async function listQueue(query: PaymentQueueQuery = {}): Promise<Paginated<PaymentView>> {
  const status = query.status ?? "submitted";
  const where = eq(payments.status, status);
  const { offset, perPage } = paginate({ page: query.page, perPage: query.perPage, defaultPerPage: 20 });

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(payments)
    .where(where);
  const rows = (await paymentQuery()
    .where(where)
    .orderBy(desc(payments.createdAt), desc(payments.id))
    .limit(perPage)
    .offset(offset)) as unknown as PaymentRow[];

  return { items: rows.map(toPaymentView), total: countRow.total };
}

/** Every payment recorded against one order, oldest first (the detail page's
 *  payment timeline). */
export async function listForOrder(orderId: string): Promise<PaymentView[]> {
  const rows = (await paymentQuery()
    .where(eq(payments.orderId, orderId))
    .orderBy(asc(payments.createdAt), asc(payments.id))) as unknown as PaymentRow[];
  return rows.map(toPaymentView);
}

/** Sum of VERIFIED payment amounts for an order (0 when none) — the "what has
 *  actually been paid" figure the detail page and T3's P&L revenue read. */
export async function getOrderPaidTotal(orderId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "verified")));
  return Number(row?.total ?? 0);
}

// ---- payment writes -----------------------------------------------------------------

export type SubmitManualPaymentInput = {
  orderId: string;
  gatewayId: string;
  methodTxnId: string;
  senderNumber?: string | null;
  screenshotUrl?: string | null;
  note?: string | null;
  /** Acting user (the session customer on the portal, the operator on the
   *  admin path). NOT persisted in v1 — see choice 4 in the module header. */
  actorUserId?: string | null;
};

/** Shared guard for both record-payment paths: the order must exist and not
 *  have exited the funnel (cancelled/completed orders take no new payments). */
async function payableOrderOrThrow(orderId: string): Promise<OrderDetail> {
  const order = await getOrderDetail(orderId);
  if (!order) throw new PaymentError("NOT_FOUND", `Order ${orderId} not found.`);
  if (order.status === "cancelled" || order.status === "completed") {
    throw new PaymentError(
      "INVALID_STATE",
      `Payments cannot be recorded for a ${order.status} order.`,
    );
  }
  return order;
}

/** Resolve the amount a new payment records against an order, with the
 *  no-payable-amount refusal (choice: a quote or a frozen listing price must
 *  exist before any payment row). */
function payableAmountOrThrow(order: OrderDetail): number {
  const amount = payableAmount(order);
  if (amount === null) {
    throw new PaymentError(
      "INVALID_STATE",
      "This order has no payable amount yet — set a quote first.",
    );
  }
  return amount;
}

/**
 * Record a customer's manual payment (send-money + transaction id) against an
 * order: status submitted, awaiting operator verification.
 *
 * Guards: the order must exist and not be cancelled/completed; the gateway
 * must exist, be ACTIVE, and accept manual txn-id submissions (manual/bkash/
 * nagad — paylater is selected via selectPayLater, sslcommerz is a hosted
 * checkout); the order must have a payable amount (quote or frozen listing
 * price); and no other submitted/verified payment may already claim the same
 * (gateway, method_txn_id) — one transfer cannot pay two orders (a REJECTED
 * claim does not block a corrected re-submission).
 *
 * The caller owns the authorization decision (portal ownership check /
 * payments.verify permission) — the same split as every other module.
 */
export async function submitManualPayment(
  input: SubmitManualPaymentInput,
): Promise<PaymentView> {
  const order = await payableOrderOrThrow(input.orderId);

  const [gateway] = await db
    .select(gatewayCols)
    .from(paymentGateways)
    .where(eq(paymentGateways.id, input.gatewayId))
    .limit(1);
  if (!gateway) throw new PaymentError("NOT_FOUND", `Gateway ${input.gatewayId} not found.`);
  if (!gateway.isActive) {
    throw new PaymentError(
      "INVALID_STATE",
      `Gateway ${gateway.name} is not accepting payments.`,
    );
  }
  if (!isManuallyPayableGatewayKind(gateway.kind)) {
    throw new PaymentError(
      "INVALID_STATE",
      `Gateway ${gateway.name} (${gateway.kind}) does not accept manual transaction submissions.`,
    );
  }

  const amount = payableAmountOrThrow(order);

  // Duplicate-claim guard (choice 5 in the module header).
  const [duplicate] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.gatewayId, gateway.id),
        eq(payments.methodTxnId, input.methodTxnId),
        sql`${payments.status} in ('submitted', 'verified')`,
      ),
    )
    .limit(1);
  if (duplicate) {
    throw new PaymentError(
      "INVALID_STATE",
      "This transaction ID is already claimed by another payment.",
    );
  }

  const [inserted] = await db
    .insert(payments)
    .values({
      orderId: order.id,
      gatewayId: gateway.id,
      amount: amount.toFixed(2),
      currency: order.currency,
      status: "submitted",
      methodTxnId: input.methodTxnId,
      senderNumber: input.senderNumber ?? null,
      submittedScreenshotUrl: input.screenshotUrl ?? null,
      note: input.note ?? null,
    })
    .returning({ id: payments.id });

  const view = await getPaymentById(inserted.id);
  if (!view) throw new PaymentError("NOT_FOUND", `Payment ${inserted.id} not found.`);
  return view;
}

/**
 * Record the customer's pay-later choice: a payment row with status pending
 * against the first active pay-later gateway. Idempotent per order — an
 * existing pending pay-later row on the same gateway is returned as-is, so
 * double-clicks and retries never stack marker rows.
 *
 * Documented choice (module header #1): NO order status event is written —
 * the order event log is status-scoped and "picked pay later" is not a
 * transition; the pending payment row is the whole record.
 */
export async function selectPayLater(input: {
  orderId: string;
  /** NOT persisted in v1 — see choice 4 in the module header. */
  actorUserId?: string | null;
}): Promise<PaymentView> {
  const order = await payableOrderOrThrow(input.orderId);

  const [gateway] = await db
    .select(gatewayCols)
    .from(paymentGateways)
    .where(and(eq(paymentGateways.kind, "paylater"), eq(paymentGateways.isActive, true)))
    .orderBy(asc(paymentGateways.sortOrder), asc(paymentGateways.name))
    .limit(1);
  if (!gateway) {
    throw new PaymentError("NOT_FOUND", "No active pay-later gateway is configured.");
  }

  const [existing] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.orderId, order.id),
        eq(payments.gatewayId, gateway.id),
        eq(payments.status, "pending"),
      ),
    )
    .limit(1);
  if (existing) {
    const view = await getPaymentById(existing.id);
    if (view) return view;
  }

  const amount = payableAmountOrThrow(order);

  const [inserted] = await db
    .insert(payments)
    .values({
      orderId: order.id,
      gatewayId: gateway.id,
      amount: amount.toFixed(2),
      currency: order.currency,
      status: "pending",
      note: "Customer selected pay later",
    })
    .returning({ id: payments.id });

  const view = await getPaymentById(inserted.id);
  if (!view) throw new PaymentError("NOT_FOUND", `Payment ${inserted.id} not found.`);
  return view;
}

/**
 * Mark a submitted payment verified and run the order side-effect: the order
 * moves to confirmed via the bookings service's confirmOrder whenever the T1
 * status machine allows it (quoted → confirmed). Pending/in_review orders are
 * left as-is with a warning (choice 2 in the module header — the verified
 * payment always stands); confirmed/completed orders skip the transition;
 * a cancelled order refuses verification outright.
 *
 * The payment write is the source of truth and lands FIRST; the order
 * transition and the CAPI Purchase event are best-effort after it (a failure
 * in either is logged/handled, never un-verifies the payment).
 */
export async function verifyPayment(
  paymentId: string,
  opts: { verifiedBy?: string | null; note?: string | null } = {},
): Promise<PaymentView> {
  const current = await getPaymentById(paymentId);
  if (!current) throw new PaymentError("NOT_FOUND", `Payment ${paymentId} not found.`);
  if (current.status !== "submitted") {
    throw new PaymentError(
      "INVALID_STATE",
      `Only submitted payments can be verified (current: ${current.status}).`,
    );
  }

  const order = await getOrderDetail(current.orderId);
  if (!order) throw new PaymentError("NOT_FOUND", `Order ${current.orderId} not found.`);
  if (order.status === "cancelled") {
    throw new PaymentError(
      "INVALID_STATE",
      "A cancelled order cannot have payments verified.",
    );
  }

  const [updated] = await db
    .update(payments)
    .set({
      status: "verified",
      verifiedBy: opts.verifiedBy ?? null,
      note: opts.note ?? current.note,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId))
    .returning({ id: payments.id });
  if (!updated) throw new PaymentError("NOT_FOUND", `Payment ${paymentId} not found.`);

  // Order side-effect (choice 2): confirm via the bookings SERVICE (never its
  // actions). An OrderError here means the map refuses the edge (pending/
  // in_review → confirmed) — warn and keep the verified payment; anything
  // else propagates.
  if (
    order.status === "pending" ||
    order.status === "in_review" ||
    order.status === "quoted"
  ) {
    try {
      await confirmOrder(order.id, {
        actorId: opts.verifiedBy ?? null,
        note: `Payment verified (${current.amount.toFixed(2)} ${current.currency})`,
      });
    } catch (e) {
      if (e instanceof OrderError) {
        console.warn(
          `[payments] verified payment ${paymentId} on a ${order.status} order — confirmation needs a quote first; order ${order.id} left as-is (${e.code})`,
        );
      } else {
        throw e;
      }
    }
  }

  // Meta CAPI "Purchase" — fire-and-log, never throws. trackCapiEvent resolves
  // { ok:false } internally for a Meta/network failure; the try/catch also
  // covers a logging DB hiccup so verification is never blocked by tracking.
  try {
    const origin = process.env.APP_URL?.trim().replace(/\/+$/, "") ?? "";
    const slug = order.listingSnapshot?.slug;
    const sourceUrl = origin && slug ? `${origin}/packages/${slug}` : undefined;
    await trackCapiEvent(
      {
        eventName: "Purchase",
        eventId: randomUUID(),
        sourceUrl,
        user: {
          email: order.customer.email,
          phone: order.customer.phone,
        },
        customData: {
          value: current.amount,
          currency: current.currency,
          orderId: order.id,
          orderNo: order.orderNo,
        },
      },
      { sourceUrl },
    );
  } catch (e) {
    console.error("[payments] CAPI Purchase event failed", e);
  }

  const view = await getPaymentById(paymentId);
  if (!view) throw new PaymentError("NOT_FOUND", `Payment ${paymentId} not found.`);
  return view;
}

/**
 * Mark a submitted payment rejected with a mandatory reason (the note is the
 * audit trail — the v1 table has no rejected_by column; see choice 4). No
 * order side-effect: a rejected payment returns the customer to the submit
 * flow (the same txn id may then be re-submitted with corrected information).
 */
export async function rejectPayment(
  paymentId: string,
  opts: { rejectedBy?: string | null; note: string },
): Promise<PaymentView> {
  const current = await getPaymentById(paymentId);
  if (!current) throw new PaymentError("NOT_FOUND", `Payment ${paymentId} not found.`);
  if (current.status !== "submitted") {
    throw new PaymentError(
      "INVALID_STATE",
      `Only submitted payments can be rejected (current: ${current.status}).`,
    );
  }

  const [updated] = await db
    .update(payments)
    .set({ status: "rejected", note: opts.note, updatedAt: new Date() })
    .where(eq(payments.id, paymentId))
    .returning({ id: payments.id });
  if (!updated) throw new PaymentError("NOT_FOUND", `Payment ${paymentId} not found.`);

  const view = await getPaymentById(paymentId);
  if (!view) throw new PaymentError("NOT_FOUND", `Payment ${paymentId} not found.`);
  return view;
}
