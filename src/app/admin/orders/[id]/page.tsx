import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import { getOrderDetail } from "@/modules/bookings/service";
import { getOrderPaidTotal, listForOrder, listGateways } from "@/modules/payments/service";
import OrderDetailClient from "./OrderDetailClient";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) return { title: "Order Not Found · TripMate Admin" };
  return { title: `${order.orderNo} · TripMate Admin` };
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("orders.view");
  const { id } = await params;

  const [order, payments, paidTotal, activeGateways] = await Promise.all([
    getOrderDetail(id),
    listForOrder(id),
    getOrderPaidTotal(id),
    listGateways(true),
  ]);

  if (!order) notFound();

  const canManageOrders = hasPermission(session.user.role, null, "orders.manage");
  const canVerifyPayments = hasPermission(session.user.role, null, "payments.verify");

  return (
    <OrderDetailClient
      order={order}
      payments={payments}
      paidTotal={paidTotal}
      gateways={activeGateways}
      canManageOrders={canManageOrders}
      canVerifyPayments={canVerifyPayments}
    />
  );
}
