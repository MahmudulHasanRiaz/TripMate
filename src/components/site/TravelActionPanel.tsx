"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Building2,
  ExternalLink,
  FileCheck2,
  Headphones,
  Moon,
  Palmtree,
  Plane,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionTab = "packages" | "umrah" | "visa" | "flights" | "hotels";

export type TravelActionPanelProps = {
  destinations: { id: string; name: string; slug: string }[];
  categories?: { id: string; name: string; slug: string; kind: string }[];
  flightRedirectUrl?: string | null;
  flightSlug?: string;
  hotelRedirectUrl?: string | null;
  hotelSlug?: string;
  phone?: string | null;
};

export default function TravelActionPanel({
  destinations,
  categories,
  flightRedirectUrl,
  flightSlug = "flights",
  hotelRedirectUrl,
  hotelSlug = "hotels",
  phone,
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
  const umrahSlug = umrahCategory?.slug ?? "hajj-umrah";

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

  return (
    <div className="relative z-20 mx-auto -mt-10 sm:-mt-16 w-full max-w-[1280px] px-4 sm:px-6">
      <div className="rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md dark:bg-card/90">
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
            <span className="ml-1 rounded-sm bg-black/10 dark:bg-white/10 px-1 py-0.5 text-[10px] font-normal uppercase">
              Partner
            </span>
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
            <span className="ml-1 rounded-sm bg-black/10 dark:bg-white/10 px-1 py-0.5 text-[10px] font-normal uppercase">
              Partner
            </span>
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

          {/* TAB 2: Hajj & Umrah */}
          {/* TAB 2: Umrah Packages */}
          {activeTab === "umrah" && (
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
                  <Link href={`/packages?cat=${encodeURIComponent(umrahSlug)}` as Route}>
                    View Umrah Packages
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: Visa Services */}
          {activeTab === "visa" && (
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
                  For real-time seat availability and instant e-tickets, we route you to our partner flight search engine. For complex group bookings, UMRAH flights, or special corporate fares, contact our flight desk directly.
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
                  Browse millions of hotels worldwide via our verified accommodation partner, or consult with our travel specialists for exclusive contracted group rates near holy sites and popular city centers.
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
