import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getMyOrderDetail } from "@/modules/portal/service";
import { listGateways } from "@/modules/payments/service";
import PortalOrderDetailClient from "./PortalOrderDetailClient";

export const metadata: Metadata = {
  title: "Order Details · TripMate",
};

export const instant = false;

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const [order, gateways] = await Promise.all([
    getMyOrderDetail(session.user.id, id),
    listGateways(true), // active gateways only
  ]);

  if (!order) notFound();

  return <PortalOrderDetailClient order={order} gateways={gateways} />;
}
