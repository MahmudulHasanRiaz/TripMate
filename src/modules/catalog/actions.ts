"use server";

import { requireSession } from "@/lib/auth-helpers";
import { listAllListings } from "./service";

export async function searchCatalogListingsAction(term: string) {
  try {
    await requireSession();
    const result = await listAllListings({ search: term.trim() || undefined, perPage: 20 });
    return {
      ok: true,
      items: result.items.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        costPrice: i.costPrice,
        currency: i.currency,
        durationDays: i.durationDays,
        status: i.status,
      })),
    };
  } catch (err) {
    console.error("[searchCatalogListingsAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to search listings",
      items: [],
    };
  }
}
