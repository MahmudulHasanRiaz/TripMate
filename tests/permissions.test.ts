import { describe, it, expect } from "vitest";
import { hasPermission, PERMISSIONS } from "@/modules/users/permissions";

describe("permissions", () => {
  it("superadmin has every permission", () => {
    for (const p of PERMISSIONS) {
      expect(hasPermission("superadmin", null, p)).toBe(true);
    }
  });

  it("admin has all except users.manage and settings.manage", () => {
    expect(hasPermission("admin", null, "leads.manage")).toBe(true);
    expect(hasPermission("admin", null, "users.manage")).toBe(false);
    expect(hasPermission("admin", null, "settings.manage")).toBe(false);
  });

  it("staff has operational permissions only", () => {
    expect(hasPermission("staff", null, "leads.manage")).toBe(true);
    expect(hasPermission("staff", null, "catalog.manage")).toBe(true);
    expect(hasPermission("staff", null, "payments.verify")).toBe(true);
    expect(hasPermission("staff", null, "expenses.submit")).toBe(true);
    expect(hasPermission("staff", null, "users.manage")).toBe(false);
    expect(hasPermission("staff", null, "payments.manage_gateways")).toBe(false);
  });

  it("customer has none", () => {
    expect(hasPermission("customer", null, "leads.manage")).toBe(false);
  });

  it("user permission overrides grant beyond role", () => {
    expect(hasPermission("staff", ["users.manage"], "users.manage")).toBe(true);
  });
});
