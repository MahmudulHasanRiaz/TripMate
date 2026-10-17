"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error Boundary]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-4xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground text-center">
        Something unexpected happened. Please try again.
        {error.digest && <span className="block text-xs font-mono mt-1">Ref: {error.digest}</span>}
      </p>
      <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium">
        Try again
      </button>
    </main>
  );
}
