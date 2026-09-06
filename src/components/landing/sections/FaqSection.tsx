import type { FaqConfig } from "@/modules/landing-pages/section-types";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { SectionHeading } from "@/components/site/SectionHeading";

type FaqSectionProps = {
  config: FaqConfig;
};

export function FaqSection({ config }: FaqSectionProps) {
  const items = config.items || [];
  if (items.length === 0) return null;

  const faqItems = items.map((item) => ({
    question: item.q,
    answer: item.a,
  }));

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Questions & Answers"
          title="Frequently asked questions"
          align="center"
          className="mb-10 sm:mb-14"
        />

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <FaqAccordion items={faqItems} />
        </div>
      </div>
    </section>
  );
}
