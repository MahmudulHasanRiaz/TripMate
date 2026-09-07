import type { Metadata } from "next";
import { listQuotations } from "@/modules/bookings/quotations-service";
import type { QuotationStatus } from "@/modules/bookings/quotations-validation";
import QuotationsView from "./QuotationsView";

export const metadata: Metadata = {
  title: "Quotations · TripMate Admin",
};

export const instant = false;

export default async function QuotationsPage(props: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
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

  return (
    <QuotationsView
      items={items}
      total={total}
      currentStatus={status}
      currentSearch={search ?? ""}
      currentPage={page}
    />
  );
}
