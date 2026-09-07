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
//   - Migrates over DATABASE_URL_MIGRATE when set, falling back to
//     DATABASE_URL. Set SKIP_DB_MIGRATE=1 to opt out.
//
// Supabase notes (two URLs, two jobs):
//   - DATABASE_URL         = TRANSACTION pooler (port 6543), runtime/build.
//   - DATABASE_URL_MIGRATE = SESSION pooler (port 5432) or direct — used ONLY
//     by this migration step; DDL needs a real session. Falls back to
//     DATABASE_URL when unset (fine for a direct Postgres such as Docker
//     compose / Neon).
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";

const url = process.env.DATABASE_URL_MIGRATE || process.env.DATABASE_URL;
const skip = process.env.SKIP_DB_MIGRATE === "1";

if (skip) {
  console.log("[auto-migrate] SKIP_DB_MIGRATE=1 set — skipping DB migrations.");
  process.exit(0);
}

if (!url) {
  console.error(
    "[auto-migrate] Neither DATABASE_URL_MIGRATE nor DATABASE_URL is set.\n" +
      "Add the database connection string to the environment (Supabase: see README).",
  );
  process.exit(1);
}

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const client = postgres(url, { max: 1 });

try {
  console.log(`[auto-migrate] applying pending migrations from ${migrationsFolder} ...`);
  await migrate(drizzle(client), { migrationsFolder });
  console.log("[auto-migrate] database schema is up to date.");
} finally {
  await client.end();
}
