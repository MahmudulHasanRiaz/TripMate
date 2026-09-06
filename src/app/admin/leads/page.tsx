import type { Metadata } from "next";
import {
  getLeadBoardCounts,
  listLeads,
  listStaffUsers,
} from "@/modules/leads/service";
import type { LeadStatus } from "@/modules/leads/validation";
import { leadStatusSchema } from "@/modules/leads/validation";
import LeadsBoard from "./LeadsBoard";
import LeadsList from "./LeadsList";
import LeadsFilters from "./LeadsFilters";

export const metadata: Metadata = { title: "Leads · TripMate Admin" };
export const instant = false;

type SearchParams = {
  search?: string;
  status?: string;
  assignedTo?: string;
  view?: string;
  page?: string;
};

const PER_PAGE = 25;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status: LeadStatus | undefined = leadStatusSchema.safeParse(statusRaw).success
    ? (statusRaw as LeadStatus)
    : undefined;
  const assignedTo = typeof sp.assignedTo === "string" ? sp.assignedTo.trim() : "";
  const view = sp.view === "list" ? "list" : "board";
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const [counts, paginated, staffUsers] = await Promise.all([
    getLeadBoardCounts(),
    listLeads({
      search: search || undefined,
      status: status || undefined,
      assignedTo: assignedTo || undefined,
      page: view === "list" ? page : 1,
      perPage: view === "list" ? PER_PAGE : 200, // Board view loads up to 200 cards across columns
    }),
    listStaffUsers(),
  ]);

  const totalPages = Math.max(1, Math.ceil(paginated.total / PER_PAGE));
  const makePageParams = (delta: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (assignedTo) params.set("assignedTo", assignedTo);
    params.set("view", "list");
    params.set("page", String(Math.min(totalPages, Math.max(1, page + delta))));
    return params.toString();
  };

  return (
    <div className="space-y-4">
      {/* Filter bar & view toggle */}
      <LeadsFilters
        initialSearch={search}
        initialAssignedTo={assignedTo}
        currentView={view}
        staffUsers={staffUsers}
      />

      {/* Render either Kanban board or List table */}
      {view === "list" ? (
        <LeadsList
          items={paginated.items}
          total={paginated.total}
          page={page}
          totalPages={totalPages}
          staffUsers={staffUsers}
          makePageParams={makePageParams}
        />
      ) : (
        <LeadsBoard
          initialItems={paginated.items}
          counts={counts}
          staffUsers={staffUsers}
        />
      )}
    </div>
  );
}
