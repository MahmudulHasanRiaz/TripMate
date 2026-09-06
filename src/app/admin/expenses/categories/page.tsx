import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth-helpers";
import { listCategories } from "@/modules/expenses/service";
import ExpenseCategoriesView from "./ExpenseCategoriesView";

export const metadata: Metadata = { title: "Expense Categories · TripMate Admin" };
export const instant = false;

export default async function ExpenseCategoriesPage() {
  await requirePermission("expenses.approve");
  const categories = await listCategories(false);

  return <ExpenseCategoriesView categories={categories} />;
}
