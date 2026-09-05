import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";
import { listCategories, listDestinations } from "@/modules/catalog/service";
import ListingForm, {
  type CategoryOption,
  type DestinationOption,
} from "../ListingForm";

export const metadata: Metadata = { title: "New listing · Catalog" };

// Fresh, per-request reads behind an auth gate — no static shell to serve.
export const instant = false;

// Destination "none" sentinel — must match ListingForm's NONE marker.
const NONE = "__none__";

function emptyFormInitial(): {
  id?: undefined;
  title: string;
  slug: string;
  categoryId: string;
  destinationId: string;
  summary: string;
  description: string;
  coverImage: string;
  videoUrl: string;
  durationDays: string;
  rating: string;
  price: string;
  currency: string;
  status: "draft";
  gallery: { url: string; alt: string }[];
  itinerary: { day: string; title: string; details: string }[];
  inclusions: string[];
  exclusions: string[];
  seoTitle: string;
  seoDescription: string;
} {
  return {
    title: "",
    slug: "",
    categoryId: "",
    destinationId: NONE,
    summary: "",
    description: "",
    coverImage: "",
    videoUrl: "",
    durationDays: "",
    rating: "",
    price: "",
    currency: "BDT",
    status: "draft",
    gallery: [],
    itinerary: [],
    inclusions: [],
    exclusions: [],
    seoTitle: "",
    seoDescription: "",
  };
}

export default async function NewListingPage() {
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
        <h2 className="text-lg font-semibold tracking-tight">New listing</h2>
        <p className="text-sm text-muted-foreground">
          Create a service listing. It stays a draft until you publish it.
        </p>
      </div>
      <ListingForm
        initial={emptyFormInitial()}
        categories={categories}
        destinations={destinations}
      />
    </div>
  );
}
