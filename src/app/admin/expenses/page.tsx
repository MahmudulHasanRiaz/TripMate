import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth-helpers";
import { hasPermission } from "@/modules/users/permissions";
import { listCategories, listExpenses } from "@/modules/expenses/service";
import type { ExpenseStatus } from "@/modules/expenses/validation";
import { expenseStatusSchema } from "@/modules/expenses/validation";
import ExpenseEntriesView from "./ExpenseEntriesView";

export const metadata: Metadata = { title: "Expenses · TripMate Admin" };
export const instant = false;

type SearchParams = {
  status?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: string;
};

const PER_PAGE = 25;

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requirePermission("expenses.submit");
  const canApprove = hasPermission(session.user.role, null, "expenses.approve");

  const sp = await searchParams;
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status: ExpenseStatus | undefined = expenseStatusSchema.safeParse(statusRaw).success
    ? (statusRaw as ExpenseStatus)
    : undefined;
  const categoryId = typeof sp.categoryId === "string" ? sp.categoryId : undefined;
  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const [paginated, categories] = await Promise.all([
    listExpenses({
      status,
      categoryId,
      from,
      to,
      search: search || undefined,
      page,
      perPage: PER_PAGE,
    }),
    listCategories(true),
  ]);

  const totalPages = Math.max(1, Math.ceil(paginated.total / PER_PAGE));

  return (
    <ExpenseEntriesView
      items={paginated.items}
      total={paginated.total}
      page={page}
      totalPages={totalPages}
      categories={categories}
      canApprove={canApprove}
      initialFilters={{
        status: statusRaw || "all",
        categoryId: categoryId || "all",
        from: from || "",
        to: to || "",
        search: search || "",
      }}
    />
  );
}
