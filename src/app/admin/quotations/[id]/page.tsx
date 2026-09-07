import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuotationById } from "@/modules/bookings/quotations-service";
import QuotationDetailView from "./QuotationDetailView";

export const instant = false;

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const quote = await getQuotationById(id);
  if (!quote) return { title: "Quotation Not Found" };
  return {
    title: `${quote.quoteNo} · Quotation Detail`,
  };
}

export default async function QuotationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const quote = await getQuotationById(id);
  if (!quote) notFound();

  return <QuotationDetailView quotation={quote} />;
}
