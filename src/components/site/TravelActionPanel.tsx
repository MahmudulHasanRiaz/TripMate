"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  FileCheck2,
  Headphones,
  MapPin,
  Moon,
  Palmtree,
  Plane,
  Search,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "./currency";

type ActionTab = "packages" | "umrah" | "visa" | "flights" | "hotels";

/** Slim serializable package shape for the panel sliders (Follow-up 12). */
export type PanelPackage = {
  slug: string;
  title: string;
  imageSrc: string;
  destinationName: string;
  durationDays?: number | null;
  rating?: number | null;
  price?: number | null;
  currency?: string;
};

/** Slim serializable visa-service shape for the panel slider (Follow-up 12). */
export type PanelVisaService = {
  id: string;
  title: string;
  price: number;
  processingTime?: string | null;
  validity?: string | null;
  destinationName: string;
  destinationImage?: string | null;
  visaTypeName: string;
};

export type TravelActionPanelProps = {
  destinations: { id: string; name: string; slug: string }[];
  categories?: { id: string; name: string; slug: string; kind: string }[];
  flightRedirectUrl?: string | null;
  flightSlug?: string;
  hotelRedirectUrl?: string | null;
  hotelSlug?: string;
  phone?: string | null;
  /** Hajj & Umrah tab (Follow-up 12): real published packages per category,
   *  shown as slider cards under separate Hajj / Umrah sub-chips. */
  hajjPackages?: PanelPackage[];
  hajjSlug?: string;
  umrahPackages?: PanelPackage[];
  umrahSlug?: string;
  /** Combined "hajj-umrah" category fallback when a site has no separate
   *  Hajj / Umrah categories — one slider, no sub-chips. */
  pilgrimPackages?: PanelPackage[];
  pilgrimSlug?: string;
  /** Visa tab (Follow-up 12): active visa services as slider cards. */
  visaServices?: PanelVisaService[];
};

