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
  trustedOrigins: async (request) => {
    const origin = request?.headers?.get("origin");
    // Tunnel fix (mobile session fetch): better-auth rejects cross-origin
    // session calls unless the origin is trusted. The tunnel domain
    // (https://mac.riaz.com.bd -> localhost:3000) is a different origin from
    // APP_URL, so mobile session reads failed and — before the header
    // isolation fix — took the whole header down with them. APP_URL's own
    // origin + ALLOWED_DEV_ORIGINS are always trusted; the request origin
    // echo below stays as a dev convenience.
    const allowed = [
      "http://localhost:3000",
      "http://localhost:8080",
      "https://mac.riaz.com.bd",
      "https://*.riaz.com.bd",
      "https://*.run.app",
      "https://*.google.com",
    ];
    const fromEnv =
      process.env.ALLOWED_DEV_ORIGINS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    try {
      const raw = process.env.APP_URL?.trim();
      if (raw) {
        const url = new URL(raw);
        if (url.origin) fromEnv.push(url.origin);
      }
    } catch {
      // Invalid APP_URL is reported by src/lib/env.ts validation — ignore here.
    }
    if (origin) {
      return [...allowed, ...fromEnv, origin];
    }
    return [...allowed, ...fromEnv];
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      partitioned: process.env.NODE_ENV === "production",
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
