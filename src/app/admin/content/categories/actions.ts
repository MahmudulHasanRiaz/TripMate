"use server";

/**
 * Post-category mutations — the blog taxonomy admin write surface.
 *
 * Same `contentAction` plumbing as the post actions. `post_categories` has no
 * soft-delete/active column, so REMOVAL IS A HARD DELETE: the confirm dialog
 * must say "permanently deleted". The service refuses with IN_USE while LIVE
 * posts still reference the category (references held only by trashed posts are
 * cleared first so the FK does not block the delete).
 *
 * A category name/slug renders inside post cards on the public blog, so a
 * taxonomy change also expires CACHE_TAGS.posts (the same tag savePost uses).
 */

import { updateTag } from "next/cache";
import { postCategoryInput } from "@/modules/content/validation";
import type { PostCategoryInput } from "@/modules/content/validation";
import { deletePostCategory, upsertPostCategory } from "@/modules/content/service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  contentAction,
  parseContentId,
  type ContentActionResult,
} from "@/modules/content/action-utils";

function revalidatePosts(): void {
  updateTag(CACHE_TAGS.posts);
}

/** First failing schema issue, rendered as "path: message" for the form. */
function firstIssueMessage(input: unknown): string {
  const parsed = postCategoryInput.safeParse(input);
  if (parsed.success) return "";
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Create or update a post category. Body re-parsed here as the trust boundary. */
export const savePostCategory = contentAction<
  PostCategoryInput,
  ContentActionResult<{ id: string }>
>(async (input) => {
  const message = firstIssueMessage(input);
  if (message) return { ok: false, code: "VALIDATION", error: message };
  const saved = await upsertPostCategory(input);
  revalidatePosts();
  return { ok: true, data: { id: saved.id } };
});

/** Hard-delete a post category. Refuses (IN_USE) while live posts reference it. */
export const removePostCategory = contentAction<
  { id: string },
  ContentActionResult
>(async (input) => {
  const id = parseContentId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const ok = await deletePostCategory(id);
  if (!ok) {
    return { ok: false, code: "NOT_FOUND", error: "Category not found." };
  }
  revalidatePosts();
  return { ok: true };
});
