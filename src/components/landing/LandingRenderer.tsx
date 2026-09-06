import type { FormConfig, LandingSection } from "@/modules/landing-pages/section-types";
import type { ResolvedLandingSection } from "@/modules/landing-pages/service";
import { HeroSection } from "./sections/HeroSection";
import { BenefitsSection } from "./sections/BenefitsSection";
import { PackageShowcaseGrid } from "./sections/PackageShowcaseGrid";
import { GallerySection } from "./sections/GallerySection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { FaqSection } from "./sections/FaqSection";
import { CountdownSection } from "./sections/CountdownSection";
import { StickyCtaSection } from "./sections/StickyCtaSection";
import { WhatsappCtaSection } from "./sections/WhatsappCtaSection";
import { ThankYouSection } from "./sections/ThankYouSection";
import { LeadForm } from "./LeadForm";
import { cn } from "@/lib/utils";

type LandingRendererProps = {
  sections: (LandingSection | ResolvedLandingSection)[];
  formConfig?: FormConfig | null;
  landingSlug?: string;
  mode?: "public" | "preview";
  className?: string;
};

/**
 * Shared Landing Page Renderer.
 * SINGLE source of truth for both public /l/[slug] pages and the admin builder preview.
 * Divergence is strictly forbidden.
 */
export function LandingRenderer({
  sections,
  formConfig,
  landingSlug = "",
  mode = "public",
  className,
}: LandingRendererProps) {
  // 1. Separate in-flow sections from overlay sections (stickyCta + whatsappCta)
  const inFlowSections: (LandingSection | ResolvedLandingSection)[] = [];
  const overlaySections: (LandingSection | ResolvedLandingSection)[] = [];

  for (const s of sections) {
    if (s.type === "stickyCta" || s.type === "whatsappCta") {
      overlaySections.push(s);
    } else {
      inFlowSections.push(s);
    }
  }

  // 2. Track form section deduplication: render at most ONE LeadForm across the page
  let formHasRendered = false;

  return (
    <div className={cn("relative flex min-h-screen flex-col bg-background", className)}>
      {/* In-flow content with alternating background rhythm */}
      <main className="flex-1">
        {inFlowSections.map((section, index) => {
          const isEven = index % 2 === 0;
          const bgClass = isEven ? "bg-background" : "bg-secondary/40";

          switch (section.type) {
            case "hero":
              return (
                <div key={index} className={bgClass}>
                  <HeroSection config={section.config} />
                </div>
              );

            case "benefits":
              return (
                <div key={index} className={bgClass}>
                  <BenefitsSection config={section.config} />
                </div>
              );

            case "packageShowcase":
              return (
                <div key={index} className={bgClass}>
                  <PackageShowcaseGrid config={section.config} />
                </div>
              );

            case "gallery":
              return (
                <div key={index} className={bgClass}>
                  <GallerySection config={section.config} />
                </div>
              );

            case "testimonials":
              return (
                <div key={index} className={bgClass}>
                  <TestimonialsSection config={section.config} />
                </div>
              );

            case "faq":
              return (
                <div key={index} className={bgClass}>
                  <FaqSection config={section.config} />
                </div>
              );

            case "countdown":
              return (
                <div key={index} className={bgClass}>
                  <CountdownSection config={section.config} />
                </div>
              );

            case "form": {
              if (formHasRendered) return null;
              formHasRendered = true;
              return (
                <div key={index} className={bgClass}>
                  <LeadForm
                    formConfig={formConfig ?? null}
                    landingSlug={landingSlug}
                    previewMode={mode === "preview"}
                  />
                </div>
              );
            }

            case "thankYou":
              return (
                <div key={index} className={bgClass}>
                  <ThankYouSection config={section.config} />
                </div>
              );

            default:
              return null;
          }
        })}
      </main>

      {/* Overlay Slot (Sticky CTA / WhatsApp CTA) */}
      {overlaySections.length > 0 ? (
        mode === "public" ? (
          <aside
            aria-label="Quick contact actions"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center justify-end gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end"
          >
            {overlaySections.map((section, idx) => (
              <div key={idx} className="pointer-events-auto w-full sm:w-auto">
                {section.type === "stickyCta" ? (
                  <StickyCtaSection config={section.config} variant="overlay" />
                ) : section.type === "whatsappCta" ? (
                  <WhatsappCtaSection config={section.config} variant="overlay" />
                ) : null}
              </div>
            ))}
          </aside>
        ) : (
          /* Preview Mode: Sticky to bottom inside preview container */
          <div className="sticky bottom-0 inset-x-0 z-20 flex flex-col items-center justify-end gap-2 border-t border-border/60 bg-background/95 p-3 backdrop-blur-xs sm:flex-row sm:justify-end">
            {overlaySections.map((section, idx) => (
              <div key={idx} className="w-full sm:w-auto">
                {section.type === "stickyCta" ? (
                  <StickyCtaSection config={section.config} variant="overlay" />
                ) : section.type === "whatsappCta" ? (
                  <WhatsappCtaSection config={section.config} variant="overlay" />
                ) : null}
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
