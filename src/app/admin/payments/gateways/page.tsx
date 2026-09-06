import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth-helpers";
import { listGateways } from "@/modules/payments/service";
import GatewayConfigView from "./GatewayConfigView";

export const metadata: Metadata = { title: "Gateway Configuration · TripMate Admin" };
export const instant = false;

export default async function GatewaysPage() {
  await requirePermission("payments.manage_gateways");
  const gateways = await listGateways(false);

  return <GatewayConfigView gateways={gateways} />;
}
