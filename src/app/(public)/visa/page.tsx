import type { Metadata } from "next";
import { connection } from "next/server";
import { Award, FileCheck2, Headphones, ShieldCheck } from "lucide-react";
import { getPublicSiteSettings } from "@/modules/settings/site-settings";
import { getVisaExplorerData } from "./_lib/visa-data";
import { resolveVisaDestinationId } from "./_lib/resolve-destination";
import VisaExplorerClient from "./VisaExplorerClient";
import { SectionHeading } from "@/components/site/SectionHeading";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSiteSettings();
  // Brand falls back the way the other public index pages do: when the
  // site title is unset there is no factory name to borrow — the OG title
  // simply goes out without one.
  const brand = site.title?.trim();
  return {
    title: "Global Visa Services & Immigration Assistance",
    description:
      "Fast, reliable visa processing for Dubai, Malaysia, Singapore, Saudi Arabia, UK, and Schengen countries. Expert documentation check, transparent embassy fees, and high approval rates.",
    openGraph: { title: brand ? `${brand} Global Visa Services` : "Global Visa Services" },
  };
}

// The page opts out of build-time prerender (instant = false) so the build
// never fills a prerender cache entry with this DB read — a Vercel build-time
// cache-fill timeout was hit when the whole page was one "use cache" scope.
// Data is runtime-cached per the listings tag in _lib/visa-data.ts.
export const instant = false;

export default async function VisaPage(props: PageProps<"/visa">) {
  // Request-scoped marker: the route renders on demand and is never
  // build-prerendered, so the build never fills a DB-backed cache entry for it
  // (Vercel build-time cache-fill timeout seen when the page was one "use
  // cache" scope). Data itself is runtime-cached per the listings tag.
  await connection();

  const searchParams = await props.searchParams;
  const { services, destinations, visaTypes } = await getVisaExplorerData();
  const site = await getPublicSiteSettings();
  // Same tenant-free fallback as the blog/destinations/services indexes.
  const brand = site.title?.trim() || "the agency";

  // Deep-link contract (FU-32): the homepage panel links here with
  // ?destination=<display name>. Resolve it against the destinations that
  // actually have visa services (the explorer's pill universe) so the
  // explorer can open with that destination pre-selected; an unknown or
  // service-less country resolves to null and the explorer opens
  // unfiltered instead of landing on an empty, chip-less state.
  const serviceDestinationIds = new Set(services.map((s) => s.destinationId));
  const initialDestinationId = resolveVisaDestinationId(
    searchParams.destination,
    destinations.filter((d) => serviceDestinationIds.has(d.id)),
  );

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-muted/50 to-background py-16 lg:py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-4" />
            <span>Government Registered Agency • ATAB Certified</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl max-w-3xl mx-auto">
            Global Visa Processing & Embassy Documentation
          </h1>

          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            Guaranteed pre-screening, transparent embassy fees, and end-to-end guidance. We eliminate the guesswork from international visa applications.
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-8 grid grid-cols-2 gap-4 max-w-3xl mx-auto sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-2xl font-black text-primary">99.4%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Approval Rate</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-2xl font-black text-primary">45+</div>
              <div className="text-xs text-muted-foreground mt-0.5">Countries Served</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-2xl font-black text-primary">12,000+</div>
              <div className="text-xs text-muted-foreground mt-0.5">Visas Processed</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
              <div className="text-2xl font-black text-primary">100%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Pre-Screened</div>
            </div>
          </div>
        </div>
      </section>

      {/* Visa Explorer Section */}
      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
        <VisaExplorerClient
          // Keyed by the resolved deep-link: a same-page navigation to a
          // different ?destination= (e.g. another panel visa card) remounts
          // the explorer so its filter state re-seeds from the new param.
          key={initialDestinationId ?? "all"}
          services={services}
          destinations={destinations}
          visaTypes={visaTypes}
          brand={brand}
          initialDestinationId={initialDestinationId}
        />
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Streamlined Process"
            title={`How ${brand} Processes Your Visa`}
            lead="Simple 4-step workflow from inquiry to approval."
            align="center"
          />

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                1
              </div>
              <h3 className="font-bold text-foreground">Select Country & Visa</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose your destination country and appropriate visa category (Tourist, Student, Medical, or Business).
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                2
              </div>
              <h3 className="font-bold text-foreground">Submit Your Documents</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload scans securely online or submit physical documents at our Dhaka office.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                3
              </div>
              <h3 className="font-bold text-foreground">Expert Pre-Screening</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our accredited immigration specialists review every file to comply with strict embassy mandates.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                4
              </div>
              <h3 className="font-bold text-foreground">Receive Approved Visa</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get your electronic visa via WhatsApp and email, or collect stamped passport from our office.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Band */}
      <section className="border-t border-border bg-background py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileCheck2 className="size-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Zero Hidden Fees</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  All quoted prices include official embassy submission fees, processing charges, and taxes upfront.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Headphones className="size-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Dedicated Visa Consultant</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Direct personal support on WhatsApp throughout the entire application lifecycle.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Award className="size-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">ATAB & Ministry Certified</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Registered travel agency operating strictly under Bangladesh Civil Aviation & Ministry of Religious Affairs guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
