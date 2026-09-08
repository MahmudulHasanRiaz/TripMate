import { expect, test } from "@playwright/test";

// =============================================================================
// Services + blog + dynamic pages e2e (Plan 3 Task 12) against a SEEDED dev DB.
//
// Ordering note: this file sorts AFTER content-admin.spec.ts (which creates,
// publishes and TRASHES its "Test Explorer Notes" post), so by the time these
// tests run no LIVE published post exists — the /blog empty-state assertion
// below depends on that. If a crashed content-admin run ever leaves a live
// post behind, its own "clean live post residue" step re-trashes it on the
// next full run.
// =============================================================================

const SERVICE_GRID = '[data-testid="service-listing-grid"]';

test("/services/tour-packages lists the category's published package cards", async ({
  page,
}) => {
  await page.goto("/services/tour-packages");

  await expect(
    page.getByRole("heading", { level: 1, name: "Tour Packages" }),
  ).toBeVisible();

  // Seed: the tour-packages category owns the Malaysia & Singapore 7-Day
  // Family Escape listing. Assert >= 1 card (residue tolerance) and the seeded
  // card present.
  const grid = page.locator(SERVICE_GRID);
  await expect(grid).toBeVisible();
  const card = grid.locator("a").first();
  await expect(card).toBeVisible();
  await expect(
    grid.filter({ hasText: "Malaysia & Singapore 7-Day Family Escape" }),
  ).toBeVisible();
});

test("/services/flights (redirect-based) shows the redirect CTA", async ({
  page,
}) => {
  await page.goto("/services/flights");

  await expect(
    page.getByRole("heading", { level: 1, name: "Flight Tickets" }),
  ).toBeVisible();

  // The redirect service shows a link to the external flight booking portal.
  const main = page.getByRole("main");
  await expect(
    main.getByRole("link", { name: /visit partner/i }),
  ).toBeVisible();
});

test("/blog shows seeded published posts in the grid", async ({ page }) => {
  await page.goto("/blog");

  await expect(
    page.getByRole("heading", { level: 1, name: "Stories from the road" }),
  ).toBeVisible();
  // The demo seed creates published posts — verify the grid renders them.
  const grid = page.locator('[data-testid="blog-grid"]');
  await expect(grid).toBeVisible();
  await expect(grid.locator("a").first()).toBeVisible();
});

test("/p/about-us renders the seeded markdown", async ({ page }) => {
  await page.goto("/p/about-us");

  await expect(page.getByRole("heading", { level: 1, name: "About Us" })).toBeVisible();
  await expect(page.getByText(/Dhaka-based travel agency/i)).toBeVisible();
  // A later seeded section's copy is reachable too (markdown rendered as prose).
  await expect(page.getByText(/guided thousands of Bangladeshi pilgrims/i)).toBeVisible();
});

test("/p/faq renders the seeded Q&A as an accordion", async ({ page }) => {
  await page.goto("/p/faq");

  await expect(
    page.getByRole("heading", { level: 1, name: "Frequently Asked Questions" }),
  ).toBeVisible();

  // Each seeded FAQ section is `## Question` + a plain answer, so the server
  // parses it into FaqAccordion items. Assert one trigger is present and that
  // opening it reveals its answer (radix single-open).
  const firstQuestion = page.getByRole("button", {
    name: /How do I book a Hajj or Umrah package/i,
  });
  await expect(firstQuestion).toBeVisible();
  await expect(firstQuestion).toHaveAttribute("aria-expanded", "false");
  await firstQuestion.click();
  await expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText(/Reach us by phone, WhatsApp or the contact form/i),
  ).toBeVisible();
});

test("unknown service slug returns the site 404", async ({ page }) => {
  await page.goto("/services/definitely-not-a-real-service");

  await expect(page.getByText(/wandered off/i)).toBeVisible();
});
