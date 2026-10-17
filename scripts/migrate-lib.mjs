// Pure helpers for scripts/auto-migrate.mjs (Follow-up 02, corrected by 03).
// Kept dependency-free and side-effect-free so vitest can unit-test the
// detection logic that guards deploys: a transaction-pooler-only config must
// fail fast with an actionable message instead of a cryptic mid-build DDL
// error.

/**
 * Why this URL cannot run DDL, or null when it can.
 *
 * ONLY two markers are forbidden (Follow-up 03):
 *   - port 6543 — Supabase TRANSACTION pooler: PgBouncer hands each
 *     statement a different server connection, so CREATE TYPE, enum
 *     replacement and drizzle's transactional migrations break.
 *   - ?pgbouncer=true — explicit transaction-pooling hint.
 *
 * A pooler HOSTNAME is NOT forbidden: the session pooler
 * (aws-0-<region>.pooler.supabase.com:5432) gives each client a dedicated
 * server connection for the session — DDL works, and it is a supported
 * DATABASE_URL_MIGRATE value. The direct connection (db.<ref>.supabase.co:5432)
 * equally works. Do not flag hostnames.
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
  if (parsed.searchParams.get("pgbouncer") === "true") {
    reasons.push("?pgbouncer=true (transaction pooling)");
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

const DDL_SAFE_EXPLAINER = [
  "  The transaction pooler (port 6543 / ?pgbouncer=true) breaks DDL — CREATE",
  "  TYPE, enum replacement and drizzle's transactional migrations fail there.",
  "  DDL is safe over a DIRECT connection OR the SESSION pooler (port 5432).",
];

const FIX_LINES = [
  "  FIX: point DATABASE_URL_MIGRATE at the Supabase DIRECT connection:",
  "      postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres",
  "  — or the SESSION pooler (also port 5432):",
  "      postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres",
  "  (Supabase dashboard → Project Settings → Database → Connection string → Direct / Session pooler.)",
];

/**
 * Decide which URL the migration step may use.
 *
 * Rules (Follow-up 02 §1.1, corrected by Follow-up 03):
 *   - DATABASE_URL_MIGRATE set  → must be DDL-capable (no 6543 / pgbouncer);
 *     direct :5432 and session-pooler :5432 are both fine.
 *   - unset + transaction-pooler DATABASE_URL → fail fast (the silent killer).
 *   - unset + DDL-capable DATABASE_URL → previous fallback behavior.
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
          `[auto-migrate] FATAL: DATABASE_URL_MIGRATE cannot run migrations (${reason}).`,
          ...DDL_SAFE_EXPLAINER,
          ...FIX_LINES,
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
          `[auto-migrate] FATAL: DATABASE_URL cannot run migrations (${reason})`,
          "  and DATABASE_URL_MIGRATE is NOT set.",
          ...DDL_SAFE_EXPLAINER,
          "  FIX: set DATABASE_URL_MIGRATE in your Vercel project",
          "  (Settings → Environment Variables) — DIRECT connection:",
          "      postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres",
          "  — or the SESSION pooler (also port 5432):",
          "      postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres",
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
 * Build a runtime DATABASE_URL from the individual POSTGRES_* variables that
 * the bundled docker-compose stack feeds the app container. This is what makes
 * the internal-database deploy fully automatic: the operator sets
 * POSTGRES_DB / POSTGRES_PASSWORD (/ POSTGRES_USER) once — for the Postgres
 * service and the app alike — and both ends derive the SAME connection without
 * the operator ever writing a URL (see scripts/derive-db-url.mjs, run by the
 * image's CMD before auto-migration).
 *
 * Username/password/database are encodeURIComponent'd — the driver side
 * (postgres.js / node-postgres) percent-DECODES each URL part, and
 * encodeURIComponent output is always a valid escape sequence, so passwords
 * containing @ : # % / etc. round-trip verbatim (tested in
 * tests/derive-db-url.test.ts).
 *
 * @param {{
 *   user?: string,
 *   password?: string,
 *   database?: string,
 *   host?: string,
 *   port?: string | number,
 * }} parts
 * @returns {string | null} the URL, or null when no database name is given
 *   (nothing sensible to derive).
 */
export function databaseUrlFromParts(parts) {
  const database = (parts.database ?? "").trim();
  if (!database) return null;

  const user = (parts.user ?? "postgres").trim() || "postgres";
  const password = parts.password ?? "postgres";
  const host = (parts.host ?? "postgres").trim() || "postgres";
  const port = String(parts.port ?? "5432").trim() || "5432";

  return (
    `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}`
  );
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
