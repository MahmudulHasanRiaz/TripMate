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

export function hasPermission(
  role: UserRole,
  userPermissions: string[] | null,
  key: string,
): boolean {
  if (role === "superadmin") return true;
  if (userPermissions?.includes(key)) return true;
  return ROLE_PERMISSIONS[role]?.includes(key as Permission) ?? false;
}
