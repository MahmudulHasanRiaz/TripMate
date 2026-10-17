"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server/client error trace keyed by digest
    console.error("[Admin Error Boundary]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-[420px] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/40 bg-card shadow-sm">
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive shrink-0">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Something unexpected happened
              </CardTitle>
              <CardDescription className="text-xs">
                {error.digest ? `Reference: ${error.digest}` : "An error occurred while loading this section."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-3 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error.message && !error.message.includes("digest")
              ? error.message
              : "The database or server service might be temporarily unavailable. Please try again."}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={() => reset()}
              className="h-9 text-xs font-medium gap-2"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
            <Link href={"/admin" as Route}>
              <Button
                variant="outline"
                className="h-9 text-xs"
              >
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
