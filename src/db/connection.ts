import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

/**
 * The server's single connection pool. Tuned for the remote poolers this app
 * runs against (Supabase/Supavisor, Neon) — remote pools fail differently
 * from a local Postgres, and the old defaults caused the dashboard's
 * "query timed out / page hung for ~10 minutes" pathology. Measured against
 * the Supabase transaction pooler from a dev machine:
 *
 *   - A fresh pool costs ~4.7s (10 parallel connects ≈ 4.7s end-to-end,
 *     Supavisor handshake ≈ 0.5s/connect warm-path ≈ 0.7s per query-wave).
 *     The old idle_timeout of 20s closed every connection between two dev
 *     page loads, so every dashboard render paid the full cold-pool price on
 *     top of its ~20 queries and blew the query budget ~90% of the time.
 *     Connections now stay warm for 5 idle minutes — a warm pool serves 15
 *     parallel queries in ~1.8s, 30 in ~3.8s.
 *   - ROOT CAUSE of the wedged pools: postgres.js pipelines queries onto a
 *     busy socket by default (max_pipeline: 100), and Supavisor's transaction
 *     mode LOSES the responses of queries pipelined behind an active one —
 *     the backend stalls in "ClientRead", the connection wedges permanently
 *     and every later query routed onto it hangs (postgres.js issue #970).
 *     The dashboard fires ~20 concurrent queries at a 10-connection pool, so
 *     it guaranteed pipelining; where this hit, fresh connections still
 *     answered in ~200ms while the app's whole pool sat dead.
 *     max_pipeline: 0 (one query per connection) is the only safe value with
 *     a transaction pooler — 1 still wedges. Requires
 *     patches/postgres+3.4.9.patch, which fixes sql.begin()/db.transaction()
 *     under max_pipeline: 0 (re-applied automatically via postinstall).
 *   - A single hung query (pooler hiccup, half-open TCP) used to occupy its
 *     connection until the OS TCP stack gave up (~10 min on macOS), and every
 *     later query queued behind it — one slow query wedged the whole pool.
 *   - keep_alive keeps NAT/pooler mappings alive and surfaces dead peers.
 *   - max_lifetime recycles connections every 15 minutes so no connection can
 *     rot for the pooler's whole lifetime.
 *
 * prepare:false — the Supabase TRANSACTION pooler (port 6543) does not
 * support server-side prepared statements; harmless on direct Postgres.
 *
 * statement_timeout note (VERIFIED, so future you doesn't trust dead config):
 * Supavisor DROPS startup-packet connection parameters — application_name
 * arrives as "Supavisor" and statement_timeout stays at the server default
 * (Supabase: 2 minutes), so the `connection` params below are a contract for
 * direct/session-mode connections only. The effective server-side backstop
 * through the transaction pooler is Supabase's own 2-minute statement_timeout.
 *
 * Dev note: Turbopack re-evaluates modules on hot reload. The globalThis
 * guard keeps ONE pool across edits — without it every save leaks another
 * 10-connection pool whose orphans occupy the remote connection budget.
 * (Because of this guard, connection changes need a full dev-server restart.)
 */
/** Pool size: 10 suits one long-lived dev/build process. Serverless hosts
 *  (Vercel) run many short-lived instances, each with its own pool — set
 *  DB_POOL_MAX=3..5 there to stay light on the pooler. Clamped to [1, 20]. */
function poolMax(): number {
  const parsed = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 20) : 10;
}

function createClient() {
  return postgres(getEnv().DATABASE_URL, {
    max: poolMax(),
    connect_timeout: 10,
    idle_timeout: 300,
    keep_alive: 60,
    max_lifetime: 900,
    prepare: false,
    // CRITICAL with the Supabase transaction pooler — see the header note.
    // Without this, any burst larger than the pool (admin dashboard: ~20
    // concurrent queries) pipelines onto busy sockets and wedges connections
    // permanently. Harmless on local/direct Postgres.
    max_pipeline: 0,
    connection: {
      application_name: "tripmate",
      // Server-side kill switches (milliseconds) — honored on direct /
      // session-mode connections; the transaction pooler drops them (see
      // note above) and falls back to Supabase's 2-minute default.
      statement_timeout: 25_000,
      idle_in_transaction_session_timeout: 25_000,
    },
  });
}

const globalForDb = globalThis as unknown as {
  __tripmatePgPool?: ReturnType<typeof createClient>;
};

const client = globalForDb.__tripmatePgPool ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__tripmatePgPool = client;
}

export const db = drizzle(client, { schema });

export type Database = typeof db;
