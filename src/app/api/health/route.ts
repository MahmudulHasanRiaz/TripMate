import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Unauthenticated health probe (Docker HEALTHCHECK / Portainer / uptime
 * monitors — see the Plan 7 Dockerfile). A plain SELECT 1 proves the app can
 * reach PostgreSQL and serve a query; anything else (pool exhausted, DB down,
 * network partition) is a 503 so orchestrators can act on it.
 *
 * GET route handlers are dynamic by default in Next 15+, so this is never
 * prerendered at build time — no DB access during `next build`.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: true }, { status: 200 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
