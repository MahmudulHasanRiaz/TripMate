import Image from "next/image";
import { Quote, Star, Video, Image as ImageIcon } from "lucide-react";
import type { TestimonialsConfig } from "@/modules/landing-pages/section-types";
import { SectionHeading } from "@/components/site/SectionHeading";
import { cn } from "@/lib/utils";

export type TestimonialCardItem = {
  id?: string;
  name: string;
  trip?: string | null;
  tripLabel?: string | null;
  quote: string;
  rating?: number;
  photoUrl?: string | null;
  videoUrl?: string | null;
  galleryUrls?: string[] | null | unknown;
  packageName?: string | null;
};

type TestimonialsSectionProps = {
  config?: TestimonialsConfig | { items?: TestimonialCardItem[] };
  items?: TestimonialCardItem[];
};

export function TestimonialsSection({ config, items: directItems }: TestimonialsSectionProps) {
  const items: TestimonialCardItem[] = (directItems || (config?.items as TestimonialCardItem[]) || []);
  if (items.length === 0) return null;

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Guest Experiences"
          title="Loved by travelers across the world"
          lead="Real stories from pilgrims and travelers who journeyed with us."
          align="center"
          className="mb-12 sm:mb-16"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const tripText = item.tripLabel || item.trip || item.packageName;
            const rating = typeof item.rating === "number" && item.rating >= 1 && item.rating <= 5 ? item.rating : 5;
            const galleryCount = Array.isArray(item.galleryUrls) ? item.galleryUrls.length : 0;

            return (
              <div
                key={item.id || index}
                className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md sm:p-8"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Quote className="size-7 text-primary/30" aria-hidden="true" />
                    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "size-3.5",
                            star <= rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/25",
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="mt-4 font-sans text-sm italic leading-relaxed text-foreground/90 sm:text-base">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center font-medium text-xs text-muted-foreground">
                      {item.photoUrl ? (
                        <Image
                          src={item.photoUrl}
                          alt={item.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <span>
                          {item.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{item.name}</p>
                      {tripText ? (
                        <p className="text-xs text-muted-foreground">
                          {tripText}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.videoUrl && (
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-600 transition-colors"
                        title="Watch video review"
                      >
                        <Video className="size-3.5" />
                        <span className="sr-only sm:not-sr-only">Video</span>
                      </a>
                    )}
                    {galleryCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-500">
                        <ImageIcon className="size-3" /> {galleryCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
