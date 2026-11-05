import { revalidateTag } from "next/cache";

import {
  BOOT_REVALIDATE_HEADER,
  BOOT_REVALIDATE_TAGS,
  isBootRevalidateTokenValid,
} from "@/lib/boot-revalidate";
import { getEnv } from "@/lib/env";

/**
 * POST /api/internal/boot-revalidate — boot-time cache convergence (FU-31).
 *
 * Invoked exactly once per container start by scripts/boot-revalidate.mjs
 * (via scripts/boot.sh, after /api/health passes) to expire the cache
 * generation the Docker build baked from its baseline seed + build env, so
 * the site converges to the runtime database/env with no manual settings
 * save. See src/lib/boot-revalidate.ts for the full rationale and tag scope.
 *
 * This route is internal machinery, not a public API:
 *  - the caller must present the AUTH_SECRET-derived token in the
 *    `x-boot-revalidate-token` header (the raw secret is never sent);
 *  - ANY auth failure answers 404, indistinguishable from a route that
 *    does not exist, and revalidates nothing;
 *  - it is linked from nowhere — not in robots, sitemap, or any UI.
 *
 * Revalidation uses `{ expire: 0 }` (immediate expiry), NOT the "max"
 * stale-while-revalidate profile: convergence must hold for the very first
 * request after a deploy, not just eventually. The call is idempotent, so
 * the boot client's retries are harmless.
 */
export async function POST(request: Request) {
  const provided = request.headers.get(BOOT_REVALIDATE_HEADER);
  if (!isBootRevalidateTokenValid(provided, getEnv().AUTH_SECRET)) {
    return new Response(null, { status: 404 });
  }

  for (const tag of BOOT_REVALIDATE_TAGS) {
    revalidateTag(tag, { expire: 0 });
  }

  return Response.json({ ok: true, revalidated: [...BOOT_REVALIDATE_TAGS] });
}
