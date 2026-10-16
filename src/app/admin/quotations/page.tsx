import type { Metadata } from "next";
import { listQuotations } from "@/modules/bookings/quotations-service";
import type { QuotationStatus } from "@/modules/bookings/quotations-validation";
import QuotationsView from "./QuotationsView";

export const metadata: Metadata = {
  title: "Quotations · TripMate Admin",
};

export const instant = false;

export default async function QuotationsPage(props: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; convertLead?: string }>;
}) {
  const params = await props.searchParams;
  const status = params.status as QuotationStatus | undefined;
  const search = params.search;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const { items, total } = await listQuotations({
    status,
    search,
    page,
    perPage: 25,
  });

  // One-click Convert to Quotation (§2.6): pre-fill the create form from the
  // lead, editable before save. The save links the quotation to the lead and
  // the convert step marks the lead converted.
  let prefill = null;
  if (params.convertLead) {
    const { getLeadDetail } = await import("@/modules/leads/service");
    const lead = await getLeadDetail(params.convertLead);
    if (lead) {
      prefill = {
        leadId: lead.id,
        customerName: lead.name,
        customerPhone: lead.phone,
        customerEmail: lead.email,
        notes: lead.message,
      };
    }
  }

  return (
    <QuotationsView
      items={items}
      total={total}
      currentStatus={status}
      currentSearch={search ?? ""}
      currentPage={page}
      prefill={prefill}
    />
  );
}
