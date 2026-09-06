import "server-only";
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
