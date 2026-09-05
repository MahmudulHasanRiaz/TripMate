import type { Metadata } from "next";
import { listCategories } from "@/modules/catalog/service";
import CategoriesView from "./CategoriesView";
import type { CategoryRow } from "./types";

export const metadata: Metadata = { title: "Categories · Catalog" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

export default async function CategoriesPage() {
  const categories = await listCategories(false);
  const rows = categories satisfies CategoryRow[];
  return <CategoriesView rows={rows} />;
}
