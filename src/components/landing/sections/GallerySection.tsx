import type { GalleryConfig } from "@/modules/landing-pages/section-types";
import { Gallery } from "@/components/site/Gallery";
import { SectionHeading } from "@/components/site/SectionHeading";

type GallerySectionProps = {
  config: GalleryConfig;
  /** Site title for the fallback image alt ("{brand} journey highlight"). */
  brand?: string;
};

export function GallerySection({ config, brand }: GallerySectionProps) {
  const rawImages = config.images || [];
  if (rawImages.length === 0) return null;

  const altFallback = `${brand?.trim() || "Our"} journey highlight`;
  const images = rawImages.map((img) => ({
    src: img.url,
    alt: img.alt || altFallback,
  }));

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Visual Journey"
          title="Moments captured along the way"
          align="center"
          className="mb-12 sm:mb-16"
        />

        <Gallery images={images} />
      </div>
    </section>
  );
}
