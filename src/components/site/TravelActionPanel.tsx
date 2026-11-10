"use client";

import { useRef, useState, type ComponentType } from "react";
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
  GraduationCap,
  Headphones,
  HeartPulse,
  IdCard,
  LayoutGrid,
  MapPin,
  Moon,
  Palmtree,
  Plane,
  Search,
  Smartphone,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usableRedirectUrl } from "@/lib/redirect-url";
import { formatMoney, telLink } from "./currency";

type ActionTab = "flights" | "umrah" | "visa" | "packages" | "hotels" | "medical" | "passport" | "student" | "esim";

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
  /** Serial-order keys (Follow-up 14) mirroring the SQL ordering of
   * listPublishedListings, so the merged Hajj + Umrah "All" view keeps the
   * exact order the packages index would show. */
  featured?: boolean;
  createdAt?: string;
};

/** A service option (plan) shown as a panel card — the Passport tab's
 *  cards mirror the orderable plans of /services/<category> so the tab
 *  and the service page are one system (owner, 2026-11-10). */
export type PanelPassportOption = {
  id: string;
  title: string;
  slug: string;
  duration?: string | null;
  price: number;
  deliveryTime?: string | null;
};

/** Kaaba glyph for the Hajj & Umrah tab — the exact glyph ShareTrip ships
 *  (element supplied by the owner, 2026-11-10): a SOLID cube whose facet,
 *  band and door lines are knocked out of the fill via evenodd, not a
 *  stroke drawing. fill is currentColor: muted in the inactive tab, the
 *  theme brand colour when active — the colour states are ours, the
 *  geometry is theirs verbatim. */
function KaabaIcon({ className }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.70407 2.739C11.1911 2.22248 12.8088 2.22225 14.296 2.73835L20.1293 4.76274C21.1352 5.11184 21.8097 6.05978 21.8097 7.12456V16.5199C21.8097 17.7976 21.0003 18.9351 19.7932 19.3541L14.295 21.2621C12.8085 21.778 11.1916 21.778 9.70505 21.2621L4.20686 19.3541C2.99974 18.9351 2.19043 17.7976 2.19043 16.5199V7.12706C2.19043 6.06254 2.86453 5.11477 3.87011 4.76548L9.70407 2.739ZM15.4049 18.76V15.1151C15.4049 14.5628 15.8526 14.1151 16.4049 14.1151C16.9571 14.1151 17.4049 14.5628 17.4049 15.1151V18.0659L19.1375 17.4646C19.5399 17.325 19.8097 16.9458 19.8097 16.5199V10.6352L13 12.9995V19.548C13.2158 19.504 13.4294 19.4455 13.6393 19.3727L15.4049 18.76ZM11 19.548V12.9996L4.19043 10.6364V16.5199C4.19043 16.9458 4.4602 17.325 4.86257 17.4646L10.3608 19.3727C10.5707 19.4455 10.7843 19.504 11 19.548ZM4.19043 8.51938L11 10.8826V9.59689L4.19043 7.19475V8.51938ZM6.61499 5.92924L12.0156 7.83433L17.6681 6.02563L13.6402 4.6278C12.578 4.25916 11.4225 4.25932 10.3603 4.62827L6.61499 5.92924ZM19.8097 7.44026L13 9.61921V10.8824L19.8097 8.51807V7.44026Z"
      />
    </svg>
  );
}

/** Passport-booklet glyph for the Visa tab — ShareTrip's Visa tab carries a
 *  passport booklet (portrait booklet, circular emblem, two lines), which
 *  lucide does not ship; drawn here in the same outline style. */
function PassportBookletIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3.5h11V20.5H7.5A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M6 17.5h12" />
      <circle cx="12" cy="10" r="2.3" />
      <path d="M9.8 14.6h4.4" />
    </svg>
  );
}

/** The hero panel's tab serial — owner's order, corrected 2026-11-10:
 *  Flights, Hajj & Umrah, Visa, Tour Packages, Hotels, Medical, Passport,
 *  Student Visa, eSIM. Icon types follow ShareTrip's tab bar (verified
 *  2026-11-10): ~24px outline glyphs — plane, Kaaba, visa stamp, palm,
 *  building, heart-pulse, ID card, graduation cap, phone. */
