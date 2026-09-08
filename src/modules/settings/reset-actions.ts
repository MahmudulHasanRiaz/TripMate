"use server";

import { updateTag } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  destinations,
  expenseCategories,
  expenses,
  landingPages,
  leadEvents,
  leads,
  listings,
  mediaFiles,
  orderStatusEvents,
  orders,
  pages,
  paymentGateways,
  payments,
  postCategories,
  posts,
  quotations,
  quotationItems,
  serviceCategories,
  serviceOptions,
  settings,
  travelers,
  visaServices,
  visaTypes,
} from "@/db/schema";
import { deleteFileObject } from "@/modules/media/storage";
import { seedDemoData } from "@/db/demo-seeder";
import { seedProductionBaseline } from "@/db/production-seeder";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { withGuard, GuardError } from "@/lib/guard";

export type ResetReinitResult = {
  ok: boolean;
  mediaRemoved: number;
  mediaFailed: number;
  seededMode: "demo" | "production";
  error?: string;
};

/**
 * Destructive admin "Reset & re-initialize".
 *
 * Deletes every business/content row (orders, payments, quotations, leads,
 * expenses, posts/pages, landing pages, catalog/destinations/visas/options,
 * media library) AND the underlying storage objects (R2 or local, whichever
 * driver the media row was stored on), then re-seeds the chosen mode
 * (demo showcase or clean production baseline). Keeps users/sessions/auth so
 * the current admin stays signed in; public content tags are revalidated so
 * the freshly seeded site is visible immediately.
 */
export const resetAndReinitializeAction = withGuard(
  { permission: "settings.manage" },
  async (
    rawInput: unknown,
  ): Promise<ResetReinitResult> => {
    const mode = (rawInput as { mode?: string } | null)?.mode;
    if (mode !== "demo" && mode !== "production") {
      return { ok: false, mediaRemoved: 0, mediaFailed: 0, seededMode: "demo", error: "Choose demo or production re-initialization." };
    }

    // 1. Delete stored media objects from the real driver (R2 or local).
    let mediaRemoved = 0;
    let mediaFailed = 0;
    const mediaRows = await db
      .select({ disk: mediaFiles.disk, path: mediaFiles.path })
      .from(mediaFiles);

    for (const row of mediaRows) {
      try {
        await deleteFileObject(row.disk, row.path);
        mediaRemoved += 1;
      } catch (e) {
        mediaFailed += 1;
        console.error("[reset] failed deleting media object", row.disk, row.path, e);
      }
    }

    // 2. Delete content/business rows, children first (FK-safe).
    await db.transaction(async (tx) => {
      await tx.delete(payments);
      await tx.delete(paymentGateways);
      await tx.delete(orderStatusEvents);
      await tx.delete(travelers);
      await tx.delete(orders);
      await tx.delete(quotationItems);
      await tx.delete(quotations);
      await tx.delete(leadEvents);
      await tx.delete(leads);
      await tx.delete(expenses);
      await tx.delete(expenseCategories);
      await tx.delete(posts);
      await tx.delete(postCategories);
      await tx.delete(pages);
      await tx.delete(landingPages);
      await tx.delete(serviceOptions);
      await tx.delete(visaServices);
      await tx.delete(visaTypes);
      await tx.delete(listings);
      await tx.delete(destinations);
      await tx.delete(serviceCategories);
      await tx.delete(mediaFiles);
      // Brand/content settings are re-created by the chosen seeder below.
      await tx.delete(settings).where(
        inArray(settings.key, ["site", "home", "theme", "storage", "meta"]),
      );
    });

    // 3. Re-initialize with the chosen seed.
    if (mode === "demo") {
      await seedDemoData();
    } else {
      await seedProductionBaseline();
    }

    // 4. Expire every public content tag so the seeded site is visible now.
    updateTag(CACHE_TAGS.settings);
    updateTag(CACHE_TAGS.listings);
    updateTag(CACHE_TAGS.posts);
    updateTag(CACHE_TAGS.pages);
    updateTag(CACHE_TAGS.landingPages);
    updateTag(CACHE_TAGS.orders);

    return { ok: true, mediaRemoved, mediaFailed, seededMode: mode };
  },
);

export async function runResetAndReinitialize(
  rawInput: unknown,
): Promise<ResetReinitResult> {
  try {
    return await resetAndReinitializeAction(rawInput);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, mediaRemoved: 0, mediaFailed: 0, seededMode: "demo", error: err.code };
    }
    console.error("[reset] failed", err);
    return {
      ok: false,
      mediaRemoved: 0,
      mediaFailed: 0,
      seededMode: "demo",
      error: err instanceof Error ? err.message : "Reset failed",
    };
  }
}
