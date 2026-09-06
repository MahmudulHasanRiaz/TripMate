import {
  Award,
  Calendar,
  Check,
  Clock,
  Compass,
  Heart,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { BenefitsConfig } from "@/modules/landing-pages/section-types";
import { SectionHeading } from "@/components/site/SectionHeading";

type BenefitsSectionProps = {
  config: BenefitsConfig;
};

const BENEFIT_ICONS: Record<string, LucideIcon> = {
  shield: ShieldCheck,
  star: Star,
  clock: Clock,
  "map-pin": MapPin,
  location: MapPin,
  heart: Heart,
  compass: Compass,
  users: Users,
  calendar: Calendar,
  plane: Plane,
  award: Award,
  sparkles: Sparkles,
  check: Check,
};

function resolveIcon(iconName?: string): LucideIcon {
  if (!iconName) return Check;
  const normalized = iconName.toLowerCase().trim();
  return BENEFIT_ICONS[normalized] ?? Check;
}

export function BenefitsSection({ config }: BenefitsSectionProps) {
  const items = config.items || [];
  if (items.length === 0) return null;

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Why TripMate"
          title="Designed for an exceptional journey"
          align="center"
          className="mb-12 sm:mb-16"
        />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = resolveIcon(item.icon);
            return (
              <div
                key={index}
                className="group relative flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 ease-out-quint hover:-translate-y-0.5 hover:shadow-lg sm:p-8"
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300 ease-out-quint group-hover:scale-105">
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
