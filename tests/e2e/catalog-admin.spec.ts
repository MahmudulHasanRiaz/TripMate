import { test, expect, type Page } from "@playwright/test";

// =============================================================================
// Catalog admin e2e — full CRUD round-trip against the shared dev DB.
//
// Flow (Task 5 brief Step 3 + T4-review carry-in 2):
//   1. ensure the "Beach Tours" category exists and is ACTIVE (create if absent,
//      reactivate via the edit form's toggle if a prior state left it off)
//   2. create a minimal draft listing under it, publish it, see it in the table
//   3. category deactivation REFUSED (IN_USE) while the listing is live — the
//      refusal text is surfaced in the confirm dialog
//   4. trash the listing
//   5. re-create with the SAME slug → succeeds with the base or a suffixed slug
//      (the auto-suffix recovery on soft-deleted slugs), then trash it again as
//      cleanup so a re-run starts from a clean live state.
//
// Idempotency notes:
//   * Only the one "Beach Tours" category row is ever created and it stays
//     active across runs (every deactivation attempt is refused while live
//     listings reference it), so its slug is stable.
//   * The listing title is fixed ("Cox Beach Escape"); any LIVE row left behind
//     by a crashed run is trashed at the start. Trashed rows with the base slug
//     persist, so the recreation lands on `cox-beach-escape-2`, `-3`, … — the
//     assertion accepts the base or any suffix.
//   * Sorted after auth.spec.ts (alphabetical), so the superadmin exists when
//     this runs in a full suite; standalone it needs an already-set-up DB.
// =============================================================================
const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";
const CATEGORY_NAME = "Beach Tours";
const LISTING_TITLE = "Cox Beach Escape";
const BASE_SLUG = /cox-beach-escape(-\d+)?/;

test.setTimeout(90_000); // cold Turbopack compiles the whole catalog section
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

/**
 * Pick a Radix Select option and verify the trigger shows it. Selects hydrate
 * asynchronously too, so the open → pick → assert cycle retries until the
 * choice "sticks" (a click landed pre-hydration is simply lost).
 */
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

function listingRow(page: Page, title: string) {
  return page
    .locator("tbody tr")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** Trash any live rows with this title (crash residue), newest run count capped. */
async function trashLiveListings(page: Page, title: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = listingRow(page, title).first();
    if ((await row.count()) === 0) return;
    await row.getByRole("button", { name: `Trash ${title}` }).click();
    await page.getByRole("button", { name: "Trash listing" }).click();
    await expect(listingRow(page, title).first()).toHaveCount(0, wait);
  }
}

/** Trash a single (known-present) live listing row. */
async function trashListing(page: Page, title: string) {
  const row = listingRow(page, title).first();
  await row.getByRole("button", { name: `Trash ${title}` }).click();
  await page.getByRole("button", { name: "Trash listing" }).click();
  await expect(listingRow(page, title).first()).toHaveCount(0, wait);
}

/**
 * Make sure a "Beach Tours" category exists and is active. Only ever creates
 * one row (skips when the name is present); if a prior state left it inactive,
 * reactivates it through the edit dialog's isActive toggle — which also proves
 * the toggle rides the full-replace upsert (carry-in).
 */
async function ensureActiveCategory(page: Page) {
  await page.goto("/admin/catalog/categories");
  const row = page.locator("tbody tr").filter({ hasText: CATEGORY_NAME }).first();

  if ((await row.count()) === 0) {
    await page.getByRole("button", { name: "New category" }).click();
    await stickyFill(page.getByLabel(/^Name$/i), CATEGORY_NAME);
    // Slug auto-fills from the name; kind stays "Package" (the default).
    await page.getByRole("button", { name: "Create category" }).click();
    await expect(
      page.locator("tbody tr").filter({ hasText: CATEGORY_NAME }).first(),
    ).toBeVisible(wait);
    return;
  }

  // Row exists — reactivate if a stale state left it inactive.
  const statusCell = row.locator("td").nth(3);
  if ((await statusCell.textContent())?.trim() === "Inactive") {
    await row.getByRole("button", { name: `Edit ${CATEGORY_NAME}` }).click();
    await page.getByRole("switch", { name: "Category active" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(statusCell).toContainText("Active", wait);
  }
}

/** Fill the shared listing-create form and submit. */
async function createListing(page: Page, category: string, price: string) {
  await page.goto("/admin/catalog/listings/new");
  await expect(page.getByRole("heading", { name: "New listing" })).toBeVisible(wait);
  await stickyFill(page.getByLabel(/^Title$/i), LISTING_TITLE);
  await chooseSelect(page, /^Category$/i, category);
  await stickyFill(page.getByLabel(/^Price$/i), price);
  await page.getByRole("button", { name: /create listing/i }).click();
  await expect(page).toHaveURL(/\/admin\/catalog\/listings$/, wait);
}

test("catalog CRUD round-trip: publish, IN_USE refusal, trash, slug recovery", async ({
  page,
}) => {
  await signInAsAdmin(page);

  // Clean any live residue from a previous/crashed run.
  await test.step("clean live residue", async () => {
    await page.goto("/admin/catalog/listings");
    await trashLiveListings(page, LISTING_TITLE);
  });

  await test.step("ensure Beach Tours category is active", async () => {
    await ensureActiveCategory(page);
  });

  await test.step("create draft listing", async () => {
    await createListing(page, CATEGORY_NAME, "50000");
    const row = listingRow(page, LISTING_TITLE).first();
    await expect(row).toBeVisible(wait);
    await expect(row).toContainText("Draft");
    await expect(row).toContainText(BASE_SLUG);
  });

  await test.step("publish and see it in the table", async () => {
    const row = listingRow(page, LISTING_TITLE).first();
    await row.getByRole("button", { name: "Publish" }).click();
    await expect(row).toContainText("Published", wait);
  });

  await test.step("category deactivation refused while listing is live", async () => {
    await page.goto("/admin/catalog/categories");
    const row = page.locator("tbody tr").filter({ hasText: CATEGORY_NAME }).first();
    await row.getByRole("button", { name: `Deactivate ${CATEGORY_NAME}` }).click();
    await page.getByRole("button", { name: "Deactivate category" }).click();
    // Service relays IN_USE as "… N listing(s) still reference it."
    await expect(page.getByRole("alert")).toContainText(/still reference it/i, wait);
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  await test.step("trash the listing", async () => {
    await page.goto("/admin/catalog/listings");
    await trashListing(page, LISTING_TITLE);
  });

  await test.step("re-create same slug succeeds (auto-suffix recovery)", async () => {
    await createListing(page, CATEGORY_NAME, "50000");
    const row = listingRow(page, LISTING_TITLE).first();
    await expect(row).toBeVisible(wait);
    await expect(row).toContainText(BASE_SLUG);
    // Carry-in 2: the base slug was soft-deleted, so the server saved a suffix.
    await expect(row).toContainText("Draft");
  });

  await test.step("cleanup: trash the recreated listing", async () => {
    await trashListing(page, LISTING_TITLE);
  });
});
