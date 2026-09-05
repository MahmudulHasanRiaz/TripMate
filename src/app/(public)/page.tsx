import { cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * Placeholder home — proves the Cache Components pipeline end-to-end.
 *
 * `'use cache'` (component scope) opts this page's output into the Next 16
 * cache: the build prerenders it into the static shell and `cacheTag` binds
 * it to the `settings` tag so an admin settings mutation followed by
 * `revalidateTag(CACHE_TAGS.settings, ...)` refreshes it. Task 10 replaces
 * this with the real marketing home (same tagging pattern).
 *
 * No <main> here: the (public) layout already owns the `<main id="main">`
 * content landmark around this page.
 */
export default async function Home() {
  "use cache";
  cacheTag(CACHE_TAGS.settings);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        TripMate v2 — Foundation
      </h1>
    </div>
  );
}
