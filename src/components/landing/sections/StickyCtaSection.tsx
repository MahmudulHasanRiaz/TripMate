import { PhoneCall } from "lucide-react";
import type { StickyCtaConfig } from "@/modules/landing-pages/section-types";
import { Button } from "@/components/ui/button";

type StickyCtaProps = {
  config: StickyCtaConfig;
  variant?: "overlay" | "inline";
};

export function StickyCtaSection({ config, variant = "inline" }: StickyCtaProps) {
  const cleanPhone = config.phone.replace(/[^\d+]/g, "");

  if (variant === "overlay") {
    return (
      <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md sm:w-auto sm:min-w-[340px]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {config.text}
          </p>
          <p className="text-xs text-muted-foreground">{config.phone}</p>
        </div>
        <Button
          asChild
          size="sm"
          className="h-11 shrink-0 rounded-lg px-4 text-sm font-semibold shadow-xs"
        >
          <a href={`tel:${cleanPhone}`}>
            <PhoneCall className="mr-2 size-4" aria-hidden="true" />
            Call now
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground sm:text-base">
          {config.text}
        </p>
        <Button asChild size="default" className="h-11 px-5 font-semibold">
          <a href={`tel:${cleanPhone}`}>
            <PhoneCall className="mr-2 size-4" aria-hidden="true" />
            {config.phone}
          </a>
        </Button>
      </div>
    </div>
  );
}
