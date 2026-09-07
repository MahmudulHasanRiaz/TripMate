// Vercel deploy-time DB migration (auto schema apply).
//
// Vercel runs `npm run vercel-build` (defined in package.json) INSTEAD of
// `build`, so this script runs before `next build` on every production and
// preview deploy. That ordering is required: with Next 16 Cache Components,
// `next build` executes the public 'use cache' data scopes, so the schema must
// already exist in the database before the build can prerender pages.
//
// Behaviour:
//   - Applies every committed drizzle migration under /drizzle that has not
//     been applied yet. The journal is `"drizzle"."__drizzle_migrations"` —
//     the same one `npm run db:migrate` / drizzle-kit uses — so re-deploys
//     are no-ops unless a new migration file was committed.
//   - Uses the RUNTIME migrator (drizzle-orm + postgres, both production
//     dependencies) instead of the dev-only drizzle-kit CLI, so the deploy
//     never depends on devDependencies being installed.
//   - Migrates over DATABASE_URL_MIGRATE when set, falling back to
//     DATABASE_URL. Set SKIP_DB_MIGRATE=1 to opt out entirely.
//
// Supabase notes (two URLs, two jobs):
//   - DATABASE_URL            = TRANSACTION pooler (port 6543). Used by the
//     app/build at runtime; many short-lived serverless connections, no
//     session cap. NOT for DDL.
//   - DATABASE_URL_MIGRATE    = SESSION pooler (port 5432) or direct
//     connection. Used ONLY by this migrate step, because DDL needs a real
//     backend session. If unset, this script falls back to DATABASE_URL.
//   - The role must own the schema (CREATE/ALTER rights). Use the project's
//     postgres role or an owner role, not a read-only/anonym key.
//   - If the schema was previously created with `drizzle-kit push` (no
//     migration journal), the first migrate errors on existing tables. Point
//     the migrate URL at a fresh database or baseline the journal first.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";

const url = process.env.DATABASE_URL_MIGRATE || process.env.DATABASE_URL;
const skip = process.env.SKIP_DB_MIGRATE === "1";

if (skip) {
  console.log("[vercel-migrate] SKIP_DB_MIGRATE=1 set — skipping DB migrations.");
  process.exit(0);
}

if (!url) {
  console.error(
    "[vercel-migrate] Neither DATABASE_URL_MIGRATE nor DATABASE_URL is set.\n" +
      "Add DATABASE_URL_MIGRATE (Supabase Session-pooler/direct string) and " +
      "DATABASE_URL (Transaction-pooler string) to the Vercel project " +
      "environment, otherwise the following `next build` cannot prerender.",
  );
  process.exit(1);
}

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const client = postgres(url, { max: 1 });

try {
  console.log(`[vercel-migrate] applying migrations from ${migrationsFolder} ...`);
  await migrate(drizzle(client), { migrationsFolder });
  console.log("[vercel-migrate] database schema is up to date.");
} finally {
  await client.end();
}
