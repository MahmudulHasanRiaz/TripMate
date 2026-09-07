import { test, expect, type Page } from "@playwright/test";

// =============================================================================
// dashboard-settings.spec.ts — Plan 6 frontend e2e test suite:
//   1. Dashboard KPIs, orders by status strip, queues, and 30-day trend chart.
//   2. Settings page (Site tab prefill, searchEngineVisibility toggle saving,
//      and live verification of /robots.txt Disallow: / and its restoration).
//   3. Email templates page (6 templates listed, preview dialog renders subject
//      and sandboxed iframe).
// =============================================================================

const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";

test.setTimeout(60_000);
const wait = { timeout: 20_000 };

/**
 * Sign in as the seeded superadmin with fill-retry for hydration safety.
 */
async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await expect(async () => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await expect(page.getByLabel(/email/i)).toHaveValue(ADMIN_EMAIL, {
      timeout: 1_000,
    });
    await expect(page.getByLabel(/password/i)).toHaveValue(ADMIN_PASSWORD, {
      timeout: 1_000,
    });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, wait);
}

test.describe.serial("admin dashboard, settings, and email templates", () => {
  test("dashboard renders KPI cards, orders by status strip, queues, and 30-day trend", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Stable KPI card labels (database accumulates, so assert presence of stable metric labels)
    await expect(page.getByText("Leads Today")).toBeVisible();
    await expect(page.getByText("Pending Payments")).toBeVisible();
    await expect(page.getByText("Unassigned Leads")).toBeVisible();
    await expect(page.getByText("Total Revenue")).toBeVisible();
    await expect(page.getByText("Total Expenses")).toBeVisible();
    await expect(page.getByText("Net Profit")).toBeVisible();

    // Orders by status strip
    await expect(page.getByText("Orders by Status")).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();
    await expect(page.getByText("In Review", { exact: true })).toBeVisible();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();

    // Operational Queues section
    await expect(page.getByText("Payment Verification Queue")).toBeVisible();
    await expect(page.getByText("Expense Approval Queue")).toBeVisible();

    // 30-Day Trend Chart
    await expect(page.getByText("30-Day Activity & Revenue Trend")).toBeVisible();
    await expect(page.getByRole("button", { name: /data table/i })).toBeVisible();
  });

  test("settings loads with prefilled site title, toggling searchEngineVisibility updates /robots.txt", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Pre-filled site title input
    const titleInput = page.getByLabel("Site Title");
    await expect(titleInput).toBeVisible();
    const currentTitle = await titleInput.inputValue();
    expect(currentTitle.length).toBeGreaterThan(0);

    const phoneInput = page.getByLabel(/phone number/i);
    await phoneInput.fill("+8801000000000");
    const emailInput = page.getByLabel(/contact email/i);
    if (!(await emailInput.inputValue())) {
      await emailInput.fill("info@tripmate.example");
    }

    // Locate the searchEngineVisibility switch
    const visibilitySwitch = page.getByRole("switch", {
      name: /toggle search engine visibility/i,
    });
    await expect(visibilitySwitch).toBeVisible();

    // Ensure it starts checked or toggle to unchecked
    const initialChecked = (await visibilitySwitch.getAttribute("data-state")) === "checked";
    if (initialChecked) {
      await visibilitySwitch.click();
      await expect(visibilitySwitch).toHaveAttribute("data-state", "unchecked");
    }

    // Save site settings
    await page.getByRole("button", { name: /save site settings/i }).click();
    await expect(page.getByText("Site settings saved", { exact: true })).toBeVisible(wait);

    // Visit /robots.txt and verify whole-site Disallow: / appears
    await page.goto("/robots.txt");
    const robotsDisallowed = (await page.textContent("body")) ?? "";
    expect(robotsDisallowed).toMatch(/^Disallow:\s*\/\s*$/m);
    expect(robotsDisallowed).not.toContain("Allow: /");

    // Return to settings and toggle back ON (residue cleanup)
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    const switchBack = page.getByRole("switch", {
      name: /toggle search engine visibility/i,
    });
    await expect(switchBack).toHaveAttribute("data-state", "unchecked");
    await switchBack.click();
    await expect(switchBack).toHaveAttribute("data-state", "checked");

    await page.getByRole("button", { name: /save site settings/i }).click();
    await expect(page.getByText("Site settings saved", { exact: true })).toBeVisible(wait);

    // Visit /robots.txt and verify whole-site Disallow: / is removed and normal indexing restored
    await page.goto("/robots.txt");
    const robotsRestored = (await page.textContent("body")) ?? "";
    expect(robotsRestored).not.toMatch(/^Disallow:\s*\/\s*$/m);
    expect(robotsRestored).toContain("Allow: /");
    expect(robotsRestored).toContain("Disallow: /admin");
  });

  test("email templates page lists 6 templates and renders sandboxed preview", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.goto("/admin/email-templates");
    await expect(page.getByRole("heading", { name: "Email Templates" })).toBeVisible();

    // Governance header note
    await expect(
      page.getByText("Templates are code-owned — preview only."),
    ).toBeVisible();

    // Assert all 6 templates exist
    await expect(page.getByRole("heading", { name: "Lead received" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lead assigned" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Booking received" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quote ready" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment verified" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment could not be verified" })).toBeVisible();

    // Open preview dialog for the first template (lead-received)
    const previewButtons = page.getByRole("button", { name: /preview template/i });
    await expect(previewButtons.first()).toBeVisible();
    await previewButtons.first().click();

    // Verify dialog opens
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/subject:/i)).toBeVisible();

    // Subject line renders from the template output
    await expect(
      dialog.getByText(/we'll be in touch/i),
    ).toBeVisible(wait);

    // Verify iframe exists with strict sandbox attribute
    const iframe = dialog.locator("iframe");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("sandbox", "");
  });
});