const TABS: { id: ActionTab; label: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: "flights", label: "Flights", Icon: Plane },
  { id: "umrah", label: "Hajj & Umrah", Icon: KaabaIcon },
  { id: "visa", label: "Visa", Icon: PassportBookletIcon },
  { id: "packages", label: "Tour Packages", Icon: Palmtree },
  { id: "hotels", label: "Hotels", Icon: Building2 },
  { id: "medical", label: "Medical", Icon: HeartPulse },
  { id: "passport", label: "Passport", Icon: IdCard },
  { id: "student", label: "Student Visa", Icon: GraduationCap },
  { id: "esim", label: "eSIM", Icon: Smartphone },
];

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
  visaTypeSlug: string;
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
  /** Medical tab: published listings of the medical-travel category, as
   *  slider cards exactly like the Hajj & Umrah tab (owner spec 2026-11-10). */
  medicalPackages?: PanelPackage[];
  medicalSlug?: string;
  /** Passport tab: published listings of the passport category, as slider
   *  cards exactly like the Hajj & Umrah tab (owner spec 2026-11-10). */
  passportPackages?: PanelPackage[];
  /** The passport category's service options (the orderable e-passport
   *  plans from /services/passport). When present, the Passport tab leads
   *  with these — the same plans, prices and order flow as the service
   *  page — instead of package-style listings (owner, 2026-11-10). */
  passportOptions?: PanelPassportOption[];
  passportSlug?: string;
  /** eSIM tab: a pure redirect tab like Flights/Hotels — the URL lives on
   *  the "esim" category (Admin → Categories), never in code. */
  esimRedirectUrl?: string | null;
  esimSlug?: string;
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
  medicalPackages,
  medicalSlug,
  passportPackages,
  passportOptions,
  passportSlug,
  esimRedirectUrl,
  esimSlug,
}: TravelActionPanelProps) {
  // FU-28 placeholder firewall: seed/placeholder redirect hosts
  // (.example etc.) count as NOT configured — the tabs then offer the
  // internal service pages instead of a dead external domain.
  const flightUrl = usableRedirectUrl(flightRedirectUrl);
  const hotelUrl = usableRedirectUrl(hotelRedirectUrl);
  const esimUrl = usableRedirectUrl(esimRedirectUrl);
  const medicalList = medicalPackages ?? [];
  const passportList = passportPackages ?? [];
  const passportOptionList = passportOptions ?? [];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActionTab>("flights");

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

  // Hajj & Umrah sub-tab (Follow-up 12; "All" default added in Follow-up 14
  // at the owner's request): the tab opens on "All" — Hajj and Umrah
  // packages together in the site's serial order — and the Hajj / Umrah
  // chips narrow to a single kind. A chip is only offered for a non-empty
  // list; with only one kind published the merged list is that kind.
  const hajjList = hajjPackages ?? [];
  const umrahList = umrahPackages ?? [];
  const pilgrimList = pilgrimPackages ?? [];
  const visaList = visaServices ?? [];
  // Student Visa tab: the catalogue's own Student Visa type, surfaced on
  // its own tab (owner, 2026-11-10) — filtered by the type's stable slug.
  const studentVisaList = visaList.filter((v) => v.visaTypeSlug === "student-visa");
  const allPilgrimList = [...hajjList, ...umrahList].sort((a, b) => {
    if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
    const byDate = (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    return byDate !== 0 ? byDate : a.slug.localeCompare(b.slug);
  });
  const [pilgrimTab, setPilgrimTab] = useState<"all" | "hajj" | "umrah">("all");
  const activePilgrimList =
    pilgrimTab === "hajj"
      ? hajjList
      : pilgrimTab === "umrah"
        ? umrahList
        : allPilgrimList;
  const activePilgrimSlug =
    pilgrimTab === "hajj"
      ? (hajjSlug ?? "hajj")
      : pilgrimTab === "umrah"
        ? (umrahSlug ?? "umrah")
        : [hajjSlug, umrahSlug].filter(Boolean).join(",");
  const activePilgrimLabel =
    pilgrimTab === "hajj"
      ? "Hajj"
      : pilgrimTab === "umrah"
        ? "Umrah"
        : "Hajj & Umrah";

  const handleSearchPackages = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedDestination) params.set("dest", selectedDestination);
    // The duration bucket is a real /packages filter (FU-32) — it used to
    // be collected here and silently dropped before the URL was built.
    if (selectedDuration) params.set("duration", selectedDuration);
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
        <label htmlFor="panel-visa-country" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Country for Visa Processing
        </label>
        <Select
          value={selectedVisaDest === "" ? "__empty" : selectedVisaDest}
          onValueChange={(v) => setSelectedVisaDest(v === "__empty" ? "" : v)}
        >
          <SelectTrigger id="panel-visa-country" type="button" aria-label="Select country for visa processing" className="h-12 w-full rounded-lg px-3.5 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72 rounded-lg">
            <SelectItem value="__empty">Choose Country (Dubai, Malaysia, Singapore, Saudi Arabia, etc.)...</SelectItem>
            {destinations.map((d) => (
              <SelectItem key={d.id} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="h-12 rounded-lg text-sm font-bold gap-2">
        <FileCheck2 className="size-4" />
        Check Visa Requirements
      </Button>
    </form>
  );

  return (
    <div className="relative z-20 mx-auto -mt-10 w-full max-w-[1280px] px-4 sm:-mt-[72px] sm:px-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xl sm:p-6">
        {/* Tab Navigation — ShareTrip-style flat strip (owner, 2026-11-10):
            ~24px outline glyphs; on small screens the icon stacks above the
            label, from sm up they sit side by side; the active tab takes the
            theme brand colour on the icon, a bold label and a 3px brand
            underline — no pill background. Horizontal scroll + right-edge
            fade so a clipped tab reads as swipeable on narrow phones. */}
        <div className="flex gap-1 overflow-x-auto overscroll-x-contain border-b border-border/60 sm:justify-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_0%,black_calc(100%_-_36px),transparent_100%)]">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-pressed={isActive}
                className={`relative flex flex-col items-center gap-1 whitespace-nowrap px-2.5 pt-2 pb-2.5 text-xs transition-colors sm:flex-row sm:gap-2 sm:px-3.5 sm:py-3.5 sm:text-sm ${
                  isActive
                    ? "font-bold text-foreground"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  strokeWidth={1.7}
                  className={`size-5 shrink-0 sm:size-6 ${isActive ? "text-primary" : ""}`}
                />
                {label}
                {isActive ? (
                  <span className="absolute inset-x-0 bottom-0 h-[3px] bg-primary" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="pt-4 pb-2 px-1 sm:px-3">
          {/* TAB 1: Tour Packages */}
          {activeTab === "packages" && (
            <form onSubmit={handleSearchPackages} className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4 items-end">
              <div className="space-y-1.5">
                <label htmlFor="panel-destination" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Where to?
                </label>
                <Select
                  value={selectedDestination === "" ? "__empty" : selectedDestination}
                  onValueChange={(v) => setSelectedDestination(v === "__empty" ? "" : v)}
                >
                  <SelectTrigger id="panel-destination" type="button" aria-label="Where to?" className="h-12 w-full rounded-lg px-3.5 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 rounded-lg">
                    <SelectItem value="__empty">All Destinations</SelectItem>
                    {destinations.map((d) => (
                      <SelectItem key={d.id} value={d.slug}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="panel-duration" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trip Duration
                </label>
                <Select
                  value={selectedDuration === "" ? "__empty" : selectedDuration}
                  onValueChange={(v) => setSelectedDuration(v === "__empty" ? "" : v)}
                >
                  <SelectTrigger id="panel-duration" type="button" aria-label="Trip duration" className="h-12 w-full rounded-lg px-3.5 text-sm font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="__empty">Any Duration</SelectItem>
                    <SelectItem value="1-3">Short Getaway (1–3 Days)</SelectItem>
                    <SelectItem value="4-7">Holiday (4–7 Days)</SelectItem>
                    <SelectItem value="8-14">Extended (8–14 Days)</SelectItem>
                    <SelectItem value="15+">Long Journey (15+ Days)</SelectItem>
                  </SelectContent>
                </Select>
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
              All / Hajj / Umrah sub-chips, "All" selected by default
              (Follow-ups 12 + 14). Resolution
              order: separate category lists → combined-category slider →
              the original promo block, so the tab is never blank. */}
          {activeTab === "umrah" && (
            hajjList.length > 0 || umrahList.length > 0 ? (
              <div className="space-y-3">
                {hajjList.length > 0 && umrahList.length > 0 && (
                  <div className="flex items-center gap-2" role="tablist" aria-label="Hajj or Umrah packages">
                    {(["all", "hajj", "umrah"] as const).map((key) => {
                      const count =
                        key === "all"
                          ? hajjList.length + umrahList.length
                          : key === "hajj"
                            ? hajjList.length
                            : umrahList.length;
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
                          {key === "all" ? (
                            <LayoutGrid className="size-3.5" />
                          ) : (
                            <Moon className="size-3.5" />
                          )}
                          <span>
                            {key === "all" ? "All" : key === "hajj" ? "Hajj" : "Umrah"}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-px text-xs font-bold tabular-nums ${
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
                  viewAllLabel={`View all ${activePilgrimLabel} packages`}
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
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Button asChild variant="outline" className="rounded-lg h-11">
                    <a href={telLink(phone ?? "") ?? "/services"}>
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
                <CardSlider
                  viewAllHref={selectedVisaDest ? `/visa?destination=${encodeURIComponent(selectedVisaDest)}` : "/visa"}
                  viewAllLabel="View all visa services"
                >
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

          {/* Student Visa — the catalogue's Student Visa type on its own
              tab (owner, 2026-11-10): the same service slider + country
              picker as the Visa tab, filtered to student-type services;
              the picker alone is the fallback when none are published. */}
          {activeTab === "student" && (
            studentVisaList.length > 0 ? (
              <div className="space-y-4">
                <CardSlider
                  viewAllHref={`/visa?type=student-visa${selectedVisaDest ? `&destination=${encodeURIComponent(selectedVisaDest)}` : ""}`}
                  viewAllLabel="View all student visa services"
                >
                  {studentVisaList.map((service) => (
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
                  <a href={telLink(phone ?? "") ?? "/services"}>
                    <Headphones className="mr-1.5 size-4" />
                    Offline Airline Desk
                  </a>
                </Button>
                {flightUrl ? (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <a href={flightUrl} target="_blank" rel="noopener noreferrer">
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
                  <a href={telLink(phone ?? "") ?? "/services"}>
                    <Headphones className="mr-1.5 size-4" />
                    Concierge Hotel Desk
                  </a>
                </Button>
                {hotelUrl ? (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <a href={hotelUrl} target="_blank" rel="noopener noreferrer">
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

          {/* TAB 6: Medical — the medical-travel category's published
              listings as slider cards, exactly like Hajj & Umrah; a promo
              block with the medical desk is the fallback until the first
              medical package is published (owner spec 2026-11-10). */}
          {activeTab === "medical" && (
            medicalList.length > 0 ? (
              <CardSlider
                viewAllHref={`/packages?cat=${encodeURIComponent(medicalSlug ?? "medical-travel")}`}
                viewAllLabel="View all Medical Travel packages"
              >
                {medicalList.map((pkg) => (
                  <PanelPackageCard key={pkg.slug} pkg={pkg} />
                ))}
              </CardSlider>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Medical Travel, Arranged End to End
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hospital matching, doctor appointments, medical visas and travel — coordinated by our medical travel desk.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Button asChild variant="outline" className="rounded-lg h-11">
                    <a href={telLink(phone ?? "") ?? "/services"}>
                      <Headphones className="mr-2 size-4" />
                      {phone?.trim() ? "Call Medical Desk" : "Contact Medical Desk"}
                    </a>
                  </Button>
                  <Button asChild className="rounded-lg h-11">
                    <Link href={`/packages?cat=${encodeURIComponent(medicalSlug ?? "medical-travel")}` as Route}>
                      View Medical Packages
                    </Link>
                  </Button>
                </div>
              </div>
            )
          )}

          {/* TAB 7: Passport — the passport category's published listings
              as slider cards, exactly like Hajj & Umrah; promo fallback
              until the first passport service is published (owner spec
              2026-11-10). */}
          {activeTab === "passport" && (
            passportOptionList.length > 0 ? (
              <CardSlider
                viewAllHref={`/services/${encodeURIComponent(passportSlug ?? "passport")}`}
                viewAllLabel="View all Passport services"
              >
                {passportOptionList.map((option) => (
                  <PanelOptionCard
                    key={option.id}
                    option={option}
                    categorySlug={passportSlug ?? "passport"}
                  />
                ))}
              </CardSlider>
            ) : passportList.length > 0 ? (
              <CardSlider
                viewAllHref={`/packages?cat=${encodeURIComponent(passportSlug ?? "passport")}`}
                viewAllLabel="View all Passport services"
              >
                {passportList.map((pkg) => (
                  <PanelPackageCard key={pkg.slug} pkg={pkg} />
                ))}
              </CardSlider>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Passport Services — New, Renewal &amp; Correction
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fresh e-passport applications, renewals, information corrections and lost-passport replacement, guided step by step.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Button asChild variant="outline" className="rounded-lg h-11">
                    <a href={telLink(phone ?? "") ?? "/services"}>
                      <Headphones className="mr-2 size-4" />
                      {phone?.trim() ? "Call Passport Desk" : "Contact Passport Desk"}
                    </a>
                  </Button>
                  <Button asChild className="rounded-lg h-11">
                    <Link href={`/packages?cat=${encodeURIComponent(passportSlug ?? "passport")}` as Route}>
                      View Passport Services
                    </Link>
                  </Button>
                </div>
              </div>
            )
          )}

          {/* TAB 8: eSIM - External Redirect or Internal Service (the URL
              lives on the esim category in Admin → Categories). */}
          {activeTab === "esim" && (
            <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Smartphone className="size-4" />
                  <span>Instant eSIM Data Plans</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Stay Connected the Moment You Land
                </h4>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Prepaid eSIM data for 190+ countries — scan a QR code and you are online instantly: no roaming bills and no hunting for a local SIM at the airport.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-lg h-10">
                  <a href={telLink(phone ?? "") ?? "/services"}>
                    <Headphones className="mr-1.5 size-4" />
                    Travel Desk
                  </a>
                </Button>
                {esimUrl ? (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <a href={esimUrl} target="_blank" rel="noopener noreferrer">
                      <span>Get Your eSIM</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                ) : esimSlug ? (
                  <Button asChild size="sm" className="rounded-lg h-10 gap-1.5">
                    <Link href={`/services/${esimSlug}` as Route}>
                      <span>eSIM Services</span>
                    </Link>
                  </Button>
                ) : null}
                {/* No category yet in Admin → Categories: the tab offers the
                    travel desk only — never a link to a not-found page. The
                    primary button appears the moment the category (and its
                    redirect URL) is configured. */}
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
    <div className="min-w-0">
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
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
          <span className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-white">
            <MapPin className="size-3 shrink-0 text-accent" />
            <span className="truncate">{pkg.destinationName}</span>
          </span>
          {typeof pkg.durationDays === "number" && pkg.durationDays > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90">
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
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
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
              <span className="text-xs font-medium text-muted-foreground">/ person</span>
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

function PanelOptionCard({
  option,
  categorySlug,
}: {
  option: PanelPassportOption;
  categorySlug: string;
}) {
  return (
    <Link
      href={`/services/${categorySlug}?option=${encodeURIComponent(option.slug)}` as Route}
      className={PANEL_CARD_SHELL}
    >
      <div className="relative flex aspect-[16/10] w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-3.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IdCard className="size-5" />
        </span>
        {option.duration ? (
          <span className="font-display text-xl font-bold leading-none text-foreground">
            {option.duration}
            <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              validity
            </span>
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h5 className="font-display text-sm font-bold leading-snug text-foreground line-clamp-2">
          {option.title}
        </h5>
        {option.deliveryTime ? (
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3 shrink-0 text-primary" />
            Delivery in {option.deliveryTime}
          </span>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
          <span className="flex items-baseline gap-1 pt-1">
            <span className="font-display text-base font-bold tabular-nums text-foreground">
              {formatMoney(option.price, "BDT")}
            </span>
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
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
          <FileCheck2 className="size-3 text-accent" />
          {service.visaTypeName}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h5 className="font-display text-sm font-bold leading-snug text-foreground">
          {service.destinationName}
        </h5>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{service.title}</p>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
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
            <span className="text-xs font-medium text-muted-foreground">/ visa</span>
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
