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

/**
 * Parse the post-category body once and hand the COERCED result to the
 * service. `input` as it arrives over the wire is the RAW form payload
 * (untrimmed strings); only `parsed.data` has the schema's trim transforms
 * applied. The first failing issue is rendered as "path: message" for the
 * form.
 */
function parsePostCategory(
  input: unknown,
):
  | { ok: true; data: PostCategoryInput }
  | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = postCategoryInput.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return {
    ok: false,
    code: "VALIDATION",
    error: field ? `${field}: ${issue.message}` : issue.message,
  };
}

/** Create or update a post category. Body re-parsed here as the trust boundary. */
export const savePostCategory = contentAction<
  PostCategoryInput,
  ContentActionResult<{ id: string }>
>(async (input) => {
  const parsed = parsePostCategory(input);
  if (!parsed.ok) return parsed;
  const saved = await upsertPostCategory(parsed.data);
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
