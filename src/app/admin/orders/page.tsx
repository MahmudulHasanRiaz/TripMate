import type { Metadata } from "next";
import { getOrderBoardCounts, listOrders } from "@/modules/bookings/service";
import type { OrderStatus } from "@/modules/bookings/validation";
import { orderStatusSchema } from "@/modules/bookings/validation";
import OrdersFilters from "./OrdersFilters";
import OrdersBoard from "./OrdersBoard";
import OrdersList from "./OrdersList";

export const metadata: Metadata = { title: "Orders · TripMate Admin" };
export const instant = false;

type SearchParams = {
  search?: string;
  status?: string;
  view?: string;
  page?: string;
};

const PER_PAGE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status: OrderStatus | undefined = orderStatusSchema.safeParse(statusRaw).success
    ? (statusRaw as OrderStatus)
    : undefined;
  const view = sp.view === "list" ? "list" : "board";
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const [counts, paginated] = await Promise.all([
    getOrderBoardCounts(),
    listOrders({
      search: search || undefined,
      status: status || undefined,
      page: view === "list" ? page : 1,
      perPage: view === "list" ? PER_PAGE : 200, // Board view loads cards across columns
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(paginated.total / PER_PAGE));

  return (
    <div className="space-y-4">
      <OrdersFilters
        initialSearch={search}
        initialStatus={statusRaw}
        currentView={view}
      />

      {view === "list" ? (
        <OrdersList
          items={paginated.items}
          total={paginated.total}
          page={page}
          totalPages={totalPages}
        />
      ) : (
        <OrdersBoard initialItems={paginated.items} counts={counts} />
      )}
    </div>
  );
}
