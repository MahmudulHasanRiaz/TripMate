import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, Home } from "lucide-react";
import type { ThankYouConfig } from "@/modules/landing-pages/section-types";
import { Button } from "@/components/ui/button";

type ThankYouSectionProps = {
  config: ThankYouConfig;
};

export function ThankYouSection({ config }: ThankYouSectionProps) {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </div>

          <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Thank you!
          </h2>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {config.message}
          </p>

          <div className="mt-8 flex justify-center gap-4">
            {config.redirectUrl ? (
              <Button asChild size="lg" className="h-11 px-6 font-semibold">
                <Link href={config.redirectUrl as Route}>Continue</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="lg" className="h-11 px-6 font-semibold">
                <Link href={"/" as Route}>
                  <Home className="mr-2 size-4" aria-hidden="true" />
                  Back to Home
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
