import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getListingById,
  listCategories,
  listDestinations,
  type ListingWithRefs,
} from "@/modules/catalog/service";
import ListingForm, {
  type CategoryOption,
  type DestinationOption,
  type ListingFormInitial,
} from "../../ListingForm";

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

// Destination "none" sentinel — must match ListingForm's NONE marker.
const NONE = "__none__";

function toFormInitial(listing: ListingWithRefs): ListingFormInitial {
  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    categoryId: listing.categoryId,
    destinationId: listing.destinationId ?? NONE,
    summary: listing.summary ?? "",
    description: listing.description ?? "",
    coverImage: listing.coverImage?.url ?? "",
    videoUrl: listing.videoUrl ?? "",
    durationDays: listing.durationDays === null ? "" : String(listing.durationDays),
    rating: listing.rating === null ? "" : String(listing.rating),
    price: listing.price === null ? "" : String(listing.price),
    currency: listing.currency,
    status: listing.status,
    gallery: listing.gallery.map((image) => ({
      url: image.url,
      alt: image.alt ?? "",
    })),
    itinerary: listing.itinerary.map((row) => ({
      day: row.day,
      title: row.title,
      details: row.details,
    })),
    inclusions: [...listing.inclusions],
    exclusions: [...listing.exclusions],
    seoTitle: listing.seo?.title ?? "",
    seoDescription: listing.seo?.description ?? "",
  };
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const categories = (await listCategories(false)).map(
    (c): CategoryOption => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      isActive: c.isActive,
    }),
  );
  const destinations = (await listDestinations(false)).map(
    (d): DestinationOption => ({ id: d.id, name: d.name, isActive: d.isActive }),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={"/admin/catalog/listings" as Route}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to listings
        </Link>
        <h2 className="text-lg font-semibold tracking-tight">Edit listing</h2>
        <p className="text-sm text-muted-foreground">{listing.title}</p>
      </div>
      <ListingForm
        initial={toFormInitial(listing)}
        categories={categories}
        destinations={destinations}
      />
    </div>
  );
}
