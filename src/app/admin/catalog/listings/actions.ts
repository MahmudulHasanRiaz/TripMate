"use server";

/**
 * Catalog listing mutations — the admin write surface for `listings`.
 *
 * Every action is an `adminAction` (withGuard catalog.manage + typed error
 * relay). After a successful write we expire the cache tags the PUBLIC side
 * reads through: the listings index tag plus this entity's id- and slug-keyed
 * tags (see @/lib/cache-tags — the exact id-vs-slug tag the public routes tag
 * with lands in Tasks 9-12, so we invalidate both spellings). `updateTag` is
 * the read-your-own-writes choice: the next request for those tags refetches
 * instead of serving stale content, so an editor sees their own change
 * immediately. Server Actions may call `updateTag` (unlike `revalidateTag`,
 * whose single-arg form is deprecated in Next 16).
 */

import { updateTag } from "next/cache";
import { listingInput, listingStatusSchema } from "@/modules/catalog/validation";
import type { ListingInput, ListingStatus } from "@/modules/catalog/validation";
import {
  getListingById,
  softDeleteListing,
  updateListingStatus,
  upsertListing,
} from "@/modules/catalog/service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { adminAction, parseActionId, type ActionResult } from "@/modules/catalog/action-utils";

type ListingRef = { id: string; slug: string };
type SaveResult = ActionResult<ListingRef>;

function revalidateListing(ref: ListingRef): void {
  updateTag(CACHE_TAGS.listings);
  updateTag(CACHE_TAGS.listing(ref.id));
  updateTag(CACHE_TAGS.listing(ref.slug));
}

/** First failing schema issue, rendered as "path: message" for the form. */
function firstIssueMessage(input: unknown): string {
  const parsed = listingInput.safeParse(input);
  if (parsed.success) return "";
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Create or update a listing. The body is re-parsed here as the trust boundary. */
export const saveListing = adminAction<ListingInput, SaveResult>(async (input) => {
  const message = firstIssueMessage(input);
  if (message) return { ok: false, code: "VALIDATION", error: message };
  const saved = await upsertListing(input);
  revalidateListing({ id: saved.id, slug: saved.slug });
  return { ok: true, data: { id: saved.id, slug: saved.slug } };
});

/** Publish / unpublish / archive a single listing (draft/published from the list UI). */
export const setListingStatus = adminAction<
  { id: string; status: ListingStatus },
  ActionResult
>(async (input) => {
  // Trust boundary: id/status reach DB columns raw, so parse them before use.
  const id = parseActionId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const parsedStatus = listingStatusSchema.safeParse(input.status);
  if (!parsedStatus.success) return { ok: false, code: "VALIDATION", error: "Invalid status" };
  const saved = await updateListingStatus(id, parsedStatus.data);
  revalidateListing({ id: saved.id, slug: saved.slug });
  return { ok: true };
});

/** Soft-delete (trash) a listing — its slug is released for a suffixed re-create. */
export const trashListing = adminAction<{ id: string }, ActionResult>(async (input) => {
  const id = parseActionId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const before = await getListingById(id);
  if (!before) return { ok: false, code: "NOT_FOUND", error: "Listing not found or already deleted." };
  const ok = await softDeleteListing(id);
  if (!ok) return { ok: false, code: "NOT_FOUND", error: "Listing not found or already deleted." };
  revalidateListing({ id: before.id, slug: before.slug });
  return { ok: true };
});
