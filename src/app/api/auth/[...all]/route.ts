import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * Better Auth HTTP API — mounted at /api/auth/*.
 *
 * The browser client (src/lib/auth-client.ts) POSTs/GETs these endpoints for
 * every sign-in, sign-out and session read, so this handler is the backbone of
 * the live credential round-trip. Without it the auth pages have no backend to
 * call. Better Auth 1.x expects the catch-all (not optional catch-all) shape so
 * the root /api/auth metadata endpoint is intentionally absent — the client
 * never calls it.
 */
export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);
