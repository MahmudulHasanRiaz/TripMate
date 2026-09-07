import { describe, it, expect } from "vitest";
import { ADMIN_MENU, menuForRole } from "@/lib/admin-menu";

describe("admin menu & spec §50 grouping", () => {
  const SPEC_50_GROUPS = [
    "Overview",
    "Sales",
    "Customers",
    "Products",
    "Content",
    "Finance",
    "Settings",
  ];

  it("contains all required operational routes with valid spec §50 groups", () => {
    expect(ADMIN_MENU.length).toBeGreaterThanOrEqual(14);

    for (const item of ADMIN_MENU) {
      expect(item.href).toMatch(/^\/admin(\/[a-z0-9-]+)*$/);
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.icon.trim().length).toBeGreaterThan(0);
      expect(SPEC_50_GROUPS).toContain(item.group);
    }
  });

  it("has no duplicated routes", () => {
    const hrefs = ADMIN_MENU.map((item) => item.href);
    const uniqueHrefs = new Set(hrefs);
    expect(uniqueHrefs.size).toBe(hrefs.length);
  });

  it("includes quotations and users routes", () => {
    const quotations = ADMIN_MENU.find((item) => item.href === "/admin/quotations");
    expect(quotations).toBeDefined();
    expect(quotations?.group).toBe("Sales");

    const users = ADMIN_MENU.find((item) => item.href === "/admin/users");
    expect(users).toBeDefined();
    expect(users?.group).toBe("Customers");
  });

  it("correctly filters items for staff role", () => {
    const staffMenu = menuForRole("staff");
    const staffHrefs = staffMenu.map((item) => item.href);

    // Staff should have sales and catalog
    expect(staffHrefs).toContain("/admin/leads");
    expect(staffHrefs).toContain("/admin/orders");
    expect(staffHrefs).toContain("/admin/catalog");

    // Staff should NOT have access to user management or system settings
    expect(staffHrefs).not.toContain("/admin/users");
    expect(staffHrefs).not.toContain("/admin/settings");
    expect(staffHrefs).not.toContain("/admin/email-templates");
  });

  it("superadmin has access to every menu item", () => {
    const superadminMenu = menuForRole("superadmin");
    expect(superadminMenu.length).toBe(ADMIN_MENU.length);
  });
});
