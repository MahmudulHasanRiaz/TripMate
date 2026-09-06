import type { Metadata } from "next";
import { listQueue } from "@/modules/payments/service";
import type { PaymentStatus } from "@/modules/payments/validation";
import { paymentStatusSchema } from "@/modules/payments/validation";
import PaymentQueueView from "./PaymentQueueView";

export const metadata: Metadata = { title: "Payment Verification · TripMate Admin" };
export const instant = false;

type SearchParams = {
  status?: string;
  page?: string;
};

const PER_PAGE = 25;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status: PaymentStatus | undefined = paymentStatusSchema.safeParse(statusRaw).success
    ? (statusRaw as PaymentStatus)
    : undefined;
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const paginated = await listQueue({
    status,
    page,
    perPage: PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(paginated.total / PER_PAGE));

  return (
    <PaymentQueueView
      items={paginated.items}
      total={paginated.total}
      page={page}
      totalPages={totalPages}
      currentStatus={statusRaw}
    />
  );
}
