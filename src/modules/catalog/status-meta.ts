import type { ListingStatus } from "./validation";

/**
 * Presentation metadata for listing status. Pure data (no server-only import)
 * so both the server-rendered table and the client row actions agree on labels
 * and badge tones. Variant strings match the Badge component's variant set.
 */
export type BadgeTone =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

export const LISTING_STATUS_META: Record<
  ListingStatus,
  { label: string; variant: BadgeTone }
> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "outline" },
};

/** Compact price rendering used across the catalog admin. */
export function formatPrice(
  price: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (price === null || price === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "BDT",
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    // Unknown currency code → fall back to plain grouping.
    return `${price.toLocaleString("en-US")} ${currency || ""}`.trim();
  }
}
