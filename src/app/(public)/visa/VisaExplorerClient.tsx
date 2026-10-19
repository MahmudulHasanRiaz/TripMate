"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  HelpCircle,
  Plane,
  Search,
} from "lucide-react";
import type { VisaServiceWithRefs, VisaType } from "@/modules/catalog/visa-service";
import type { Destination } from "@/modules/catalog/service";
import VisaInquiryModal from "./VisaInquiryModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VisaExplorerClient({
  services,
  destinations,
  visaTypes,
  brand,
}: {
  services: VisaServiceWithRefs[];
  destinations: Destination[];
  visaTypes: VisaType[];
  /** Site title — flows into the inquiry modal's trust line. */
  brand?: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedDestId, setSelectedDestId] = useState<string>("all");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");

  const [inquiryVisa, setInquiryVisa] = useState<VisaServiceWithRefs | null>(null);
  const [checklistVisa, setChecklistVisa] = useState<VisaServiceWithRefs | null>(null);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (selectedDestId !== "all" && s.destinationId !== selectedDestId) return false;
      if (selectedTypeId !== "all" && s.visaTypeId !== selectedTypeId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchCountry = s.destination.name.toLowerCase().includes(q);
        const matchType = s.visaType.name.toLowerCase().includes(q);
        if (!matchTitle && !matchCountry && !matchType) return false;
      }
      return true;
    });
  }, [services, selectedDestId, selectedTypeId, search]);

  return (
    <div className="space-y-10">
      {/* Search & Filter Controls */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-5">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visa by country or keyword (e.g. Dubai, Tourist, Student)..."
            className="pl-10 h-12 text-base rounded-xl border-muted-foreground/30 shadow-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {/* Destination Filter Pills */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by Destination Country:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedDestId("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedDestId === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              All Destinations ({services.length})
            </button>
            {destinations.map((d) => {
              const count = services.filter((s) => s.destinationId === d.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDestId(d.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    selectedDestId === d.id
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {d.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Visa Type Filter Pills */}
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visa Category:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTypeId("all")}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                selectedTypeId === "all"
                  ? "bg-secondary text-secondary-foreground font-semibold border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Categories
            </button>
            {visaTypes.map((vt) => (
              <button
                key={vt.id}
                type="button"
                onClick={() => setSelectedTypeId(vt.id)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                  selectedTypeId === vt.id
                    ? "bg-secondary text-secondary-foreground font-semibold border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {vt.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count & Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            Available Visa Programs ({filteredServices.length})
          </h2>
          {(selectedDestId !== "all" || selectedTypeId !== "all" || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDestId("all");
                setSelectedTypeId("all");
                setSearch("");
              }}
              className="text-xs text-primary underline underline-offset-4 hover:opacity-80"
            >
              Reset filters
            </button>
          )}
        </div>

        {filteredServices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <HelpCircle className="mx-auto size-10 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">No Visa Offerings Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We did not find any visa matching your current filter selections. Contact our concierge for customized visa processing for any destination worldwide.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((visa) => (
              <div
                key={visa.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Country badge and Category */}
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-semibold text-xs text-primary">
                      {visa.destination.name}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {visa.visaType.name}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {visa.title}
                    </h3>
                    {visa.description && (
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                        {visa.description}
                      </p>
                    )}
                  </div>

                  {/* Feature chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <span>{visa.processingTime || "Standard Time"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary shrink-0" />
                      <span>{visa.validity || "Standard Validity"}</span>
                    </div>
                    {visa.stayDuration && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Plane className="size-3.5 text-primary shrink-0" />
                        <span>Stay: {visa.stayDuration}</span>
                      </div>
                    )}
                  </div>

                  {/* Requirements preview */}
                  {visa.requirements.length > 0 && (
                    <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          Key Requirements:
                        </span>
                        <button
                          type="button"
                          onClick={() => setChecklistVisa(visa)}
                          className="text-[11px] text-primary hover:underline"
                        >
                          View all ({visa.requirements.length})
                        </button>
                      </div>
                      <ul className="space-y-1 text-muted-foreground">
                        {visa.requirements.slice(0, 2).map((req, idx) => (
                          <li key={idx} className="line-clamp-1">
                            • {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Footer: Price & CTA */}
                <div className="mt-6 pt-4 border-t border-border flex items-end justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Fee / Person
                    </div>
                    <div className="text-xl font-extrabold text-foreground">
                      ৳{visa.price.toLocaleString()}
                    </div>
                  </div>

                  <Button
                    onClick={() => setInquiryVisa(visa)}
                    className="rounded-xl px-4 text-xs font-semibold"
                  >
                    Apply Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Checklist Modal */}
      {checklistVisa && (
        <Dialog open={Boolean(checklistVisa)} onOpenChange={(v) => !v && setChecklistVisa(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <FileText className="size-4" />
                <span>Document Checklist</span>
              </div>
              <DialogTitle className="text-lg font-bold">{checklistVisa.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Prepare these required documents before applying for your {checklistVisa.destination.name} visa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
                {checklistVisa.requirements.map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{doc}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200">
                <strong>Pre-screening guarantee:</strong> Our visa documentation team reviews all your documents before embassy submission to prevent unnecessary rejections.
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChecklistVisa(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const v = checklistVisa;
                    setChecklistVisa(null);
                    setInquiryVisa(v);
                  }}
                  className="flex-1"
                >
                  Proceed to Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Visa Application Modal */}
      {inquiryVisa && (
        <VisaInquiryModal
          visa={inquiryVisa}
          brand={brand}
          open={Boolean(inquiryVisa)}
          onClose={() => setInquiryVisa(null)}
        />
      )}
    </div>
  );
}
