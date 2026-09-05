/**
 * Better Auth browser client.
 *
 * CLIENT-SAFE ONLY. Import this module exclusively from "use client"
 * components — never from Server Components, server actions, or any module
 * that carries `import "server-only"`. It resolves its base URL against
 * `window.location.origin` at call time (falling back to a same-origin
 * `/api/auth` path), so it is meaningless outside the browser.
 *
 * Endpoints live behind the route handler at `/api/auth/[...all]`; without
 * that handler every sign-in/sign-out/session call 404s.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
