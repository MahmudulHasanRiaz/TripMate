import type { Metadata } from "next";
import { listServiceOptions } from "@/modules/catalog/visa-service";
import { listCategories } from "@/modules/catalog/service";
import ServiceOptionsView from "./ServiceOptionsView";

export const metadata: Metadata = { title: "Service Options · Catalog" };

export const instant = false;

export default async function ServiceOptionsPage() {
  const [options, categories] = await Promise.all([
    listServiceOptions(),
    listCategories(false),
  ]);

  return <ServiceOptionsView options={options} categories={categories} />;
}
