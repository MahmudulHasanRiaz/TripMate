import { Quote } from "lucide-react";
import type { TestimonialsConfig } from "@/modules/landing-pages/section-types";
import { SectionHeading } from "@/components/site/SectionHeading";

type TestimonialsSectionProps = {
  config: TestimonialsConfig;
};

export function TestimonialsSection({ config }: TestimonialsSectionProps) {
  const items = config.items || [];
  if (items.length === 0) return null;

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Guest Experiences"
          title="Loved by travelers across the world"
          align="center"
          className="mb-12 sm:mb-16"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 ease-out-quint hover:-translate-y-0.5 hover:shadow-lg sm:p-8"
            >
              <div>
                <Quote className="size-8 text-primary/25" aria-hidden="true" />
                <p className="mt-4 font-display text-base italic leading-relaxed text-foreground sm:text-lg">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <p className="font-semibold text-foreground">{item.name}</p>
                {item.trip ? (
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {item.trip}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
