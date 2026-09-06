"use client";

import Link from "next/link";

/**
 * Error boundary for the (public) route group — a friendly, visitor-facing
 * recovery page rendered INSIDE the (public) layout's <main>, so the public
 * header/footer chrome stays live (same shell as not-found).
 *
 * Voice is public, not raw: `error.message` is an internal detail that tells a
 * visitor nothing and may leak implementation specifics, so only the opaque
 * error digest surfaces (as a quiet "Ref" line, mirroring the root error.tsx)
 * for support triage. Primary recovery is a retry of the failed render; onward
 * journeys (home, packages) are the escape hatches if the error persists.
 *
 * Note: the boundary cannot catch errors thrown by the (public) layout itself
 * — those bubble to the root error.tsx.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-24">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          Something went wrong
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
          This page hit a snag on our end.
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Something unexpected happened while loading this page. Try again — and
          if it keeps happening, the reference below helps our team track it
          down.
        </p>
        {error.digest ? (
          <p className="text-sm text-muted-foreground">
            Ref: <span className="font-mono text-xs">{error.digest}</span>
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-foreground/40"
          >
            Back to home
          </Link>
          <Link
            href="/packages"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-transparent px-5 text-sm font-semibold text-foreground transition-colors duration-150 hover:border-foreground/40"
          >
            Browse packages
          </Link>
        </div>
      </div>
    </div>
  );
}
