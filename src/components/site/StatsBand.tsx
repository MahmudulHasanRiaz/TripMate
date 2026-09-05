export type Stat = {
  /** Display numeral — e.g. "12+", "25,000+", "4.9/5". */
  value: string;
  label: string;
};

/**
 * The 4-up trust band on the secondary background (spec §3 StatsBand). Runs the
 * full width of the page between content sections. Static v1 copy for now —
 * the values are placeholder proof-of-life numbers and will be driven by real
 * reporting (orders/leads aggregates) in a later plan. Server-rendered.
 */
export function StatsBand({ stats }: { stats: Stat[] }) {
  return (
    <section className="border-y border-border/60 bg-secondary">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-14 lg:px-8 lg:py-16">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <li key={stat.label}>
              <p className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
