import type { Metadata } from "next";
import { listDestinations } from "@/modules/catalog/service";
import DestinationsView from "./DestinationsView";
import type { DestinationRow } from "./types";

export const metadata: Metadata = { title: "Destinations · Catalog" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

export default async function DestinationsPage() {
  const destinations = await listDestinations(false);
  const rows = destinations satisfies DestinationRow[];
  return <DestinationsView rows={rows} />;
}
