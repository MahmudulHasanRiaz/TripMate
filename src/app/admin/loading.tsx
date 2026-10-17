"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    // role="status" announces the loading state; the shape is dashboard-styled
    // (the heaviest admin page) but reads fine as a generic admin skeleton.
    <div className="space-y-6" role="status" aria-label="Loading admin section...">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      {/* KPI Cards Row skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="shadow-xs border-border bg-card">
            <CardHeader className="p-3 pb-1">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders by Status Strip skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Queues Section skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="shadow-xs border-border bg-card">
            <CardHeader className="p-4 pb-2">
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 30-Day Trend skeleton */}
      <Card className="shadow-xs border-border bg-card">
        <CardHeader className="p-4 pb-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
