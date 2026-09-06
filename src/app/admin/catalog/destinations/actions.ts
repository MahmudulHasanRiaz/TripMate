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
import { adminAction, parseActionId, type ActionResult } from "@/modules/catalog/action-utils";

function revalidatePublic(): void {
  updateTag(CACHE_TAGS.listings);
}

/**
 * Parse the destination body once and hand the COERCED result to the service.
 * `input` as it arrives over the wire is the RAW form payload; only
 * `parsed.data` has the schema's transforms applied (isActive absent →
 * default). The first failing issue is rendered as "path: message" for the
 * form.
 */
function parseDestination(
  input: unknown,
):
  | { ok: true; data: DestinationInput }
  | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = destinationInput.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return {
    ok: false,
    code: "VALIDATION",
    error: field ? `${field}: ${issue.message}` : issue.message,
  };
}

/** Create or update a destination. Body re-parsed here as the trust boundary. */
export const saveDestination = adminAction<DestinationInput, ActionResult<{ id: string }>>(
  async (input) => {
    const parsed = parseDestination(input);
    if (!parsed.ok) return parsed;
    const saved = await upsertDestination(parsed.data);
    revalidatePublic();
    return { ok: true, data: { id: saved.id } };
  },
);

/** Deactivate a destination. Refuses (IN_USE) while live listings reference it. */
export const trashDestination = adminAction<{ id: string }, ActionResult>(async (input) => {
  const id = parseActionId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const ok = await softDeleteDestination(id);
  if (!ok) {
    return { ok: false, code: "NOT_FOUND", error: "Destination not found." };
  }
  revalidatePublic();
  return { ok: true };
});
