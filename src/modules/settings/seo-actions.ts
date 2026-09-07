"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { listings, destinations } from "@/modules/catalog/schema";
import { posts } from "@/modules/content/schema";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { GuardError, withGuard } from "@/lib/guard";

const saveSeoSchema = z.object({
  entityType: z.enum(["listing", "post", "destination"]),
  entityId: z.string().uuid(),
  seo: z.object({
    title: z.string().trim().max(70).optional(),
    description: z.string().trim().max(160).optional(),
  }),
});

export type SaveSeoInput = z.infer<typeof saveSeoSchema>;

export async function saveEntitySeoAction(
  rawInput: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = saveSeoSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid SEO input" };
  }

  const { entityType, entityId, seo } = parsed.data;
  const permission = entityType === "post" ? "content.manage" : "catalog.manage";

  const guarded = withGuard<SaveSeoInput, { ok: true } | { ok: false; error: string }>(
    { permission },
    async () => {
      const cleanSeo = {
        title: seo.title?.trim() || null,
        description: seo.description?.trim() || null,
      };

      if (entityType === "listing") {
        await db
          .update(listings)
          .set({ seo: cleanSeo, updatedAt: new Date() })
          .where(eq(listings.id, entityId));
        updateTag(CACHE_TAGS.listings);
        revalidatePath("/admin/catalog/listings");
        revalidatePath(`/packages`);
      } else if (entityType === "post") {
        await db
          .update(posts)
          .set({ seo: cleanSeo, updatedAt: new Date() })
          .where(eq(posts.id, entityId));
        updateTag(CACHE_TAGS.posts);
        revalidatePath("/admin/content/posts");
        revalidatePath(`/blog`);
      } else if (entityType === "destination") {
        await db
          .update(destinations)
          .set({ seo: cleanSeo, updatedAt: new Date() })
          .where(eq(destinations.id, entityId));
        updateTag(CACHE_TAGS.listings);
        revalidatePath("/admin/catalog/destinations");
      }

      return { ok: true as const };
    },
  );

  try {
    return await guarded(parsed.data);
  } catch (err) {
    if (err instanceof GuardError) {
      return { ok: false, error: "Unauthorized to update SEO settings" };
    }
    return { ok: false, error: "Failed to update SEO configuration" };
  }
}
