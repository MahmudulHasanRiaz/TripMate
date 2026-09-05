"use server";

/**
 * Destination mutations — taxonomy admin write surface.
 *
 * Mirrors the category actions: adminAction (withGuard catalog.manage + typed
 * error relay), authoritative re-parse of the body, and listing-tag
 * invalidation because destination names render inside listing cards on the
 * public side. Upserts are FULL REPLACE — the form always sends `isActive`.
 * Trash = deactivate; the service refuses with IN_USE while live listings
 * reference the destination.
 */

import { updateTag } from "next/cache";
import { destinationInput } from "@/modules/catalog/validation";
import type { DestinationInput } from "@/modules/catalog/validation";
import {
  softDeleteDestination,
  upsertDestination,
} from "@/modules/catalog/service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { adminAction, type ActionResult } from "@/modules/catalog/action-utils";

function revalidatePublic(): void {
  updateTag(CACHE_TAGS.listings);
}

function firstIssueMessage(input: unknown): string {
  const parsed = destinationInput.safeParse(input);
  if (parsed.success) return "";
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** Create or update a destination. Body re-parsed here as the trust boundary. */
export const saveDestination = adminAction<DestinationInput, ActionResult<{ id: string }>>(
  async (input) => {
    const message = firstIssueMessage(input);
    if (message) return { ok: false, code: "VALIDATION", error: message };
    const saved = await upsertDestination(input);
    revalidatePublic();
    return { ok: true, data: { id: saved.id } };
  },
);

/** Deactivate a destination. Refuses (IN_USE) while live listings reference it. */
export const trashDestination = adminAction<{ id: string }, ActionResult>(async (input) => {
  const ok = await softDeleteDestination(input.id);
  if (!ok) {
    return { ok: false, code: "NOT_FOUND", error: "Destination not found." };
  }
  revalidatePublic();
  return { ok: true };
});
