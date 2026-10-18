"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Award,
  Building2,
  Calendar,
  CreditCard,
  FileCheck2,
  Headphones,
  MapPin,
  Minus,
  Moon,
  Palmtree,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroSearchTab = "umrah" | "packages" | "flights" | "hotels" | "visa";

export type HeroSectionProps = {
  headline?: string;
  sub?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageSrc?: string | null;
  imageAlt?: string;
  destinations?: { id: string; name: string; slug: string }[];
  categories?: { id: string; name: string; slug: string; kind?: string }[];
  phone?: string | null;
};

const QUICK_CHIPS = [
  { id: "steps_haram", label: "🕋 Steps from Haram (<300m)" },
  { id: "5star", label: "⭐ 5-Star Luxury Stays" },
  { id: "direct_flight", label: "✈️ Direct Saudia / Biman" },
  { id: "family", label: "👨‍👩‍👧 Family Suites" },
  { id: "vip_gmc", label: "✨ VIP Private GMC" },
];

export function HeroSection({
  headline = "Travel better. We'll handle the rest.",
  sub = "Spiritual pilgrimages, family holidays, and corporate travel — planned with precision, transparency, and 24/7 human care.",
  imageSrc,
  imageAlt = "Luxury travel landscape",
  destinations = [],
  phone,
}: HeroSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HeroSearchTab>("umrah");
  const [selectedChips, setSelectedChips] = useState<string[]>(["steps_haram", "5star"]);

  // Form states
  const [selectedDestination, setSelectedDestination] = useState("Makkah & Madinah");
  const [departureDate, setDepartureDate] = useState("2026-11-20");
  const [returnDate, setReturnDate] = useState("2026-12-04");
  const [travelers, setTravelers] = useState(2);

  // Flight specific
  const [flightFrom, setFlightFrom] = useState("Dhaka (DAC)");
  const [flightTo, setFlightTo] = useState("Jeddah (JED)");
  const [flightClass, setFlightClass] = useState("Business");

  // Hotel specific
  const [hotelCity, setHotelCity] = useState("Makkah (Haram View)");
  const [rooms, setRooms] = useState(1);

  // Visa specific
  const [visaCountry, setVisaCountry] = useState("Saudi Arabia");
  const [visaType, setVisaType] = useState("Tourist / Umrah e-Visa");

  const toggleChip = (id: string) => {
    setSelectedChips((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "umrah") {
      const params = new URLSearchParams();
      params.set("type", "umrah");
      if (selectedDestination) params.set("destination", selectedDestination);
      if (travelers > 1) params.set("travelers", String(travelers));
      if (selectedChips.length > 0) params.set("features", selectedChips.join(","));
      router.push(`/packages?${params.toString()}` as Route);
      return;
    }

    if (activeTab === "packages") {
      const params = new URLSearchParams();
      if (selectedDestination && selectedDestination !== "All Destinations") {
        params.set("destination", selectedDestination);
      }
      if (travelers > 1) params.set("travelers", String(travelers));
      router.push(`/packages?${params.toString()}` as Route);
      return;
    }

    if (activeTab === "visa") {
      const q = visaCountry ? `?destination=${encodeURIComponent(visaCountry)}` : "";
      router.push(`/visa${q}` as Route);
      return;
    }

    if (activeTab === "flights") {
      router.push(`/services/flight-tickets` as Route);
      return;
    }

    if (activeTab === "hotels") {
      router.push(`/services/hotel-reservations` as Route);
      return;
    }
  };

  // Two-tone typography formatter: italic accent on highlight
  const renderHeadline = () => {
    if (!headline) return null;
    const splitChar = headline.includes(".") ? "." : headline.includes(",") ? "," : null;
    if (splitChar) {
      const parts = headline.split(splitChar);
      const first = parts[0];
      const second = parts.slice(1).join(splitChar);
      if (second.trim()) {
        return (
          <>
            <span className="block text-foreground">{first.trim()}{splitChar === "." ? "." : ","}</span>
            <span className="block font-serif italic font-normal tracking-normal text-accent dark:text-amber-300">
              {second.trim()}
            </span>
          </>
        );
      }
    }
    return <span className="text-foreground">{headline}</span>;
  };

  return (
    <section className="relative isolate overflow-hidden -mt-20 sm:-mt-24 pt-32 sm:pt-40 pb-16 sm:pb-24 lg:pb-28 transition-colors">
      {/* Background: Atmospheric Photograph extending to top-0 */}
      {imageSrc ? (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            referrerPolicy="no-referrer"
            className="object-cover opacity-30 dark:opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background dark:from-slate-950/80 dark:via-slate-950/65 dark:to-slate-950" />
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 bg-background dark:bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background dark:from-slate-950 dark:via-slate-950/95 dark:to-slate-950" />
          <div className="absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-[130px]" />
          <div className="absolute left-1/4 top-1/3 h-80 w-80 rounded-full bg-primary/20 blur-[140px]" />
        </div>
      )}

      {/* Ambient Radial Glow Orbs */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/15 blur-[140px] -z-10" />
      <div className="pointer-events-none absolute top-48 right-1/4 size-[400px] rounded-full bg-accent/15 blur-[140px] -z-10" />

      <div className="relative mx-auto flex w-full max-w-[1340px] flex-col items-center px-4 sm:px-6 lg:px-8 text-center">
        {/* Floating Trust Eyebrow Pill with High Contrast & Pulsing Beacon */}
        <div className="mb-6 inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-border/80 bg-card/85 dark:bg-slate-900/85 px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground shadow-lg backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-amber-500 dark:text-amber-300 font-bold">✨ Premier IATA-Certified Agency</span>
          <span className="opacity-30">•</span>
          <span className="text-muted-foreground hidden sm:inline">4.9★ Rating (1,400+ Pilgrims)</span>
          <span className="text-muted-foreground sm:hidden">4.9★</span>
        </div>

        {/* Hero Headline */}
        <h1 className="max-w-4xl text-balance font-display text-[clamp(2.4rem,5.5vw,4.5rem)] font-extrabold leading-[1.08] tracking-tight drop-shadow-xs">
          {renderHeadline()}
        </h1>

        {/* Supporting Copy */}
        <p className="mt-4 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          {sub}
        </p>

        {/* Interactive Search & Booking Hub Widget */}
        <div className="mt-8 sm:mt-10 w-full max-w-[1140px] text-left">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 dark:bg-slate-900/90 shadow-2xl backdrop-blur-xl transition-all">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 dark:bg-black/30 p-1.5 sm:p-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("umrah");
                  setSelectedDestination("Makkah & Madinah");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                  activeTab === "umrah"
                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Moon className="size-4" />
                <span>Hajj &amp; Umrah</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("packages");
                  setSelectedDestination("All Destinations");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                  activeTab === "packages"
                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Palmtree className="size-4" />
                <span>Tour Packages</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("flights")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                  activeTab === "flights"
                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Plane className="size-4" />
                <span>Flights</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("hotels")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                  activeTab === "hotels"
                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Building2 className="size-4" />
                <span>Hotels</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("visa");
                  setVisaCountry("Saudi Arabia");
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all",
                  activeTab === "visa"
                    ? "bg-primary text-primary-foreground shadow-md font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <FileCheck2 className="size-4" />
                <span>Visa Concierge</span>
              </button>
            </div>

            {/* Inputs Form */}
            <form onSubmit={handleSearch} className="p-3 sm:p-5">
              {/* TAB 1: Umrah / Hajj */}
              {activeTab === "umrah" && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-4">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <MapPin className="size-3 text-primary" />
                      <span>Sanctuary &amp; Focus</span>
                    </label>
                    <select
                      value={selectedDestination}
                      onChange={(e) => setSelectedDestination(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    >
                      <option value="Makkah & Madinah">Makkah &amp; Madinah VIP</option>
                      <option value="Makkah Clock Tower Stays">Clock Tower Suites (0m to Haram)</option>
                      <option value="Madinah First Long Stay">Madinah First Long Stay</option>
                      <option value="Hajj 2026 Registration">Hajj 2026 Ministry Registration</option>
                      {destinations.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3 text-primary" />
                      <span>Departure</span>
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3 text-primary" />
                      <span>Return</span>
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-1.5 lg:col-span-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Users className="size-3 text-primary" />
                      <span>Pilgrims</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {travelers} {travelers === 1 ? "Person" : "Persons"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                          disabled={travelers <= 1}
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-30"
                        >
                          <Minus className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTravelers((prev) => Math.min(20, prev + 1))}
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/80"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.99] font-bold transition-all shadow-md text-sm cursor-pointer"
                    >
                      <Search className="size-4" />
                      <span>Find Packages</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Tour Packages */}
              {activeTab === "packages" && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-4">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <MapPin className="size-3 text-primary" />
                      <span>Destination</span>
                    </label>
                    <select
                      value={selectedDestination}
                      onChange={(e) => setSelectedDestination(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    >
                      <option value="All Destinations">All Destinations</option>
                      {destinations.map((d) => (
                        <option key={d.id} value={d.slug}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-3">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3 text-primary" />
                      <span>Approx. Travel Date</span>
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-1.5 lg:col-span-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Users className="size-3 text-primary" />
                      <span>Travelers</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {travelers} {travelers === 1 ? "Traveler" : "Travelers"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                          disabled={travelers <= 1}
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-30"
                        >
                          <Minus className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTravelers((prev) => Math.min(20, prev + 1))}
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/80"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.99] font-bold transition-all shadow-md text-sm cursor-pointer"
                    >
                      <Search className="size-4" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: Flights */}
              {activeTab === "flights" && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-3">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Plane className="size-3 text-primary" />
                      <span>From (Departure)</span>
                    </label>
                    <input
                      type="text"
                      value={flightFrom}
                      onChange={(e) => setFlightFrom(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-3">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <MapPin className="size-3 text-primary" />
                      <span>To (Destination)</span>
                    </label>
                    <input
                      type="text"
                      value={flightTo}
                      onChange={(e) => setFlightTo(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3 text-primary" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Cabin Class
                    </label>
                    <select
                      value={flightClass}
                      onChange={(e) => setFlightClass(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    >
                      <option value="Economy">Economy</option>
                      <option value="Premium Economy">Premium Economy</option>
                      <option value="Business">Business Class</option>
                      <option value="First">First Class</option>
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.99] font-bold transition-all shadow-md text-sm cursor-pointer"
                    >
                      <Plane className="size-4" />
                      <span>Find Flights</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: Hotels */}
              {activeTab === "hotels" && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-4">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Building2 className="size-3 text-primary" />
                      <span>City or Sanctuary</span>
                    </label>
                    <input
                      type="text"
                      value={hotelCity}
                      onChange={(e) => setHotelCity(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3 text-primary" />
                      <span>Check-In</span>
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-2">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Calendar className="size-3 text-primary" />
                      <span>Check-Out</span>
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-1.5 lg:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Rooms &amp; Guests
                    </label>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-foreground font-medium">
                      <span>{rooms} Room, {travelers} Guests</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRooms((r) => Math.max(1, r - 1))}
                          className="flex size-5 items-center justify-center rounded border border-border text-foreground hover:bg-muted"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => setRooms((r) => Math.min(5, r + 1))}
                          className="flex size-5 items-center justify-center rounded border border-border text-foreground hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.99] font-bold transition-all shadow-md text-sm cursor-pointer"
                    >
                      <Building2 className="size-4" />
                      <span>Find Stays</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: Visa Concierge */}
              {activeTab === "visa" && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-4">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <MapPin className="size-3 text-primary" />
                      <span>Destination Country</span>
                    </label>
                    <select
                      value={visaCountry}
                      onChange={(e) => setVisaCountry(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    >
                      <option value="Saudi Arabia">Saudi Arabia (Umrah / Tourist)</option>
                      <option value="United Arab Emirates">United Arab Emirates (Dubai)</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Thailand">Thailand</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Schengen">Schengen Europe</option>
                      <option value="Turkey">Turkey</option>
                      <option value="Egypt">Egypt</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-2 focus-within:border-primary lg:col-span-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Visa Category
                    </label>
                    <select
                      value={visaType}
                      onChange={(e) => setVisaType(e.target.value)}
                      className="mt-0.5 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
                    >
                      <option value="Tourist / Umrah e-Visa">Tourist / Umrah e-Visa</option>
                      <option value="Business / Commercial Visa">Business / Commercial Visa</option>
                      <option value="Medical Visa">Medical Travel Visa</option>
                      <option value="Family Visit Visa">Family Visit Visa</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-border bg-background/80 px-3.5 py-1.5 lg:col-span-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <Users className="size-3 text-primary" />
                      <span>Applicants</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {travelers} {travelers === 1 ? "Person" : "Persons"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTravelers((prev) => Math.max(1, prev - 1))}
                          disabled={travelers <= 1}
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-30"
                        >
                          <Minus className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTravelers((prev) => Math.min(20, prev + 1))}
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-secondary text-foreground hover:bg-secondary/80"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      type="submit"
                      className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.99] font-bold transition-all shadow-md text-sm cursor-pointer"
                    >
                      <FileCheck2 className="size-4" />
                      <span>Check Visa</span>
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Quick-Filter Chips Bar (Benchmark UI/UX) */}
            <div className="flex flex-wrap items-center gap-1.5 px-3 sm:px-5 py-2.5 border-t border-border/60 bg-muted/25 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">
                Quick Preferences:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((chip) => {
                  const isSelected = selectedChips.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => toggleChip(chip.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs ring-1 ring-primary"
                          : "bg-background/90 hover:bg-background text-muted-foreground hover:text-foreground border border-border/70"
                      )}
                    >
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Package Match Counter Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-5 py-2 bg-primary/5 dark:bg-primary/10 border-t border-border/50 text-xs">
              <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                <Sparkles className="size-3.5 text-amber-500 dark:text-amber-300 shrink-0" />
                <span>
                  <strong className="text-primary font-bold">18 Verified Packages</strong> available for Nov 2026 – Ramadan 1448
                </span>
              </span>
              <span className="text-muted-foreground text-[11px]">
                Instant Booking Confirmation • Dedicated Ground Escort
              </span>
            </div>
          </div>
        </div>

        {/* 4 Pillars Trust Strip */}
        <div className="mt-8 sm:mt-10 grid w-full max-w-[1140px] grid-cols-2 gap-3 sm:grid-cols-4 text-left">
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/75 p-3.5 shadow-sm backdrop-blur-md hover:border-primary/40 transition-colors">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">ATAB &amp; CAAB</div>
              <div className="text-[11px] text-muted-foreground">Accredited agency</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/75 p-3.5 shadow-sm backdrop-blur-md hover:border-primary/40 transition-colors">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-text">
              <Award className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Ministry Approved</div>
              <div className="text-[11px] text-muted-foreground">Official Hajj operator</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/75 p-3.5 shadow-sm backdrop-blur-md hover:border-primary/40 transition-colors">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Headphones className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">24/7 Concierge</div>
              <div className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                {phone?.trim() ? (
                  <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="hover:text-primary transition-colors font-medium">
                    {phone}
                  </a>
                ) : (
                  "Dhaka & Makkah desks"
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/75 p-3.5 shadow-sm backdrop-blur-md hover:border-primary/40 transition-colors">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-text">
              <CreditCard className="size-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Secure Payments</div>
              <div className="text-[11px] text-muted-foreground">bKash, Nagad, Cards</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
