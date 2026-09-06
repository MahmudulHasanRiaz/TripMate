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

/**
 * Parse the post body once and hand the COERCED result to the service. `input`
 * as it arrives over the wire is the RAW form payload — markdown bodies
 * untrimmed, blank optionals still "" — while only `parsed.data` has the
 * schema's preprocess transforms applied (blank → null, trim). The first
 * failing issue is rendered as "path: message" for the form.
 */
function parsePost(
  input: unknown,
):
  | { ok: true; data: PostInput }
  | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = postInput.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return {
    ok: false,
    code: "VALIDATION",
    error: field ? `${field}: ${issue.message}` : issue.message,
  };
}

/**
 * Create or update a post. The body is re-parsed here as the trust boundary;
 * a NEW post gets the current session user as its author (never a client
 * field), while edits keep whatever author the post already has.
 */
/** A copy of `input` with any client-supplied authorId removed. */
function withoutAuthorId(input: PostInput): PostInput {
  const { authorId: _ignored, ...rest } = input;
  void _ignored;
  return rest;
}

export const savePost = contentAction<PostInput, SaveResult>(async (input, session) => {
  const parsed = parsePost(input);
  if (!parsed.ok) return parsed;
  // AUTHOR IS SERVER-SET AND IMMUTABLE. A new post is stamped with the current
  // session user (never a client field); an edit keeps the byline the post was
  // created with. The parsed payload is stripped of any supplied authorId so a
  // crafted server-action call cannot reassign or null the author.
  const data = parsed.data;
  const payload = data.id
    ? withoutAuthorId(data)
    : { ...data, authorId: session?.user.id ?? null };
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
