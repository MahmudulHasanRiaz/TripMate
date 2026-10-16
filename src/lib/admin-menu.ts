import { hasPermission, type Permission, type UserRole } from "@/modules/users/permissions";

/**
 * Permission-scoped navigation model for the /admin shell.
 *
 * Each entry couples a route + label + lucide icon NAME (a string) to the
 * permission that gates it and a navigation group per spec §50.
 * The string icon is mapped to a real component by AdminShell's lookup
 * object — keeping icon identities out of the server side lets the menu stay
 * a plain-data module shared by the (server) layout filter and the (client) shell render.
 */
export type AdminMenuItem = {
  href: string;
  label: string;
  icon: string;
  permission: Permission;
  group: string;
};

export const ADMIN_MENU: AdminMenuItem[] = [
  // Overview
  { href: "/admin", label: "Dashboard", icon: "layout-dashboard", permission: "orders.view", group: "Overview" },

  // Sales
  { href: "/admin/leads", label: "Leads", icon: "mail", permission: "leads.view", group: "Sales" },
  { href: "/admin/quotations", label: "Quotations", icon: "file-spreadsheet", permission: "orders.view", group: "Sales" },
  { href: "/admin/orders", label: "Orders", icon: "book-copy", permission: "orders.view", group: "Sales" },
  { href: "/admin/services", label: "Services", icon: "briefcase", permission: "orders.view", group: "Sales" },

  // Customers
  { href: "/admin/users", label: "Users & Customers", icon: "users", permission: "users.manage", group: "Customers" },

  // Products
  { href: "/admin/catalog", label: "Catalog", icon: "package", permission: "catalog.manage", group: "Products" },

  // Content
  { href: "/admin/content", label: "Content", icon: "file-text", permission: "content.manage", group: "Content" },
  { href: "/admin/landing-pages", label: "Landing Pages", icon: "megaphone", permission: "content.manage", group: "Content" },
  { href: "/admin/media", label: "Media Library", icon: "image", permission: "media.manage", group: "Content" },

  // Finance
  { href: "/admin/payments", label: "Payments", icon: "banknote", permission: "payments.verify", group: "Finance" },
  { href: "/admin/expenses", label: "Expenses", icon: "receipt", permission: "expenses.submit", group: "Finance" },

  // Settings & Operations
  { href: "/admin/tracking", label: "Analytics & Tracking", icon: "activity", permission: "tracking.view", group: "Settings" },
  { href: "/admin/settings", label: "Settings", icon: "settings", permission: "settings.manage", group: "Settings" },
  { href: "/admin/reset", label: "Reset & Re-initialize", icon: "trash-2", permission: "settings.manage", group: "Settings" },
  { href: "/admin/email-templates", label: "Email Templates", icon: "mail-open", permission: "settings.manage", group: "Settings" },
];

/** The subset of ADMIN_MENU a role is allowed to see. Superadmin short-circuits. */
export function menuForRole(role: UserRole) {
  return ADMIN_MENU.filter((item) => hasPermission(role, null, item.permission));
}
