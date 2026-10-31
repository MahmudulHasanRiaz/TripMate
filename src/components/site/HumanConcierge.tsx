"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Headphones,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { WhatsAppIcon } from "./brand-icons";
import { Button } from "@/components/ui/button";
import { submitConsultationAction } from "@/modules/leads/actions";

export type HumanConciergeProps = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

const COUNTRY_CODES = [
  { code: "+880", flag: "🇧🇩", country: "Bangladesh" },
  { code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+1", flag: "🇺🇸", country: "USA" },
  { code: "+60", flag: "🇲🇾", country: "Malaysia" },
];

const JOURNEY_OPTIONS = [
  { id: "umrah", label: "🕋 VIP Umrah", desc: "Haram-front hotels & transport" },
  { id: "hajj", label: "🌙 Hajj Pilgrimage", desc: "Ministry registration & packages" },
  { id: "visa_flight", label: "✈️ Flights & Visa", desc: "Fast-track tickets & e-Visa" },
  { id: "holiday", label: "🏖️ Holiday Tours", desc: "Family & bespoke packages" },
];

export function HumanConcierge({
  phone,
  email,
  address,
}: HumanConciergeProps) {
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, "") : "";

  // Interactive Form State
  const [selectedJourney, setSelectedJourney] = useState("umrah");
  const [countryCode, setCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pilgrimName, setPilgrimName] = useState("");
  const [travelersCount, setTravelersCount] = useState(2);
  const [preferredMonth, setPreferredMonth] = useState("Upcoming Season");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setIsSubmitting(true);
    const journeyTitle = JOURNEY_OPTIONS.find((j) => j.id === selectedJourney)?.label || "Travel Inquiry";
    const fullPhone = `${countryCode} ${phoneNumber}`;
    const notes = `Consultation request for ${travelersCount} travelers around ${preferredMonth}.`;

    try {
      await submitConsultationAction({
        name: pilgrimName.trim() || "Guest Traveler",
        phone: fullPhone.trim(),
        service: journeyTitle,
        travelDate: preferredMonth,
        notes,
      });
    } catch (err) {
      console.error("[HumanConcierge] consultation submission error:", err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }

    if (cleanPhone) {
      const msg = `Salam! My name is ${pilgrimName.trim() || "Traveler"}. I am inquiring about *${journeyTitle}* for *${travelersCount} travelers* around *${preferredMonth}*. My contact is ${fullPhone}. Please share tailored itinerary and quote.`;
      const waUrl = `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section
      id="concierge"
      aria-label="Human Concierge & Advisory"
      className="relative overflow-hidden bg-secondary/35 py-16 sm:py-24 border-y border-border"
    >
      {/* Ambient background decoration */}
      <div className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Headphones className="size-3.5" />
            <span>Dedicated Human Concierge Advisory Desk</span>
          </div>

          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Personal Guidance from Experienced Travel Specialists
          </h2>

          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Planning a pilgrimage or family holiday is a momentous occasion. Our dedicated specialists are here to design your journey with meticulous care, transparency, and personal attention.
          </p>
        </div>

        {/* Dual Column Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Interactive Consultation Desk */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                    Instant Journey Consultation
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive customized package estimates and travel guidance.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>

              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground">Consultation Inquiry Received!</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                    Your request has been logged with our advisory desk. If WhatsApp did not open automatically, you can message our advisor directly below.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-11 px-6 shadow-md transition-all"
                      >
                        <WhatsAppIcon className="size-4" />
                        Open WhatsApp Chat
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(false)}
                      className="inline-flex items-center justify-center rounded-xl border border-border hover:bg-muted text-foreground font-semibold text-xs h-11 px-5 transition-colors cursor-pointer"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  {/* Journey Selection Chips */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      Select Journey Category
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {JOURNEY_OPTIONS.map((journey) => {
                        const isSelected = selectedJourney === journey.id;
                        return (
                          <button
                            key={journey.id}
                            type="button"
                            onClick={() => setSelectedJourney(journey.id)}
                            className={`flex flex-col text-left p-3 rounded-xl border text-xs transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary shadow-xs"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                          >
                            <span className="font-bold">{journey.label}</span>
                            <span className="text-[10px] opacity-75 mt-0.5 line-clamp-2 leading-snug">{journey.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pilgrim Name & Group Size */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Your Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                          type="text"
                          required
                          value={pilgrimName}
                          onChange={(e) => setPilgrimName(e.target.value)}
                          placeholder="e.g. Mohammad Rahman"
                          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Number of Travelers
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <select
                          value={travelersCount}
                          onChange={(e) => setTravelersCount(Number(e.target.value))}
                          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value={1}>1 Person (Solo)</option>
                          <option value={2}>2 Persons (Couple / Pair)</option>
                          <option value={3}>3–4 Persons (Small Family)</option>
                          <option value={6}>5–8 Persons (Family Group)</option>
                          <option value={10}>10+ Persons (Large Delegation)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contact Phone & Travel Period */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        WhatsApp Contact Number
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="rounded-xl border border-border bg-background px-2.5 py-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="017XX-XXXXXX"
                          className="w-full rounded-xl border border-border bg-background py-2.5 px-3 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Target Travel Timing
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={preferredMonth}
                          onChange={(e) => setPreferredMonth(e.target.value)}
                          placeholder="e.g. Next Month / Ramadan"
                          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl h-11 text-xs font-bold gap-2 shadow-md cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span>Submitting Request...</span>
                      ) : (
                        <>
                          <WhatsAppIcon className="size-4" />
                          <span>Request Custom Itinerary &amp; Quote</span>
                        </>
                      )}
                    </Button>
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">
                      Your inquiry is received directly by our concierge team for immediate follow-up.
                    </p>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Guarantees Strip */}
            <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">Verified Operator</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Clock className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">Prompt Response</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Headphones className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">24/7 Human Desk</span>
              </div>
            </div>
          </div>

          {/* Right Column: Concierge Advisor Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="space-y-6">
              {/* Advisor Profile Header */}
              <div className="flex items-start gap-4">
                <div className="relative flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary via-primary/80 to-accent text-primary-foreground shadow-sm">
                  <Headphones className="size-8" />
                  <div className="absolute bottom-1 right-1 size-3.5 rounded-full bg-emerald-500 border-2 border-card ring-1 ring-emerald-500/50" />
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online &amp; Taking Inquiries
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                    Senior Concierge Desk
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Dedicated Advisory &amp; Booking Team
                  </p>
                </div>
              </div>

              {/* Direct Communication Channels */}
              <div className="space-y-3 pt-2">
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                        <WhatsAppIcon className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Direct WhatsApp Chat</div>
                        <div className="text-[11px] text-muted-foreground">Instant quotes &amp; brochures</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                      Chat →
                    </span>
                  </a>
                )}

                {phone && (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                        <Phone className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Priority Voice Line</div>
                        <div className="text-[11px] text-muted-foreground">{phone}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                      Call →
                    </span>
                  </a>
                )}
              </div>

              {/* Physical Office / Contact Information */}
              {(address || email) && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5 text-xs text-muted-foreground">
                  {address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground font-medium">{address}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-2.5">
                      <Mail className="size-4 text-primary shrink-0" />
                      <span>{email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Clock className="size-4 text-primary shrink-0" />
                    <span>Office Hours: Saturday – Thursday, 10:00 AM – 7:00 PM</span>
                  </div>
                </div>
              )}
            </div>

            {cleanPhone && (
              <div className="pt-6">
                <Button asChild variant="outline" className="w-full rounded-xl h-11 text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
                  <a
                    href={`https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent("Salam, I would like to schedule an in-person consultation at your office.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Calendar className="mr-2 size-4" />
                    Schedule Office Appointment
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
