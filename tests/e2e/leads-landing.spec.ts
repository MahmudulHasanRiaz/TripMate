import { test, expect, type Page, type Locator } from "@playwright/test";

// =============================================================================
// Leads + Landing Pages + Meta Tracking E2E Spec
//
// Flow:
//   1. Sign in as admin (admin@tripmate.test / supersecret123).
//   2. Navigate to /admin/landing-pages/new.
//      - Configure unique title and slug (/l/<slug>).
//      - Configure hero headline in right inspector.
//      - Publish the page.
//   3. Visit public landing page /l/<slug>.
//      - Verify hero and lead form are mounted.
//      - Submit valid lead with full name, phone number, and email.
//      - Verify inline success confirmation card.
//   4. Visit /admin/leads.
//      - Verify lead card appears in "New Inquiries" stage with campaign title.
//   5. Click into the lead detail page.
//      - Verify form data rows (name, phone, email).
//      - Change status to "contacted".
//      - Add an internal operator note.
//      - Verify activity timeline records both status change and note.
//   6. Visit /admin/tracking.
//      - Verify event log contains a "Lead" row with valid status.
//      - Assert presence by unique slug/labels, never exact global counts.
// =============================================================================

const ADMIN_EMAIL = "admin@tripmate.test";
const ADMIN_PASSWORD = "supersecret123";

test.setTimeout(90_000);
const wait = { timeout: 20_000 };

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

/** Sticky fill guarding against client hydration races */
async function stickyFill(locator: Locator, value: string) {
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

/** Pick a Radix Select option and ensure the trigger updates cleanly */
async function chooseSelect(
  page: Page,
  trigger: Locator,
  optionText: string | RegExp,
) {
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: optionText }).click();
    await expect(trigger).toContainText(optionText, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

test("leads and landing end-to-end flow: author, submit, triage lead, and verify tracking", async ({
  page,
}) => {
  const stamp = Date.now();
  const slug = `landing-e2e-${stamp}`;
  const title = `Luxury Umrah Retreat ${stamp}`;
  const heroHeadline = `Experience Spiritual Elegance ${stamp}`;
  const leadName = `Haji Tariq ${stamp}`;
  const leadPhone = "+880 1712 998877";
  const leadEmail = `tariq-${stamp}@example.test`;
  const internalNote = `Spoke on WhatsApp. Looking for 5-star hotel in Makkah (ref: ${stamp}).`;

  // Step 1: Sign in
  await test.step("sign in as admin", async () => {
    await signInAsAdmin(page);
  });

  // Step 2: Create and publish landing page
  await test.step("author and publish landing page", async () => {
    await page.goto("/admin/landing-pages/new");
    const titleInput = page.getByPlaceholder("Landing Page Title");
    await expect(titleInput).toBeVisible(wait);

    // Set page title
    await stickyFill(titleInput, title);

    // Open Page Settings and set unique slug
    await page.getByRole("button", { name: /page settings/i }).click();
    const slugInput = page.locator("#page-slug");
    await stickyFill(slugInput, slug);

    // Edit Hero Headline in inspector (Section #1 is Hero by default)
    const headlineInput = page
      .locator("label")
      .filter({ hasText: /^Headline$/ })
      .locator("..")
      .locator("input");
    await stickyFill(headlineInput, heroHeadline);

    // Publish page
    const publishBtn = page.getByRole("button", { name: /publish page/i });
    await publishBtn.click();

    // Verify successful save and URL transition to edit route
    await expect(page.getByText(/saved successfully as published/i)).toBeVisible(
      wait,
    );
    await page.waitForURL(/\/admin\/landing-pages\/[a-f0-9-]+\/edit/, wait);
  });

  // Step 3: Visit public landing page and submit lead
  await test.step("visit public landing page and submit lead form", async () => {
    await page.goto(`/l/${slug}`);

    // Verify hero section rendered
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      heroHeadline,
      wait,
    );

    // Fill lead form
    await stickyFill(page.getByPlaceholder(/e.g. Mahbubur Rahman/i), leadName);
    await stickyFill(page.getByPlaceholder(/\+880 1712 345678/i), leadPhone);
    await stickyFill(page.getByPlaceholder(/mahbub@example.com/i), leadEmail);

    // Submit inquiry
    const submitBtn = page.getByRole("button", { name: /submit inquiry/i });
    await submitBtn.click();

    // Verify inline confirmation card
    const confirmation = page.getByRole("status");
    await expect(confirmation).toBeVisible(wait);
    await expect(confirmation).toContainText(
      /thank you! we've received your inquiry/i,
    );
  });

  // Step 4: Visit admin leads board and verify new lead
  await test.step("verify lead appears on admin leads kanban board", async () => {
    await page.goto("/admin/leads");
    await expect(page.getByRole("heading", { name: /leads/i })).toBeVisible(wait);

    // Locate lead card link by traveler name
    const leadLink = page.getByRole("link", { name: leadName, exact: true });
    await expect(leadLink).toBeVisible(wait);

    // Card should also reference the landing page title
    const card = leadLink
      .locator("xpath=ancestor::div[contains(@class, 'rounded-lg border')]")
      .first();
    await expect(card).toContainText(title);

    // Navigate to lead detail
    await leadLink.click();
    await page.waitForURL(/\/admin\/leads\/[a-f0-9-]+/, wait);
  });

  // Step 5: Triage lead in detail view (verify data, change status, add note)
  await test.step("verify lead details, update status, and add operator note", async () => {
    // Verify submitted form fields card
    await expect(page.getByText(leadName).first()).toBeVisible(wait);
    await expect(page.getByText(leadPhone).first()).toBeVisible();
    await expect(page.getByText(leadEmail).first()).toBeVisible();

    // Change status from 'new' to 'contacted'
    const statusSelect = page
      .locator("label:has-text('Pipeline Status')")
      .locator("..")
      .getByRole("combobox");
    await chooseSelect(page, statusSelect, /contacted/i);

    // Add internal operator note
    const noteField = page.getByPlaceholder(/internal discussions|requirements/i);
    await stickyFill(noteField, internalNote);
    const saveNoteBtn = page.getByRole("button", { name: /save internal note/i });
    await saveNoteBtn.click();
    await expect(page.getByText(/note saved/i)).toBeVisible(wait);

    // Verify timeline captures both the status transition and the note
    await expect(page.getByText(/status changed to contacted/i)).toBeVisible(wait);
    await expect(page.getByText(internalNote).first()).toBeVisible(wait);
  });

  // Step 6: Visit Meta tracking admin and verify Lead CAPI event
  await test.step("verify meta tracking event logged", async () => {
    await page.goto("/admin/tracking");
    await expect(page.getByRole("heading", { name: /tracking|capi/i })).toBeVisible(
      wait,
    );

    // Event log should contain a Lead row for this landing URL
    const leadRow = page.locator("tbody tr").filter({ hasText: "Lead" }).first();
    await expect(leadRow).toBeVisible(wait);

    // CAPI status badge records sent, error, pending, or meta_not_configured
    await expect(leadRow).toContainText(
      /sent|error|pending|meta_not_configured/i,
      wait,
    );

    // Source URL should record this landing page's slug
    await expect(leadRow).toContainText(slug);
  });
});
