import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

const client = postgres(getEnv().DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });

export type Database = typeof db;
