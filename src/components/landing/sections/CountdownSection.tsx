"use client";

import { useSyncExternalStore } from "react";
import { Timer } from "lucide-react";
import type { CountdownConfig } from "@/modules/landing-pages/section-types";

type CountdownSectionProps = {
  config: CountdownConfig;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function pad(num: number): string {
  return String(num).padStart(2, "0");
}

function subscribe(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

function getClientSnapshot(): number {
  return Date.now();
}

function getServerSnapshot(): number | null {
  return null;
}

export function CountdownSection({ config }: CountdownSectionProps) {
  const clientNow = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const target = Date.parse(config.targetDate);
  const isInvalid = Number.isNaN(target);

  let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

  if (clientNow !== null && !isInvalid) {
    // Clamped strictly to zero (never negative per requirement)
    const diffMs = Math.max(0, target - clientNow);
    const totalSeconds = Math.floor(diffMs / 1000);
    timeLeft = {
      days: Math.floor(totalSeconds / (3600 * 24)),
      hours: Math.floor((totalSeconds % (3600 * 24)) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  const isMounted = clientNow !== null;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-text">
            <Timer className="size-4" aria-hidden="true" />
            {config.label?.trim() || "Limited Availability Offer"}
          </div>

          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Offer closes soon
          </h2>

          <div className="mt-8 grid grid-cols-4 gap-3 sm:gap-6">
            {[
              { label: "Days", value: isMounted ? pad(timeLeft.days) : "00" },
              { label: "Hours", value: isMounted ? pad(timeLeft.hours) : "00" },
              { label: "Minutes", value: isMounted ? pad(timeLeft.minutes) : "00" },
              { label: "Seconds", value: isMounted ? pad(timeLeft.seconds) : "00" },
            ].map((unit) => (
              <div
                key={unit.label}
                className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-secondary/50 p-4 sm:p-6"
              >
                <span className="font-mono text-3xl font-bold tracking-tight text-accent-text sm:text-5xl">
                  {unit.value}
                </span>
                <span className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
