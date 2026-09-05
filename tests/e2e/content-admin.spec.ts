import { test, expect, type Page } from "@playwright/test";

// =============================================================================
// Content admin e2e — create+publish a post, edit a seeded page, trash the post.
//
// Flow (Task 8 brief):
//   1. create a post titled "Test Explorer Notes" under the seeded "Travel Tips"
//      post category (default draft)
//   2. publish it from the posts table and see the Published badge
//   3. edit the seeded About Us page's first markdown section (append a marker
//      line) and save — proves the page write + cache invalidation is wired
//   4. trash the test post and see the row disappear
//
// Idempotency notes:
//   * Any LIVE "Test Explorer Notes" row left by a crashed run is trashed at
//     the start, mirroring catalog-admin.
//   * Trashed rows with the base slug persist, so a later run's re-create lands
//     on `test-explorer-notes-2`, `-3`, … — the assertion accepts base or suffix.
//   * The About Us marker line is appended ONCE (skipped when already present),
//     then saved every run, so the page stays tidy and re-runs still exercise
//     the save action.
//   * Sorted after catalog-admin.spec.ts (alphabetical), so the superadmin
//     exists when this runs in a full suite; standalone it needs an already
//     set-up DB.
// =============================================================================
const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";
const POST_TITLE = "Test Explorer Notes";
const POST_CATEGORY = "Travel Tips";
const PAGE_TITLE = "About Us";
const PAGE_MARKER = "\n\n*Site content verified by the content-admin e2e (Playwright).*";
const BASE_SLUG = /test-explorer-notes(-\d+)?/;

test.setTimeout(90_000); // cold Turbopack compiles the whole content section
const wait = { timeout: 20_000 };

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await expect(async () => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await expect(page.getByLabel(/email/i)).toHaveValue(ADMIN_EMAIL, { timeout: 1_000 });
    await expect(page.getByLabel(/password/i)).toHaveValue(ADMIN_PASSWORD, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/, wait);
}

/** Fill guarding the hydration race: values typed pre-hydration get wiped. */
async function stickyFill(locator: import("@playwright/test").Locator, value: string) {
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

/** Pick a Radix Select option and verify the trigger shows it (hydration-safe). */
async function chooseSelect(
  page: Page,
  triggerName: RegExp,
  optionText: string,
) {
  const trigger = page.getByRole("combobox", { name: triggerName });
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: optionText, exact: true }).click();
    await expect(trigger).toContainText(optionText, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

function postRow(page: Page, title: string) {
  return page
    .locator("tbody tr")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** Trash any live rows with this title (crash residue), newest run count capped. */
async function trashLivePosts(page: Page, title: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = postRow(page, title).first();
    if ((await row.count()) === 0) return;
    await row.getByRole("button", { name: `Trash ${title}` }).click();
    await page.getByRole("button", { name: "Trash post" }).click();
    await expect(postRow(page, title).first()).toHaveCount(0, wait);
  }
}

test("content CRUD: create+publish a post, edit a seeded page, trash the post", async ({
  page,
}) => {
  await signInAsAdmin(page);

  // Clean any live residue from a previous/crashed run.
  await test.step("clean live post residue", async () => {
    await page.goto("/admin/content/posts");
    await trashLivePosts(page, POST_TITLE);
  });

  await test.step("create a draft post under Travel Tips", async () => {
    await page.goto("/admin/content/posts/new");
    await expect(page.getByRole("heading", { name: "New post" })).toBeVisible(wait);
    await stickyFill(page.getByLabel(/^Title$/i), POST_TITLE);
    await chooseSelect(page, /^Category$/i, POST_CATEGORY);
    await page.getByRole("button", { name: /create post/i }).click();
    await expect(page).toHaveURL(/\/admin\/content\/posts$/, wait);
    const row = postRow(page, POST_TITLE).first();
    await expect(row).toBeVisible(wait);
    await expect(row).toContainText("Travel Tips");
    await expect(row).toContainText("Draft");
    await expect(row).toContainText(BASE_SLUG);
  });

  await test.step("publish and see the Published badge in the table", async () => {
    const row = postRow(page, POST_TITLE).first();
    await row.getByRole("button", { name: "Publish" }).click();
    await expect(row).toContainText("Published", wait);
  });

  await test.step("edit the seeded About Us page markdown and save", async () => {
    await page.goto("/admin/content/pages");
    const aboutLink = page.getByRole("link", { name: PAGE_TITLE, exact: true });
    await expect(aboutLink).toBeVisible(wait);
    await aboutLink.click();
    await expect(page.getByRole("heading", { name: "Edit page" })).toBeVisible(wait);

    const firstSection = page.getByLabel(/^Section 1$/i);
    await expect(firstSection).toBeVisible(wait);
    const current = await firstSection.inputValue();
    if (!current.includes(PAGE_MARKER)) {
      await stickyFill(firstSection, `${current}${PAGE_MARKER}`);
    }
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/admin\/content\/pages$/, wait);
    await expect(page.getByRole("link", { name: PAGE_TITLE, exact: true })).toBeVisible(wait);

    // Re-open the page and confirm the save persisted server-side.
    await page.getByRole("link", { name: PAGE_TITLE, exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit page" })).toBeVisible(wait);
    await expect(async () => {
      const reopened = await page.getByLabel(/^Section 1$/i).inputValue();
      expect(reopened).toContain(PAGE_MARKER);
    }).toPass({ timeout: 15_000 });
  });

  await test.step("trash the test post", async () => {
    await page.goto("/admin/content/posts");
    const row = postRow(page, POST_TITLE).first();
    await expect(row).toBeVisible(wait);
    await row.getByRole("button", { name: `Trash ${POST_TITLE}` }).click();
    await page.getByRole("button", { name: "Trash post" }).click();
    await expect(postRow(page, POST_TITLE).first()).toHaveCount(0, wait);
  });
});
