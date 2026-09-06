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
import { adminAction, parseActionId, type ActionResult } from "@/modules/catalog/action-utils";

/** Category name/slug/kind render inside listing cards, so a taxonomy change
 *  must also expire the listings tags the public side caches on. */
function revalidatePublic(): void {
  updateTag(CACHE_TAGS.listings);
}

/**
 * Parse the category body once and hand the COERCED result to the service.
 * `input` as it arrives over the wire is the RAW form payload; only
 * `parsed.data` has the schema's transforms applied (sortOrder string →
 * number, isActive absent → default). Passing the raw input downstream would
 * hand the service a string sortOrder / unparsed isActive. The first failing
 * issue is rendered as "path: message" for the form.
 */
function parseCategory(
  input: unknown,
):
  | { ok: true; data: CategoryInput }
  | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = categoryInput.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return {
    ok: false,
    code: "VALIDATION",
    error: field ? `${field}: ${issue.message}` : issue.message,
  };
}

/** Create or update a category. Body re-parsed here as the trust boundary. */
export const saveCategory = adminAction<CategoryInput, ActionResult<{ id: string }>>(
  async (input) => {
    const parsed = parseCategory(input);
    if (!parsed.ok) return parsed;
    const saved = await upsertCategory(parsed.data);
    revalidatePublic();
    return { ok: true, data: { id: saved.id } };
  },
);

/** Deactivate a category. Refuses (IN_USE) while live listings reference it. */
export const trashCategory = adminAction<{ id: string }, ActionResult>(async (input) => {
  const id = parseActionId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const ok = await softDeleteCategory(id);
  if (!ok) {
    return { ok: false, code: "NOT_FOUND", error: "Category not found." };
  }
  revalidatePublic();
  return { ok: true };
});
