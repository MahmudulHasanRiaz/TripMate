import Image from "next/image";

export type HeroSectionProps = {
  headline?: string;
  sub?: string;
  imageSrc?: string | null;
  imageAlt?: string;
};

/**
 * Hero — ShareTrip-pattern (Follow-up 09 §1): a vivid full-bleed photo with
 * a gradient that deepens toward the bottom, strikingly little copy (one
 * headline + one subtext line, white, left-aligned to the same content
 * column as the booking panel), and the TravelActionPanel card straddling
 * the hero's bottom edge — its tab row sits on the photo's dark base, the
 * rest hangs below on the page background. The panel is the call to
 * action, so the hero itself carries no CTA button and no eyebrow pill.
 *
 * With no image configured, the same layout renders over a deep
 * theme-token gradient — never a broken band. The hero is image-led in
 * both themes, so the copy is white in light and dark mode alike.
 */
export function HeroSection({
  headline = "Travel better. We'll handle the rest.",
  sub = "Spiritual pilgrimages, family holidays, and corporate travel — planned with precision, transparency, and 24/7 human care.",
  imageSrc,
  imageAlt = "Travel landscape",
}: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden -mt-20 sm:-mt-24 pt-36 sm:pt-44 lg:pt-48 pb-28 sm:pb-36 lg:pb-40">
      {/* Background: vivid photograph, darkened only toward the base so
          the white copy and the straddling panel's top stay legible. */}
      {imageSrc ? (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            referrerPolicy="no-referrer"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80" />
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 bg-primary">
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/75" />
        </div>
      )}

      {/* Copy: headline + one subtext line, aligned with the panel card. */}
      <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <h1 className="max-w-3xl text-balance font-display text-[28px] font-bold leading-[1.15] tracking-tight text-white sm:text-[40px] sm:leading-[1.12]">
          {headline}
        </h1>
        {sub ? (
          <p className="mt-3 max-w-2xl text-balance text-sm font-medium leading-relaxed text-white/90 sm:mt-4 sm:text-[17px]">
            {sub}
          </p>
        ) : null}
      </div>
    </section>
  );
}
