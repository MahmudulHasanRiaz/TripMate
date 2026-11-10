"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlaneLoader from "@/components/PlaneLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoading() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // If data isn't ready within 15 seconds, switch from skeletons to an actionable error card
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
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
                  Loading is taking longer than expected
                </CardTitle>
                <CardDescription className="text-xs">
                  The database connection or server response timed out.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-3 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              We stopped waiting to prevent an infinite loading screen. Please verify your connection or retry loading the admin panel.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                onClick={() => window.location.reload()}
                className="h-9 text-xs font-medium gap-2"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Retry loading
              </Button>
              <Link href={"/admin" as Route}>
                <Button
                  variant="outline"
                  className="h-9 text-xs"
                >
                  Go to Dashboard Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // The loading face is the project's shared paper-plane loader; the 15s
  // timeout above still swaps to the error card so a stuck load never spins
  // forever (§4e — no infinite loaders).
  return <PlaneLoader label="Loading admin section" className="min-h-[60vh]" />;
}
