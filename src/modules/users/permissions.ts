export const PERMISSIONS = [
  "catalog.manage",
  "orders.manage",
  "orders.view",
  "leads.manage",
  "leads.view",
  "payments.verify",
  "payments.manage_gateways",
  "content.manage",
  "media.manage",
  "users.manage",
  "settings.manage",
  "tracking.view",
  "expenses.submit",
  "expenses.approve",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type UserRole = "superadmin" | "admin" | "staff" | "customer";

const STAFF: Permission[] = [
  "catalog.manage",
  "orders.manage",
  "orders.view",
  "leads.manage",
  "leads.view",
  "content.manage",
  "media.manage",
  "payments.verify",
  "expenses.submit",
];

const ADMIN: Permission[] = [
  ...STAFF,
  "payments.manage_gateways",
  "expenses.approve",
  "tracking.view",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [...PERMISSIONS],
  admin: ADMIN,
  staff: STAFF,
  customer: [],
};

/**
 * Roles that may open the /admin panel tree — the SAME list
 * app/admin/layout.tsx guards with. Every ENTRY POINT to the panel (the
 * public header's Admin link included) must derive its visibility from this
 * constant, never an inline array: inline lists drift and leak the panel to
 * customers on role renames.
 */
export const ADMIN_PANEL_ROLES = ["superadmin", "admin", "staff"] as const;

export function isAdminPanelRole(role: UserRole): boolean {
  return (ADMIN_PANEL_ROLES as readonly string[]).includes(role);
}

export function hasPermission(
  role: UserRole,
  userPermissions: string[] | null,
  key: string,
): boolean {
  if (role === "superadmin") return true;
  if (userPermissions?.includes(key)) return true;
  return ROLE_PERMISSIONS[role]?.includes(key as Permission) ?? false;
}
