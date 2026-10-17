// Pure helpers for scripts/auto-migrate.mjs (Follow-up 02). Kept dependency-
// free and side-effect-free so vitest can unit-test the detection logic that
// guards deploys: a pooled-only config must fail fast with an actionable
// message instead of a cryptic mid-build DDL error.

/**
 * Why this URL looks like a PgBouncer/pooled connection, or null when it does
 * not. Pooled markers: port 6543 (Supabase transaction pooler), a pooler
 * hostname, or an explicit ?pgbouncer=true. DDL cannot run over PgBouncer.
 *
 * @param {string} url
 * @returns {string | null}
 */
export function pooledUrlReason(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    // Not a parseable URL (e.g. a unix-socket DSN) — nothing to judge here;
    // the driver will surface a real error if the target is unusable.
    return null;
  }

  const reasons = [];
  if (parsed.port === "6543") {
    reasons.push("port 6543 (transaction pooler)");
  }
  if (parsed.hostname.toLowerCase().includes("pooler")) {
    reasons.push(`pooler hostname "${parsed.hostname}"`);
  }
  if (parsed.searchParams.get("pgbouncer") === "true") {
    reasons.push("pgbouncer=true");
  }
  return reasons.length > 0 ? reasons.join(" + ") : null;
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isPooledUrl(url) {
  return pooledUrlReason(url) !== null;
}

const DIRECT_FIX_LINES = [
  "      postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres",
  "  (Supabase dashboard → Project Settings → Database → Connection string → Direct.)",
];

/**
 * Decide which URL the migration step may use.
 *
 * Rules (Follow-up 02 §1.1):
 *   - DATABASE_URL_MIGRATE set  → must be direct; pooled fails fast.
 *   - unset + pooled DATABASE_URL → fail fast (this was the silent killer).
 *   - unset + non-pooled DATABASE_URL → previous fallback behavior.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ url: string, source: "DATABASE_URL_MIGRATE" | "DATABASE_URL" } | { error: string }}
 */
export function resolveMigrationDatabaseUrl(env) {
  const migrateUrl = (env.DATABASE_URL_MIGRATE ?? "").trim();
  const runtimeUrl = (env.DATABASE_URL ?? "").trim();

  if (migrateUrl) {
    const reason = pooledUrlReason(migrateUrl);
    if (reason) {
      return {
        error: [
          `[auto-migrate] FATAL: DATABASE_URL_MIGRATE looks like a POOLED connection (${reason}).`,
          "  Migrations run DDL (CREATE TYPE, enum/table changes) which needs a real",
          "  session — over PgBouncer it fails mid-deploy with cryptic errors.",
          "  FIX: point DATABASE_URL_MIGRATE at the Supabase DIRECT connection:",
          ...DIRECT_FIX_LINES,
        ].join("\n"),
      };
    }
    return { url: migrateUrl, source: "DATABASE_URL_MIGRATE" };
  }

  if (runtimeUrl) {
    const reason = pooledUrlReason(runtimeUrl);
    if (reason) {
      return {
        error: [
          `[auto-migrate] FATAL: DATABASE_URL looks like a POOLED connection (${reason})`,
          "  and DATABASE_URL_MIGRATE is NOT set. Migrations run DDL, which cannot",
          "  execute over the transaction pooler — this deploy would fail with a",
          "  cryptic mid-build error.",
          "  FIX: set DATABASE_URL_MIGRATE in your Vercel project",
          "  (Settings → Environment Variables) to the Supabase DIRECT connection:",
          ...DIRECT_FIX_LINES,
        ].join("\n"),
      };
    }
    return { url: runtimeUrl, source: "DATABASE_URL" };
  }

  return {
    error: [
      "[auto-migrate] FATAL: neither DATABASE_URL_MIGRATE nor DATABASE_URL is set.",
      "  FIX: set DATABASE_URL (runtime — Supabase pooled :6543) and",
      "  DATABASE_URL_MIGRATE (direct — Supabase :5432) in the deploy environment.",
      "  See README → Deploy env (Vercel + Supabase).",
    ].join("\n"),
  };
}

/**
 * Compare the committed journal against the rows recorded in
 * drizzle."__drizzle_migrations" (matched on the `when`/created_at epoch ms
 * drizzle itself uses). Proves migrations applied — never assume they did.
 *
 * @param {Array<{ idx: number, when: number, tag: string }>} journalEntries
 * @param {Array<number | string | bigint>} appliedWhens
 */
export function journalReadiness(journalEntries, appliedWhens) {
  const appliedSet = new Set(appliedWhens.map((w) => Number(w)));
  const journalWhens = new Set(journalEntries.map((e) => Number(e.when)));

  const appliedTags = [];
  const missingTags = [];
  for (const entry of journalEntries) {
    if (appliedSet.has(Number(entry.when))) {
      appliedTags.push(entry.tag);
    } else {
      missingTags.push(entry.tag);
    }
  }

  let extraCount = 0;
  for (const when of appliedSet) {
    if (!journalWhens.has(when)) extraCount += 1;
  }

  return {
    journalCount: journalEntries.length,
    appliedCount: appliedSet.size,
    appliedTags,
    missingTags,
    extraCount,
    verified: missingTags.length === 0 && extraCount === 0,
  };
}
