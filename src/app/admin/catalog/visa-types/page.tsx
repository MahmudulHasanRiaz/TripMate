import type { Metadata } from "next";
import { listVisaTypes } from "@/modules/catalog/visa-service";
import VisaTypesView from "./VisaTypesView";

export const metadata: Metadata = {
  title: "Visa Types · Catalog Admin",
};

export const instant = false;

export default async function VisaTypesPage() {
  const types = await listVisaTypes(false);

  return <VisaTypesView types={types} />;
}
