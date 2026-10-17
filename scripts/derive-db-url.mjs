// Prints the runtime DATABASE_URL derived from the POSTGRES_* variables when
// DATABASE_URL itself is not set, and NOTHING otherwise.
//
// Why this exists: the bundled docker-compose / Portainer stack uses the
// internal Postgres service. The operator sets POSTGRES_DB / POSTGRES_PASSWORD
// (/ POSTGRES_USER) once in the stack environment; the Postgres service
// initializes with them and THIS script hands the app the matching connection
// string before auto-migration runs (see the image CMD in Dockerfile):
//
//   DATABASE_URL="${DATABASE_URL:-$(node scripts/derive-db-url.mjs)}"
//
// Rules:
//   - DATABASE_URL already set → print nothing (external database; untouched).
//   - POSTGRES_DB set, DATABASE_URL empty → print the derived URL (host
//     defaults to the compose service name "postgres", port 5432 — the
//     INTERNAL network port, never the host-published POSTGRES_PORT).
//   - Neither → print nothing; auto-migrate / env.ts then fail with their own
//     actionable messages ("neither ... is set").
// The URL is NEVER logged (it embeds the password): node's stdout is captured
// by the shell substitution, and the stderr notice avoids the credentials.
import { databaseUrlFromParts } from "./migrate-lib.mjs";

const explicit = (process.env.DATABASE_URL ?? "").trim();
const derived = explicit
  ? null
  : databaseUrlFromParts({
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      host: process.env.POSTGRES_HOST,
    });

if (derived) {
  console.error(
    "[derive-db-url] DATABASE_URL not set — derived from POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB " +
      `(host ${(process.env.POSTGRES_HOST ?? "postgres").trim() || "postgres"}, internal port 5432; value not logged)`,
  );
  process.stdout.write(derived);
}
