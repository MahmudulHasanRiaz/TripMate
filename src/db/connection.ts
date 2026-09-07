import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

const client = postgres(getEnv().DATABASE_URL, {
  max: 10,
  // Runtime on Vercel uses the Supabase TRANSACTION pooler (port 6543), which
  // does not support server-side prepared statements. prepare:false disables
  // them so the pooler can route each statement to any backend; it is harmless
  // on direct Postgres (local dev, CI) and on the session pooler.
  prepare: false,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
