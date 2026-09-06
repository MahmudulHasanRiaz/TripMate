import { MessageCircle } from "lucide-react";
import type { WhatsappCtaConfig } from "@/modules/landing-pages/section-types";
import { Button } from "@/components/ui/button";

type WhatsappCtaProps = {
  config: WhatsappCtaConfig;
  variant?: "overlay" | "inline";
  buttonVariant?: "default" | "outline" | "secondary";
};

export function WhatsappCtaSection({
  config,
  variant = "inline",
  buttonVariant = "default",
}: WhatsappCtaProps) {
  const cleanPhone = config.phone.replace(/[^\d]/g, "");
  const query = config.prefill ? `?text=${encodeURIComponent(config.prefill)}` : "";
  const waUrl = `https://wa.me/${cleanPhone}${query}`;

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
          variant={buttonVariant}
          size="sm"
          className="h-11 min-h-[44px] min-w-[44px] shrink-0 rounded-lg px-4 text-sm font-semibold shadow-xs"
        >
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 size-4" aria-hidden="true" />
            WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground">
            {config.text}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Fastest response for itinerary inquiries: {config.phone}
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="h-11 rounded-lg px-6 font-semibold shadow-sm"
        >
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 size-5" aria-hidden="true" />
            Chat on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
