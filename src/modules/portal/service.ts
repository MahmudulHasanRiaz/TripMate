import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentGateways, payments } from "@/modules/payments/schema";
import { users } from "@/modules/users/schema";
import {
  getMyOrderDetail as bookingsGetMyOrderDetail,
  myOrders as bookingsMyOrders,
  type OrderDetail,
  type OrderListItem,
  type Paginated,
} from "@/modules/bookings/service";
import {
  getOrderPaidTotal,
  listForOrder,
  type PaymentView,
} from "@/modules/payments/service";
import { listUserDocuments } from "@/modules/media/user-docs";
import type { MediaFile } from "@/modules/media/service";

/**
 * The customer portal's ONE import surface (Plan 5 T4).
 *
 * This is a thin composition layer, not a new data layer: every read is a
 * pass-through or an enrichment of the owning module's service function, so
 * the frontend agent never imports across three modules (and never reaches
 * into a schema). Server-only for the same reason those services are.
 *
 * WRITE PATHS deliberately live elsewhere: browser-entry mutations are server
 * actions, and a "use server" file cannot be re-exported from here (any
 * re-export of an async fn from a non-"use server" module silently stops
 * being an action). The portal's entry points are therefore:
 *   - submitMyPaymentAction / selectPayLaterAction — "@/modules/payments/actions"
 *     (guarded withGuard({}) + the ownership check inside),
 *   - uploadMyDocumentAction — "@/modules/media/actions".
 * No new actions are created here.
 *
 * OWNERSHIP: myOrders / getMyOrderDetail enforce ownership in the bookings
 * service itself (userId match — a non-owner reads the same null as a missing
 * order, no existence leak); myDocuments is owner-scoped in media/user-docs.
 */

// ---- orders ----------------------------------------------------------------------

/** The signed-in customer's orders, newest first (bookings pass-through). */
export async function myOrders(
  userId: string,
  query: { page?: number; perPage?: number } = {},
): Promise<Paginated<OrderListItem>> {
  return bookingsMyOrders(userId, query);
}

/** The portal's enriched order detail: the ownership-checked bookings detail
 *  plus the payment timeline and the verified paid total. null when the id is
 *  unknown OR not owned by this user (the bookings fn's own contract). */
export type MyOrderDetail = OrderDetail & {
  payments: PaymentView[];
  /** Sum of VERIFIED payment amounts (0 when none). */
  paidTotal: number;
};

export async function getMyOrderDetail(
  userId: string,
  orderId: string,
): Promise<MyOrderDetail | null> {
  // Ownership check lives in the bookings fn — keep it there (single source of
  // truth for the no-existence-leak contract).
  const order = await bookingsGetMyOrderDetail(userId, orderId);
  if (!order) return null;
  const [payments, paidTotal] = await Promise.all([
    listForOrder(order.id),
    getOrderPaidTotal(order.id),
  ]);
  return { ...order, payments, paidTotal };
}

// ---- documents --------------------------------------------------------------------

/** The signed-in customer's uploaded documents, newest first (media
 *  user-docs pass-through; owner-scoped + not soft-deleted). */
export async function myDocuments(
  userId: string,
  query: { page?: number; perPage?: number } = {},
): Promise<Paginated<MediaFile>> {
  return listUserDocuments(userId, query);
}

// ---- portal dashboard -------------------------------------------------------------

export type PortalDashboardData = {
  stats: {
    totalBookings: number;
    activeTrips: number;
    totalQuoted: number;
    totalPaid: number;
    outstandingBalance: number;
  };
  recentOrders: OrderListItem[];
  recentPayments: Array<{
    id: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    senderNumber: string | null;
    trxId: string | null;
    createdAt: Date;
  }>;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: Date;
  } | null;
};

export async function getPortalDashboardData(
  userId: string,
): Promise<PortalDashboardData> {
  const [ordersResult, userRow] = await Promise.all([
    bookingsMyOrders(userId, { perPage: 50 }),
    db.select().from(users).where(eq(users.id, userId)).limit(1),
  ]);

  const userOrders = ordersResult.items;
  const totalBookings = ordersResult.total;

  const activeTrips = userOrders.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;

  const totalQuoted = userOrders.reduce(
    (sum, o) => sum + (o.status !== "cancelled" ? (o.quotedPrice ?? 0) : 0),
    0,
  );

  let totalPaid = 0;
  let recentPaymentsList: PortalDashboardData["recentPayments"] = [];

  const orderIds = userOrders.map((o) => o.id);
  if (orderIds.length > 0) {
    const [paidRows, pRows] = await Promise.all([
      db
        .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .where(
          and(
            inArray(payments.orderId, orderIds),
            eq(payments.status, "verified"),
          ),
        ),
      db
        .select({
          id: payments.id,
          orderId: payments.orderId,
          amount: payments.amount,
          currency: payments.currency,
          status: payments.status,
          methodTxnId: payments.methodTxnId,
          senderNumber: payments.senderNumber,
          gatewayName: paymentGateways.name,
          gatewayKind: paymentGateways.kind,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .leftJoin(paymentGateways, eq(payments.gatewayId, paymentGateways.id))
        .where(inArray(payments.orderId, orderIds))
        .orderBy(desc(payments.createdAt))
        .limit(5),
    ]);

    totalPaid = Number(paidRows[0]?.total ?? 0);
    recentPaymentsList = pRows.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      amount: Number(p.amount) || 0,
      currency: p.currency,
      status: p.status,
      method: p.gatewayName || p.gatewayKind || "Payment",
      senderNumber: p.senderNumber,
      trxId: p.methodTxnId,
      createdAt: p.createdAt,
    }));
  }

  const outstandingBalance = Math.max(0, totalQuoted - totalPaid);

  return {
    stats: {
      totalBookings,
      activeTrips,
      totalQuoted,
      totalPaid,
      outstandingBalance,
    },
    recentOrders: userOrders.slice(0, 5),
    recentPayments: recentPaymentsList,
    user: userRow[0]
      ? {
          id: userRow[0].id,
          name: userRow[0].name,
          email: userRow[0].email,
          phone: userRow[0].phone,
          role: userRow[0].role,
          createdAt: userRow[0].createdAt,
        }
      : null,
  };
}
