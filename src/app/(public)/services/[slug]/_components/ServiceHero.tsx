import type { ServiceKind } from "@/modules/catalog/validation";
import { ServiceIcon } from "@/components/site/ServiceIcon";

/** Human-facing label + one-line promise for a category kind (page-local
 *  mirror of the admin kind-labels map — public routes never import from the
 *  /admin tree). Categories carry no editable description column, so this is
 *  the closest thing to intro copy until Plan 4 adds category bodies. */
const KIND_COPY: Record<ServiceKind, { label: string; promise: string }> = {
  package: {
    label: "Packages",
    promise:
      "Fixed itineraries with transparent, published pricing — pick one and we handle the rest.",
  },
  inquiry_based: {
    label: "Inquiry-based",
    promise:
      "No fixed menu — tell us your plan and we'll craft a personalised quote, priced on request.",
  },
  redirect: {
    label: "Partner service",
    promise:
      "This service is delivered by a trusted partner — book it directly on their site.",
  },
};

type ServiceHeroProps = {
  name: string;
  kind: ServiceKind;
  icon: string | null;
};

/**
 * Category landing hero for /services/{slug}.
 *
 * service_categories have no imageUrl column, so the hero draws a branded
 * gradient backdrop (the neutral fallback scene HeroSection uses) with the
 * category's lucide icon in a primary disc — never a stock photo. Layout keeps
 * the single h1 the page owns (the category name) with a kind label above it.
 */
export function ServiceHero({ name, kind, icon }: ServiceHeroProps) {
  const copy = KIND_COPY[kind];
  return (
    <section className="relative isolate overflow-hidden bg-slate-950">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        <div className="absolute -right-24 -top-24 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col px-4 py-20 sm:py-24 lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
              <ServiceIcon name={icon} className="size-7" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              {copy.label}
            </p>
          </div>
          <h1 className="text-balance font-display text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-white">
            {name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
            {copy.promise}
          </p>
        </div>
      </div>
    </section>
  );
}
