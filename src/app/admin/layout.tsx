import type { Metadata } from "next";
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import { requireRole } from "@/lib/auth-helpers";
import { menuForRole } from "@/lib/admin-menu";
import { cn } from "@/lib/utils";
import AdminShell from "./AdminShell";
import "./admin.css";

/**
 * Admin v3 typography (spec: docs/superpowers/specs/2026-10-18-admin-redesign-design.md):
 * Geist for UI, Geist Mono for numerals, Hind Siliguri for Bengali glyphs.
 * Loaded from THIS layout so the public site never fetches these families.
 */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hind",
  display: "swap",
});

/** Admin is never indexed (§2.2): always noindex, nofollow. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Session-gated admin shell: the whole subtree depends on the request's
 * session cookie, so there is no meaningful static shell to prerender. Opt
 * the subtree out of Cache Components' static-shell prerendering (PPR) — under
 * `cacheComponents` this is the documented replacement for the old
 * `dynamic = "force-dynamic"`.
 */
export const instant = false;

/**
 * Server-gated admin shell. No customer ever sees this tree rendered:
 *   - anonymous   -> /login  (requireSession)
 *   - customer    -> /       (requireRole)
 *   - staff/admin/superadmin -> the shell below
 *
 * The menu handed to AdminShell is ALREADY permission-filtered here on the
 * server; the client shell renders exactly what it receives and performs no
 * permission logic of its own.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("superadmin", "admin", "staff");

  return (
    <div
      className={cn(
        geist.variable,
        geistMono.variable,
        hindSiliguri.variable,
        "admin-root",
      )}
    >
      <AdminShell
        menu={menuForRole(session.user.role)}
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
      >
        {children}
      </AdminShell>
    </div>
  );
}
