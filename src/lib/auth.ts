import "server-only";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  // Our tables use uuid PKs with DB-side gen_random_uuid() defaults. Tell
  // better-auth to leave id generation to the database (on Postgres it then
  // omits id on insert and reads it back via RETURNING) instead of writing its
  // default nanoid into a uuid column.
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  // The admin() plugin hooks user creation and inserts ITS OWN default role
  // ('user' unless told otherwise) — which is not a value of our user_role
  // enum. Both the plugin's default and the column default must be 'customer'.
  plugins: [admin({ defaultRole: "customer" })],
  user: {
    // Map better-auth's core `image` field onto our existing avatar_url column.
    fields: {
      image: "avatarUrl",
    },
    additionalFields: {
      // Server-controlled: never client-writable at signup.
      role: { type: "string", defaultValue: "customer", input: false },
      phone: { type: "string", required: false, input: false },
    },
  },
  session: {
    // 30-day sessions.
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 60 },
  },
});
