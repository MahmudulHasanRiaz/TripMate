// Boot/deploy-time DB auto-migration — pushes committed drizzle/ migrations on
// EVERY deploy:
//   - Vercel:     `npm run vercel-build` runs this before `next build`
//                 (prerender needs the schema present).
//   - Docker:     the runner image runs this at container start before the
//                 Next server boots (see Dockerfile CMD), so Portainer
//                 re-deploys / fresh deploys auto-apply schema changes too.
//
// Behaviour:
//   - Applies every committed migration under /drizzle not yet recorded in the
//     journal ("drizzle"."__drizzle_migrations" — same one npm run db:migrate
//     uses), so re-deploys are no-ops unless a new migration was committed.
//   - Uses the RUNTIME migrator (drizzle-orm + postgres — production deps),
//     never the dev-only drizzle-kit CLI.
//   - After migrating it VERIFIES applied rows against drizzle/meta/_journal
//     .json and fails the build on any mismatch — no silent skips, no drift.
//   - Over DATABASE_URL_MIGRATE when set, else DATABASE_URL. A POOLED URL in
//     either slot fails fast with an actionable message (DDL cannot run over
//     PgBouncer — the #1 silent deploy killer). Set SKIP_DB_MIGRATE=1 to opt
//     out (loudly warned).
//
// Supabase notes (two URLs, two jobs):
//   - DATABASE_URL         = TRANSACTION pooler (port 6543), runtime/build.
//   - DATABASE_URL_MIGRATE = DIRECT connection (db.<ref>.supabase.co:5432)
//     used ONLY by this migration step; DDL needs a real session.
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { journalReadiness, resolveMigrationDatabaseUrl } from "./migrate-lib.mjs";

const skip = (process.env.SKIP_DB_MIGRATE ?? "").trim() === "1";
if (skip) {
  const line = "!".repeat(78);
  console.log(
    [
      line,
      "!! SKIP_DB_MIGRATE=1 — DATABASE MIGRATIONS ARE SKIPPED FOR THIS RUN.",
      "!! The database schema may DRIFT from the code: new columns/tables will",
      "!! be missing and affected pages WILL fail at runtime.",
      "!! Remove SKIP_DB_MIGRATE from the environment to restore auto-migrations.",
      line,
    ].join("\n"),
  );
  process.exit(0);
}

const resolved = resolveMigrationDatabaseUrl(process.env);
if ("error" in resolved) {
  console.error(resolved.error);
  process.exit(1);
}

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

const client = postgres(resolved.url, { max: 1 });
let exitCode = 0;

try {
  console.log(
    `[auto-migrate] source: ${resolved.source} — applying pending migrations from ${migrationsFolder} ...`,
  );
  await migrate(drizzle(client), { migrationsFolder });

  // §1.2: prove the schema is fully migrated — count applied rows against the
  // committed journal and name anything missing. Never assume migrate() "did
  // it"; a mismatch must fail the deploy build.
  const appliedRows = await client.unsafe(
    'select id, hash, created_at from drizzle."__drizzle_migrations" order by created_at',
  );
  const report = journalReadiness(
    journal.entries,
    appliedRows.map((row) => row.created_at),
  );

  for (const tag of report.appliedTags) {
    console.log(`[auto-migrate] applied: ${tag}`);
  }

  if (report.verified) {
    console.log(
      `[auto-migrate] verified: ${report.appliedCount}/${report.journalCount} journal migrations applied — database schema is up to date.`,
    );
  } else {
    console.error(
      [
        "[auto-migrate] FATAL: migration verification failed — the database does not match drizzle/.",
        `  journal migrations: ${report.journalCount} (drizzle/meta/_journal.json)`,
        `  applied rows:       ${report.appliedCount} (drizzle."__drizzle_migrations")`,
        report.missingTags.length > 0
          ? `  missing migrations: ${report.missingTags.join(", ")}`
          : "",
        report.extraCount > 0
          ? `  ${report.extraCount} applied row(s) not in the journal — restore the missing migration files or regenerate the journal (db:generate).`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    exitCode = 1;
  }
} catch (err) {
  console.error(`[auto-migrate] FATAL: migration run failed: ${err?.message ?? err}`);
  exitCode = 1;
} finally {
  await client.end();
}

process.exit(exitCode);
