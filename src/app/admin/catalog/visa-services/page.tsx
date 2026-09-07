import type { Metadata } from "next";
import { listVisaServices, listVisaTypes } from "@/modules/catalog/visa-service";
import { listDestinations } from "@/modules/catalog/service";
import VisaServicesView from "./VisaServicesView";

export const metadata: Metadata = { title: "Visa Services · Catalog" };

export const instant = false;

export default async function VisaServicesPage() {
  const [services, destinations, visaTypes] = await Promise.all([
    listVisaServices(),
    listDestinations(false),
    listVisaTypes(false),
  ]);

  return (
    <VisaServicesView
      services={services}
      destinations={destinations}
      visaTypes={visaTypes}
    />
  );
}
