"use server";

/**
 * Category mutations — taxonomy admin write surface.
 *
 * Same `adminAction` plumbing as the listing actions: withGuard catalog.manage
 * plus typed error relay. A category upsert is a FULL REPLACE — the admin form
 * always sends `isActive`, so an editor who forgets the toggle cannot silently
 * reactivate a deactivated category (T4-review carry-in). Trash = deactivate
 * (categories have no soft-delete column); the service refuses with IN_USE when
 * live listings still reference the category.
 */

import { updateTag } from "next/cache";
import { categoryInput } from "@/modules/catalog/validation";
import type { CategoryInput } from "@/modules/catalog/validation";
import { softDeleteCategory, upsertCategory } from "@/modules/catalog/service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { adminAction, type ActionResult } from "@/modules/catalog/action-utils";

/** Category name/slug/kind render inside listing cards, so a taxonomy change
 *  must also expire the listings tags the public side caches on. */
function revalidatePublic(): void {
  updateTag(CACHE_TAGS.listings);
}

/** First failing schema issue, rendered as "path: message" for the form. */
function firstIssueMessage(input: unknown): string {
  const parsed = categoryInput.safeParse(input);
  if (parsed.success) return "";
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Create or update a category. Body re-parsed here as the trust boundary. */
export const saveCategory = adminAction<CategoryInput, ActionResult<{ id: string }>>(
  async (input) => {
    const message = firstIssueMessage(input);
    if (message) return { ok: false, code: "VALIDATION", error: message };
    const saved = await upsertCategory(input);
    revalidatePublic();
    return { ok: true, data: { id: saved.id } };
  },
);

/** Deactivate a category. Refuses (IN_USE) while live listings reference it. */
export const trashCategory = adminAction<{ id: string }, ActionResult>(async (input) => {
  const ok = await softDeleteCategory(input.id);
  if (!ok) {
    return { ok: false, code: "NOT_FOUND", error: "Category not found." };
  }
  revalidatePublic();
  return { ok: true };
});
