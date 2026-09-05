import { ViewTransition } from "react";

/**
 * A `template` re-mounts on every navigation (unlike a layout), so this is the
 * App Router's documented home for route-level view transitions. The public
 * chrome in layout.tsx sits OUTSIDE the shared `name="page"` pair, so a
 * navigation crossfades the swapped page content while the header/footer stay
 * live and un-flashed (spec §2.4, next/dist/docs view-transitions guide).
 *
 * Without browser support the transition simply does not animate.
 */
export default function PublicTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ViewTransition name="page">{children}</ViewTransition>;
}
