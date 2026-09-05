"use server";

/**
 * Blog post mutations — the admin write surface for `posts`.
 *
 * Every action is a `contentAction` (withGuard content.manage + typed error
 * relay). After a successful write we expire the cache tag the PUBLIC blog
 * reads through (CACHE_TAGS.posts — the blog index; Task 12 also tags post
 * detail reads on the same tag). `updateTag` is the read-your-own-writes
 * choice: the next request for that tag refetches instead of serving stale
 * content, so an editor sees their own change immediately. Server Actions may
 * call `updateTag` (unlike `revalidateTag`, whose single-arg form is
 * deprecated in Next 16).
 *
 * AUTHOR IS SERVER-SET: posts never carry an author form field. On CREATE the
 * current session user is stamped as the author; on UPDATE the existing author
 * is left untouched so a re-edit by a different editor does not silently
 * rewrite history.
 */

import { updateTag } from "next/cache";
import { contentStatusSchema, postInput } from "@/modules/content/validation";
import type { ContentStatus, PostInput } from "@/modules/content/validation";
import {
  getPostById,
  softDeletePost,
  updatePostStatus,
  upsertPost,
} from "@/modules/content/service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  contentAction,
  parseContentId,
  type ContentActionResult,
} from "@/modules/content/action-utils";

type PostRef = { id: string; slug: string };
type SaveResult = ContentActionResult<PostRef>;

function revalidatePosts(): void {
  updateTag(CACHE_TAGS.posts);
}

/** First failing schema issue, rendered as "path: message" for the form. */
function firstIssueMessage(input: unknown): string {
  const parsed = postInput.safeParse(input);
  if (parsed.success) return "";
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/**
 * Create or update a post. The body is re-parsed here as the trust boundary;
 * a NEW post gets the current session user as its author (never a client
 * field), while edits keep whatever author the post already has.
 */
export const savePost = contentAction<PostInput, SaveResult>(async (input, session) => {
  const message = firstIssueMessage(input);
  if (message) return { ok: false, code: "VALIDATION", error: message };
  const payload = input.id
    ? input
    : { ...input, authorId: session?.user.id ?? null };
  const saved = await upsertPost(payload);
  revalidatePosts();
  return { ok: true, data: { id: saved.id, slug: saved.slug } };
});

/** Publish / unpublish a single post (draft/published from the list UI). */
export const togglePublish = contentAction<
  { id: string; status: ContentStatus },
  ContentActionResult
>(async (input) => {
  // Trust boundary: id/status reach DB columns raw, so parse them before use.
  const id = parseContentId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const parsedStatus = contentStatusSchema.safeParse(input.status);
  if (!parsedStatus.success) {
    return { ok: false, code: "VALIDATION", error: "Invalid status" };
  }
  await updatePostStatus(id, parsedStatus.data);
  revalidatePosts();
  return { ok: true };
});

/** Soft-delete (trash) a post — its slug is released for a suffixed re-create. */
export const trashPost = contentAction<{ id: string }, ContentActionResult>(async (input) => {
  const id = parseContentId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const before = await getPostById(id);
  if (!before) return { ok: false, code: "NOT_FOUND", error: "Post not found or already deleted." };
  const ok = await softDeletePost(id);
  if (!ok) return { ok: false, code: "NOT_FOUND", error: "Post not found or already deleted." };
  revalidatePosts();
  return { ok: true };
});
