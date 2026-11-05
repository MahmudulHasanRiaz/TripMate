/**
 * The ONE photo set of a listing detail page (FU-28, completed FU-32).
 *
 * A listing's cover image may ALSO be one of its gallery images (the
 * admin sets a cover from the same uploads). Every surface on the page —
 * the hero's "N photos" pill, the Gallery section heading, the mosaic
 * and the lightbox counter — must count and show THIS set: the cover
 * first, then the gallery, de-duplicated by URL. Counting
 * `gallery.length + 1` for the pill double-counts a cover that is
 * already in the gallery ("3 photos" up top, 2 in the lightbox — the
 * exact contradiction QA caught on the Dubai package).
 *
 * Pure leaf module (no server/client directives) so the hero, the
 * content sections and the tests all share the same definition.
 */
export type ListingPhoto = { url: string; alt: string };

export function listingPhotos(
  cover: ListingPhoto | null | undefined,
  gallery: readonly ListingPhoto[],
): ListingPhoto[] {
  if (cover?.url && !gallery.some((image) => image.url === cover.url)) {
    return [cover, ...gallery];
  }
  return [...gallery];
}
