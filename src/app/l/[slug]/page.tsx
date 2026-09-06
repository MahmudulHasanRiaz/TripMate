import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublishedLandingBySlug } from "@/modules/landing-pages/service";
import { LandingRenderer } from "@/components/landing/LandingRenderer";
import { PixelBootstrap } from "@/components/landing/PixelBootstrap";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const landing = await getPublishedLandingBySlug(slug);
  if (!landing) {
    return { title: "Page Not Found · TripMate" };
  }

  const title = landing.seo?.title?.trim() || `${landing.title} · TripMate`;
  const description =
    landing.seo?.description?.trim() ||
    "Book premium tours, Hajj & Umrah spiritual journeys and travel packages with TripMate.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

function LandingFallback() {
  return (
    <div className="min-h-screen bg-background animate-pulse" aria-hidden="true">
      <div className="h-96 w-full bg-muted/60" />
      <div className="mx-auto max-w-4xl px-4 py-16 space-y-6">
        <div className="h-8 w-1/2 bg-muted/80 rounded mx-auto" />
        <div className="h-4 w-3/4 bg-muted/60 rounded mx-auto" />
      </div>
    </div>
  );
}

export default function LandingPublicPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LandingFallback />}>
      <LandingPublicBody params={params} />
    </Suspense>
  );
}

async function LandingPublicBody({ params }: PageProps) {
  const { slug } = await params;
  const landing = await getPublishedLandingBySlug(slug);

  if (!landing) {
    notFound();
  }

  const pixelId = process.env.META_PIXEL_ID?.trim() || null;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <PixelBootstrap pixelId={pixelId} />

      <LandingRenderer
        sections={landing.sections}
        formConfig={landing.form.formConfig}
        landingSlug={landing.slug}
        mode="public"
      />

      {/* Minimal footer — no header/nav escape for conversion intent */}
      <footer className="border-t border-border/50 bg-secondary/30 py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          <p className="font-medium text-foreground">TripMate &bull; Premium Travel &amp; Tours</p>
          <p className="mt-1">Authorized travel specialist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