export default function TravelActionPanel({
  destinations,
  categories,
  flightRedirectUrl,
  flightSlug = "flights",
  hotelRedirectUrl,
  hotelSlug = "hotels",
  phone,
  hajjPackages,
  hajjSlug,
  umrahPackages,
  umrahSlug,
  pilgrimPackages,
  pilgrimSlug,
  visaServices,
}: TravelActionPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActionTab>("packages");

  // Tour Package search state
  const [selectedDestination, setSelectedDestination] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");

  // Visa search state
  const [selectedVisaDest, setSelectedVisaDest] = useState("");

  const umrahCategory = categories?.find(
    (c) =>
      c.slug === "hajj-umrah" ||
      c.slug.includes("umrah") ||
      c.slug.includes("hajj") ||
      c.name.toLowerCase().includes("umrah")
  );
  // Slug used by the promo fallback's "view packages" link — the explicit
  // server-resolved slugs win when present (Follow-up 12).
  const promoSlug =
    umrahSlug ?? pilgrimSlug ?? hajjSlug ?? umrahCategory?.slug ?? "hajj-umrah";

  // Hajj & Umrah sub-tab (Follow-up 12): Hajj first when it has packages,
  // otherwise Umrah — a chip is only offered for a non-empty list.
  const hajjList = hajjPackages ?? [];
  const umrahList = umrahPackages ?? [];
  const pilgrimList = pilgrimPackages ?? [];
  const visaList = visaServices ?? [];
  const [pilgrimTab, setPilgrimTab] = useState<"hajj" | "umrah">(
    hajjList.length > 0 ? "hajj" : "umrah",
  );
  const activePilgrimList = pilgrimTab === "hajj" ? hajjList : umrahList;
  const activePilgrimSlug =
    pilgrimTab === "hajj" ? (hajjSlug ?? "hajj") : (umrahSlug ?? "umrah");

  const handleSearchPackages = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedDestination) params.set("dest", selectedDestination);
    router.push(`/packages?${params.toString()}` as Route);
  };

  const handleSearchVisa = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVisaDest) {
      router.push(`/visa?destination=${encodeURIComponent(selectedVisaDest)}` as Route);
    } else {
      router.push("/visa" as Route);
    }
  };

  // Country picker — shown alone when no visa services are published yet,
  // and under the services slider when they are (Follow-up 12).
  const visaCountryForm = (
    <form onSubmit={handleSearchVisa} className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
      <div className="sm:col-span-2 space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Country for Visa Processing
        </label>
        <select
          value={selectedVisaDest}
          onChange={(e) => setSelectedVisaDest(e.target.value)}
          className="h-12 w-full rounded-lg border border-input bg-background px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="">Choose Country (Dubai, Malaysia, Singapore, Saudi Arabia, etc.)...</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" className="h-12 rounded-lg text-sm font-bold gap-2">
        <FileCheck2 className="size-4" />
        Check Visa Requirements
      </Button>
    </form>
  );

  return (
    <div className="relative z-20 mx-auto -mt-10 sm:-mt-[72px] w-full max-w-[1280px] px-4 sm:px-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xl sm:p-6">
        {/* Tab Navigation — horizontal scroll with snap + right-edge fade
            affordance so the clipped "next tab" reads as swipeable on
            narrow phones instead of looking silently cut off. */}
        <div className="flex gap-1 overflow-x-auto border-b border-border/60 pb-2.5 sm:justify-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_0%,black_calc(100%_-_36px),transparent_100%)]">
          <button
            type="button"
            onClick={() => setActiveTab("packages")}
            className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "packages"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Palmtree className="size-4" />
            Tour Packages
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("umrah")}
            className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "umrah"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Moon className="size-4" />
            Hajj & Umrah
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("visa")}
            className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "visa"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <FileCheck2 className="size-4" />
            Visa Services
          </button>

          {/* Flights - External */}
          <button
            type="button"
            onClick={() => setActiveTab("flights")}
            className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "flights"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Plane className="size-4" />
            Flights
          </button>

          {/* Hotels - External */}
          <button
            type="button"
            onClick={() => setActiveTab("hotels")}
            className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "hotels"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Building2 className="size-4" />
            Hotels
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="pt-4 pb-2 px-1 sm:px-3">
          {/* TAB 1: Tour Packages */}
          {activeTab === "packages" && (
            <form onSubmit={handleSearchPackages} className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Where to?
                </label>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-background px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">All Destinations</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trip Duration
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="h-12 w-full rounded-lg border border-input bg-background px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Any Duration</option>
                  <option value="1-3">Short Getaway (1–3 Days)</option>
                  <option value="4-7">Holiday (4–7 Days)</option>
                  <option value="8-14">Extended (8–14 Days)</option>
                  <option value="15+">Long Journey (15+ Days)</option>
                </select>
              </div>

              <div className="space-y-1.5 hidden lg:block">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Traveler Type
                </label>
                <div className="flex h-12 items-center rounded-lg border border-input bg-muted/20 px-3.5 text-sm text-muted-foreground">
                  <Users className="mr-2 size-4 text-primary" />
                  <span>Solo, Couple, or Family</span>
                </div>
              </div>

              <Button type="submit" className="h-12 rounded-lg text-sm font-bold gap-2">
                <Search className="size-4" />
                Find Packages
              </Button>
            </form>
          )}

          {/* TAB 2: Hajj & Umrah — real packages as slider cards under
              separate Hajj / Umrah sub-chips (Follow-up 12). Resolution
              order: separate category lists → combined-category slider →
              the original promo block, so the tab is never blank. */}
          {activeTab === "umrah" && (
            hajjList.length > 0 || umrahList.length > 0 ? (
              <div className="space-y-3">
                {hajjList.length > 0 && umrahList.length > 0 && (
                  <div className="flex items-center gap-2" role="tablist" aria-label="Hajj or Umrah packages">
                    {(["hajj", "umrah"] as const).map((key) => {
                      const count = key === "hajj" ? hajjList.length : umrahList.length;
                      const isActive = pilgrimTab === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setPilgrimTab(key)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-150 ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "border border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <Moon className="size-3.5" />
                          <span>{key === "hajj" ? "Hajj" : "Umrah"}</span>
                          <span
                            className={`rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${
                              isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <CardSlider
                  viewAllHref={`/packages?cat=${encodeURIComponent(activePilgrimSlug)}`}
                  viewAllLabel={`View all ${pilgrimTab === "hajj" ? "Hajj" : "Umrah"} packages`}
                >
                  {activePilgrimList.map((pkg) => (
                    <PanelPackageCard key={pkg.slug} pkg={pkg} />
                  ))}
                </CardSlider>
              </div>
            ) : pilgrimList.length > 0 ? (
              <CardSlider
                viewAllHref={`/packages?cat=${encodeURIComponent(pilgrimSlug ?? "hajj-umrah")}`}
                viewAllLabel="View all Hajj & Umrah packages"
              >
                {pilgrimList.map((pkg) => (
                  <PanelPackageCard key={pkg.slug} pkg={pkg} />
                ))}
              </CardSlider>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Ministry of Hajj & Umrah Approved Packages
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    5-star luxury packages, economy group departures, and personalized private VIP arrangements.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button asChild variant="outline" className="rounded-lg h-11">
                    <a href={phone?.trim() ? `tel:${phone.trim()}` : "/services"}>
                      <Headphones className="mr-2 size-4" />
                      {phone?.trim() ? "Call Hajj Specialist" : "Contact Hajj Specialist"}
                    </a>
                  </Button>
                  <Button asChild className="rounded-lg h-11">
                    <Link href={`/packages?cat=${encodeURIComponent(promoSlug)}` as Route}>
                      View Umrah Packages
                    </Link>
                  </Button>
                </div>
              </div>
            )
          )}

          {/* TAB 3: Visa Services — real services as slider cards with the
              country picker kept underneath (Follow-up 12); the picker
              alone is the fallback when nothing is published yet. */}
          {activeTab === "visa" && (
            visaList.length > 0 ? (
              <div className="space-y-4">
                <CardSlider viewAllHref="/visa" viewAllLabel="View all visa services">
                  {visaList.map((service) => (
                    <PanelVisaCard key={service.id} service={service} />
                  ))}
                </CardSlider>
                <div className="border-t border-border/60 pt-4">{visaCountryForm}</div>
              </div>
            ) : (
              visaCountryForm
            )
          )}

          {/* TAB 4: Flights - External Redirect or Internal Service */}
          {activeTab === "flights" && (
            <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Plane className="size-4" />
                  <span>Real-Time Global Flight Search</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Compare 500+ Airlines or Book with Human Concierge
                </h4>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  For real-time seat availability and instant e-tickets, we route you to our flight search engine. For complex group bookings, UMRAH flights, or special corporate fares, contact our flight desk directly.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-lg h-10">
                  <a href={phone?.trim() ? `tel:${phone.trim()}` : "/services"}>
                    <Headphones className="mr-1.5 size-4" />
                    Offline Airline Desk
                  </a>
                </Button>
                {flightRedirectUrl?.trim() ? (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <a href={flightRedirectUrl.trim()} target="_blank" rel="noopener noreferrer">
                      <span>Search Global Flights</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <Link href={`/services/${flightSlug}` as Route}>
                      <span>Flight Desk Services</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Hotels - External Redirect or Internal Service */}
          {activeTab === "hotels" && (
            <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Building2 className="size-4" />
                  <span>Worldwide Hotel Accommodations</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Instant Room Reservations & Makkah/Madinah Clock Tower Suites
                </h4>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Browse millions of hotels worldwide via our verified accommodation search, or consult with our travel specialists for exclusive contracted group rates near holy sites and popular city centers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-lg h-10">
                  <a href={phone?.trim() ? `tel:${phone.trim()}` : "/services"}>
                    <Headphones className="mr-1.5 size-4" />
                    Concierge Hotel Desk
                  </a>
                </Button>
                {hotelRedirectUrl?.trim() ? (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <a href={hotelRedirectUrl.trim()} target="_blank" rel="noopener noreferrer">
                      <span>Search Worldwide Hotels</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <Link href={`/services/${hotelSlug}` as Route}>
                      <span>Hotel Desk Services</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Follow-up 12 — slider shell + compact cards for the Hajj & Umrah and    */
/* Visa tabs. Scroll-snap track (swipe on touch, arrow buttons on desktop) */
/* so any number of packages stays one tidy row.                           */

function CardSlider({
  children,
  viewAllHref,
  viewAllLabel,
}: {
  children: React.ReactNode;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll back"
          className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Scroll forward"
          className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
        <Link
          href={viewAllHref as Route}
          className="flex w-[128px] shrink-0 snap-start flex-col items-center justify-center gap-2 self-stretch rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 text-center text-primary transition-colors duration-150 hover:bg-primary/10"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
            <ArrowRight className="size-4" />
          </span>
          <span className="text-xs font-bold leading-snug">{viewAllLabel}</span>
        </Link>
      </div>
    </div>
  );
}

const PANEL_CARD_SHELL =
  "group flex w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg sm:w-[268px]";

function PanelPackageCard({ pkg }: { pkg: PanelPackage }) {
  return (
    <Link href={`/packages/${pkg.slug}` as Route} className={PANEL_CARD_SHELL}>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {pkg.imageSrc ? (
          <Image
            src={pkg.imageSrc}
            alt={pkg.title}
            fill
            sizes="268px"
            referrerPolicy="no-referrer"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Compass className="size-8 opacity-30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-2.5 pt-7">
          <span className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-white">
            <MapPin className="size-3 shrink-0 text-accent" />
            <span className="truncate">{pkg.destinationName}</span>
          </span>
          {typeof pkg.durationDays === "number" && pkg.durationDays > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-white/90">
              <Clock className="size-3 text-accent" />
              {pkg.durationDays} {pkg.durationDays === 1 ? "Day" : "Days"}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h5 className="font-display text-sm font-bold leading-snug text-foreground line-clamp-2">
          {pkg.title}
        </h5>
        {typeof pkg.rating === "number" && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="font-bold tabular-nums text-foreground">{pkg.rating.toFixed(1)}</span>
            Rating
          </span>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
          <span className="flex items-baseline gap-1 pt-1">
            <span className="font-display text-base font-bold tabular-nums text-foreground">
              {typeof pkg.price === "number" && pkg.price > 0
                ? formatMoney(pkg.price, pkg.currency ?? "BDT")
                : "Upon request"}
            </span>
            {typeof pkg.price === "number" && pkg.price > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground">/ person</span>
            )}
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PanelVisaCard({ service }: { service: PanelVisaService }) {
  return (
    <Link
      href={`/visa?destination=${encodeURIComponent(service.destinationName)}` as Route}
      className={PANEL_CARD_SHELL}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {service.destinationImage ? (
          <Image
            src={service.destinationImage}
            alt={service.destinationName}
            fill
            sizes="268px"
            referrerPolicy="no-referrer"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <FileCheck2 className="size-8 opacity-30" />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
          <FileCheck2 className="size-3 text-accent" />
          {service.visaTypeName}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h5 className="font-display text-sm font-bold leading-snug text-foreground">
          {service.destinationName}
        </h5>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{service.title}</p>
        <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          {service.processingTime && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3 shrink-0 text-primary" />
              Processing: {service.processingTime}
            </span>
          )}
          {service.validity && (
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="size-3 shrink-0 text-primary" />
              Validity: {service.validity}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
          <span className="flex items-baseline gap-1 pt-1">
            <span className="font-display text-base font-bold tabular-nums text-foreground">
              ৳{service.price.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">/ visa</span>
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
