import type { ServiceKind } from "@/modules/catalog/validation";

/** Human labels for the three service-category kinds (pure, client-safe). */
export const CATEGORY_KIND_META: Record<
  ServiceKind,
  { label: string; hint: string }
> = {
  package: {
    label: "Package",
    hint: "A bookable itinerary with price, duration and inclusions.",
  },
  inquiry_based: {
    label: "Inquiry-based",
    hint: "Custom work priced on request (leads instead of a storefront price).",
  },
  redirect: {
    label: "Redirect",
    hint: "A category whose listing cards point at an external URL.",
  },
};
