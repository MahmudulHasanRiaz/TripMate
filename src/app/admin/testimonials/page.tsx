import type { Metadata } from "next";
import { listTestimonials } from "@/modules/content/testimonials-service";
import TestimonialsView from "./TestimonialsView";

export const metadata: Metadata = {
  title: "Testimonials · TripMate Admin",
};

export default async function TestimonialsPage(props: {
  searchParams: Promise<{ search?: string; status?: "all" | "published" | "unpublished" | "featured" }>;
}) {
  const params = await props.searchParams;
  const search = params.search || "";
  const filter = params.status || "all";

  const { items, total } = await listTestimonials({
    search: search || undefined,
    isPublished:
      filter === "published" ? true : filter === "unpublished" ? false : undefined,
    featured: filter === "featured" ? true : undefined,
    perPage: 100,
  });

  return (
    <TestimonialsView
      items={items}
      total={total}
      initialSearch={search}
      initialFilter={filter}
    />
  );
}
