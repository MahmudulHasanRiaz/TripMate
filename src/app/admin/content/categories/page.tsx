import type { Metadata } from "next";
import { listPostCategories } from "@/modules/content/service";
import PostCategoriesView from "./PostCategoriesView";
import type { PostCategoryRow } from "./types";

export const metadata: Metadata = { title: "Post categories · Content" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

export default async function PostCategoriesPage() {
  const categories = await listPostCategories();
  const rows = categories satisfies PostCategoryRow[];
  return <PostCategoriesView rows={rows} />;
}
