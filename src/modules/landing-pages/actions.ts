"use server";

/**
 * Landing page admin mutations — the write surface for `landing_pages`.
 *
 * Every action is a `landingAction` (withGuard content.manage + typed error
 * relay). After any write we expire BOTH cache tags the public /l/<slug> route
 * and the admin builder read through:
 *   - CACHE_TAGS.landingPages — the collection (admin list / sitemap set)
 *   - CACHE_TAGS.landingPage(id) — one page's render, keyed by its id
 * `updateTag` is the read-your-own-writes choice (Next 16; the single-arg
 * `revalidateTag` form is deprecated). So an editor sees their own change
 * immediately and a published page drops off /l/<slug> the moment it is
 * unpublished or trashed.
 *
 * The zod boundary contract is the module's hard-won rule: `landingPageInput`
 * is parsed HERE via .safeParse and the COERCED `parsed.data` is what reaches
 * the service — never the raw wire payload.
 */

import { updateTag } from "next/cache";
import { withGuard, GuardError } from "@/lib/guard";
import type { Session } from "@/lib/auth-helpers";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { landingPageInput, statusSchema, uuidSchema } from "@/modules/landing-pages/validation";
import type { LandingPageInput, LandingPageStatus } from "@/modules/landing-pages/validation";
import {
  getLandingById,
  LandingError,
  softDeleteLandingPage,
  updateLandingStatus,
  upsertLandingPage,
} from "@/modules/landing-pages/service";

export type LandingActionResult<Data = undefined> =
  | (Data extends undefined ? { ok: true } : { ok: true; data: Data })
  | { ok: false; code?: string; error: string };

/**
 * Guard + relay wrapper for the landing admin surface: wraps the body in
 * `withGuard({ permission: "content.manage" })` and converts the two thrown
 * error families into the `{ ok:false }` payload instead of leaking them
 * through Next's error serialization:
 *   - GuardError     -> { ok:false, error: "UNAUTHORIZED" }
 *   - LandingError   -> { ok:false, code, error: message } (typed SLUG_CONFLICT
 *     / NOT_FOUND — each surfaces in the UI with specific copy)
 * Anything else re-throws so the global error boundary owns unexpected failures.
 */
function landingAction<TInput, TOutput extends LandingActionResult>(
  run: (input: TInput, session: Session | null) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput> {
  const guarded = withGuard({ permission: "content.manage" }, run);
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await guarded(input);
    } catch (e) {
      if (e instanceof GuardError) {
        return { ok: false, error: e.code } as unknown as TOutput;
      }
      if (e instanceof LandingError) {
        return { ok: false, code: e.code, error: e.message } as unknown as TOutput;
      }
      throw e;
    }
  };
}

/** First failing issue rendered as "path: message" for the form. */
function parseLandingPageInput(
  input: unknown,
):
  | { ok: true; data: LandingPageInput }
  | { ok: false; code: "VALIDATION"; error: string } {
  const parsed = landingPageInput.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  const field = issue.path.join(".");
  return {
    ok: false,
    code: "VALIDATION",
    error: field ? `${field}: ${issue.message}` : issue.message,
  };
}

/** Trust-boundary check for an id that reaches DB columns raw. */
function parseLandingId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  return uuidSchema.safeParse(id).success ? id : null;
}

function expireLandingPage(id: string): void {
  updateTag(CACHE_TAGS.landingPages);
  updateTag(CACHE_TAGS.landingPage(id));
}

type LandingRef = { id: string; slug: string; status: LandingPageStatus };
type SaveResult = LandingActionResult<LandingRef>;

/** Create or update a landing page. Body re-parsed here as the trust boundary;
 *  the parsed (coerced) payload is what the service persists. */
export const saveLandingPage = landingAction<unknown, SaveResult>(async (input) => {
  const parsed = parseLandingPageInput(input);
  if (!parsed.ok) return parsed;
  const saved = await upsertLandingPage(parsed.data);
  expireLandingPage(saved.id);
  return { ok: true, data: { id: saved.id, slug: saved.slug, status: saved.status } };
});

/** Publish / unpublish a single landing page from the list UI. */
export const setLandingStatus = landingAction<
  { id: string; status: string },
  LandingActionResult
>(async (input) => {
  const id = parseLandingId(input.id);
  if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
  const parsedStatus = statusSchema.safeParse(input.status);
  if (!parsedStatus.success) {
    return { ok: false, code: "VALIDATION", error: "Invalid status" };
  }
  const saved = await updateLandingStatus(id, parsedStatus.data);
  expireLandingPage(saved.id);
  return { ok: true };
});

/** Soft-delete (trash) a landing page — its slug is released for a suffixed
 *  re-create and /l/<slug> stops resolving immediately. */
export const trashLandingPage = landingAction<{ id: string }, LandingActionResult>(
  async (input) => {
    const id = parseLandingId(input.id);
    if (!id) return { ok: false, code: "VALIDATION", error: "Invalid id" };
    const before = await getLandingById(id);
    if (!before) {
      return { ok: false, code: "NOT_FOUND", error: "Landing page not found or already deleted." };
    }
    const ok = await softDeleteLandingPage(id);
    if (!ok) {
      return { ok: false, code: "NOT_FOUND", error: "Landing page not found or already deleted." };
    }
    expireLandingPage(id);
    return { ok: true };
  },
);
