"use server";

/**
 * Static page mutations — the admin write surface for `pages` (about-us, faq,
 * terms, privacy, …). Every action is a `contentAction` (withGuard
 * content.manage + typed error relay) and expires CACHE_TAGS.pages — the tag
 * the public site's static page routes cache on — so an editor sees their own
 * change immediately via `updateTag` (read-your-own-writes).
 */

import { updateTag } from "next/cache";
import { pageInput } from "@/modules/content/validation";
import type { PageInput } from "@/modules/content/validation";
import { getPageById, softDeletePage, upsertPage } from "@/modules/content/service";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  contentAction,
  parseContentId,
  type ContentActionResult,
} from "@/modules/content/action-utils";

type PageRef = { id: string; slug: string };
type SaveResult = ContentActionResult<PageRef>;

function revalidatePages(): void {
  updateTag(CACHE_TAGS.pages);
}

/**
 * Parse the page body once and hand the COERCED result to the service. `input`
 * as it arrives over the wire is the RAW form payload; only `parsed.data` has
 * the schema's preprocess transforms applied (sections content trimmed). The
 * first failing issue is rendered as "path: message" for the form.
 */
function parsePage(
  input: unknown,
):
  | { ok: true; data: PageInput }
  | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = pageInput.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return {
    ok: false,
    code: "VALIDATION",
    error: field ? `${field}: ${issue.message}` : issue.message,
  };
}

/** Create or update a static page. Body re-parsed here as the trust boundary. */
export const savePage = contentAction<PageInput, SaveResult>(async (input) => {
  const parsed = parsePage(input);
  if (!parsed.ok) return parsed;
  const saved = await upsertPage(parsed.data);
  revalidatePages();
  return { ok: true, data: { id: saved.id, slug: saved.slug } };
});

/** Soft-delete (trash) a static page — its slug is released for a suffixed re-create. */
export const trashPage = contentAction<{ id: string }, ContentActionResult>(async (input) => {
  const id = parseContentId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const before = await getPageById(id);
  if (!before) return { ok: false, code: "NOT_FOUND", error: "Page not found or already deleted." };
  const ok = await softDeletePage(id);
  if (!ok) return { ok: false, code: "NOT_FOUND", error: "Page not found or already deleted." };
  revalidatePages();
  return { ok: true };
});
