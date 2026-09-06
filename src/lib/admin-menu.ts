import { hasPermission, type Permission, type UserRole } from "@/modules/users/permissions";

/**
 * Permission-scoped navigation model for the /admin shell.
 *
 * Each entry couples a route + label + lucide icon NAME (a string) to the
 * permission that gates it. The string icon is mapped to a real component by
 * AdminShell's lookup object — keeping icon identities out of the server side
 * lets the menu stay a plain-data module shared by the (server) layout filter
 * and the (client) shell render.
 *
 * Several hrefs point at modules built in later plans (3–6); clicking them 404s
 * until those land, which the shell treats as acceptable for now. Only the
 * dashboard route is implemented in this plan.
 */
export type AdminMenuItem = {
  href: string;
  label: string;
  icon: string;
  permission: Permission;
};

export const ADMIN_MENU: AdminMenuItem[] = [
  { href: "/admin", label: "Dashboard", icon: "layout-dashboard", permission: "orders.view" },
  { href: "/admin/leads", label: "Leads", icon: "mail", permission: "leads.view" },
  { href: "/admin/orders", label: "Orders", icon: "book-copy", permission: "orders.view" },
  { href: "/admin/payments", label: "Payments", icon: "banknote", permission: "payments.verify" },
  { href: "/admin/expenses", label: "Expenses", icon: "receipt", permission: "expenses.submit" },
  { href: "/admin/catalog", label: "Catalog", icon: "package", permission: "catalog.manage" },
  { href: "/admin/content", label: "Content", icon: "file-text", permission: "content.manage" },
  { href: "/admin/landing-pages", label: "Landing Pages", icon: "megaphone", permission: "content.manage" },
  { href: "/admin/media", label: "Media", icon: "image", permission: "media.manage" },
  { href: "/admin/users", label: "Users", icon: "users", permission: "users.manage" },
  { href: "/admin/tracking", label: "Tracking", icon: "activity", permission: "tracking.view" },
  { href: "/admin/settings", label: "Settings", icon: "settings", permission: "settings.manage" },
];

/** The subset of ADMIN_MENU a role is allowed to see. Superadmin short-circuits. */
export function menuForRole(role: UserRole) {
  return ADMIN_MENU.filter((item) => hasPermission(role, null, item.permission));
}
