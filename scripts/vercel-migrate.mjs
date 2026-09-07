// Vercel deploy-time DB migration (auto schema apply).
//
// Vercel runs `npm run vercel-build` (defined in package.json) INSTEAD of
// `build`, so this script runs before `next build` on every production and
// preview deploy. That ordering is required: with Next 16 Cache Components,
// `next build` executes the public 'use cache' data scopes, so the schema must
// already exist in the database pointed at by DATABASE_URL or the build fails
// at export/prerender.
//
// Behaviour:
//   - Applies every committed drizzle migration under /drizzle that has not
//     been applied yet. The journal is `"drizzle"."__drizzle_migrations"` —
//     the same one `npm run db:migrate` / drizzle-kit uses — so re-deploys
//     are no-ops unless a new migration file was committed.
//   - Uses the RUNTIME migrator (drizzle-orm + postgres, both production
//     dependencies) instead of the dev-only drizzle-kit CLI, so the deploy
//     never depends on devDependencies being installed.
//   - Set SKIP_DB_MIGRATE=1 in the Vercel project env to opt out.
//
// Supabase notes:
//   - DATABASE_URL must be the Session pooler (port 5432, pooler.supabase.com)
//     or the direct connection string. Do NOT use the Transaction pooler
//     (port 6543) here — DDL over the transaction pool can fail.
//   - The role in DATABASE_URL must own the schema (CREATE/ALTER rights). Use
//     the project's postgres role or an owner role, not a read-only/anonym key.
//   - If the schema was previously created with `drizzle-kit push` (no
//     migration journal), the first migrate errors on existing tables. Point
//     DATABASE_URL at a fresh database or baseline the journal first.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";

const url = process.env.DATABASE_URL;
const skip = process.env.SKIP_DB_MIGRATE === "1";

if (skip) {
  console.log("[vercel-migrate] SKIP_DB_MIGRATE=1 set — skipping DB migrations.");
  process.exit(0);
}

if (!url) {
  console.error(
    "[vercel-migrate] DATABASE_URL is not set.\n" +
      "Add it to the Vercel project environment (Supabase Session-pooler " +
      "connection string), otherwise the following `next build` cannot " +
      "prerender the public pages.",
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
