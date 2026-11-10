"use client";

import { useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { formatMoney } from "@/components/site/currency";
import type { VisaServiceWithRefs } from "@/modules/catalog/visa-service";
import VisaInquiryModal from "@/app/(public)/visa/VisaInquiryModal";

/**
 * One visa service on a destination page, with its Apply CTA opening the
 * inquiry form IN PLACE (owner, 2026-11-10): the CTA used to link away
 * to /visa?destination=…, forcing the visitor to find the same service
 * again on the archive page and click a second time before any form
 * appeared. A card's action must do what it says — Apply opens the form
 * for THIS service, here. (Viewing the service still happens on /visa;
 * this card's button is the action, not the view.)
 */
export default function DestinationVisaCard({
  visa,
  brand,
}: {
  visa: VisaServiceWithRefs;
  /** Site title for the inquiry modal's trust line. */
  brand?: string;
}) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
            {visa.visaType.name}
          </span>
          {visa.processingTime ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3 text-primary" aria-hidden="true" />
              <span>{visa.processingTime}</span>
            </div>
          ) : null}
        </div>

        <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-foreground">
          {visa.title}
        </h3>

        <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            All-in Processing Fee
          </span>
          <p className="font-mono text-xl font-bold tracking-tight text-foreground mt-0.5">
            {formatMoney(visa.price, "BDT")}
          </p>
        </div>

        {visa.requirements.length > 0 ? (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Essential Requirements</p>
            <ul className="space-y-1">
              {visa.requirements.slice(0, 3).map((req, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3 text-success shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="line-clamp-1">{req}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Apply for {visa.visaType.name}
        </button>
      </div>

      <VisaInquiryModal
        visa={formOpen ? visa : null}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        brand={brand}
      />
    </div>
  );
}
