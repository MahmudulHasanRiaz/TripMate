import "server-only";
import { db } from "./client";
import {
  expenseCategories,
  paymentGateways,
  serviceCategories,
  settings,
} from "./schema";
import { seedStaticContent } from "@/modules/content/seed-static-pages";
import { sql } from "drizzle-orm";
import { DEFAULT_THEME_SETTINGS } from "@/modules/settings/theme";

/**
 * Production Baseline Seeder.
 *
 * Runs ONLY necessary baseline configuration:
 *  - Core site & theme settings
 *  - Operational & Cost-of-Sales expense taxonomy
 *  - Legal static pages (Terms, Privacy, About, FAQ)
 *
 * HARD REQUIREMENT:
 * Production initialization does NOT seed demo catalog, packages,
 * destinations, or dummy media. Agency operators start with a clean
 * slate to configure their live products.
 */
export async function seedProductionBaseline() {
  // 1. Settings baseline
  const existingSettings = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(settings)
    .where(sql`key = 'site'`);

  if (existingSettings[0]?.count === 0) {
    await db.insert(settings).values([
      {
        key: "site",
        value: {
          title: "TripMate",
          logoUrl: "",
          faviconUrl: "",
          searchEngineVisibility: true,
          phone: "+880 1700-000000",
          email: "info@tripmate.com",
          address: "Dhaka, Bangladesh",
          footerDescription: "Premium travel solutions, spiritual journeys, and visa services.",
        },
      },
      {
        key: "home",
        value: {
          heroHeadline: "Travel better. We'll handle the rest.",
          heroSub: "Hajj, Umrah, curated holiday packages, flight bookings and visa processing — handled end to end with personalized care.",
          heroButtonLabel: "Explore Packages",
          heroButtonLink: "/packages",
          heroImage: null,
          heroImageAlt: "TripMate Travel",
        },
      },
      {
        key: "theme",
        value: DEFAULT_THEME_SETTINGS,
      },
      {
        key: "storage",
        value: { driver: process.env.STORAGE_DRIVER === "r2" ? "r2" : "local" },
      },
    ]);
  }

  // 2. Core expense taxonomy
  const existingExpenses = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenseCategories);

  if (existingExpenses[0]?.count === 0) {
    await db.insert(expenseCategories).values([
      { name: "Office & Utilities", kind: "operational", description: "Office rent, power, high-speed internet, supplies" },
      { name: "Marketing & Advertising", kind: "operational", description: "Meta CAPI ad campaigns, search ads, offline banners" },
      { name: "Payroll & Commissions", kind: "operational", description: "Staff salaries, tour guide stipends, sales commissions" },
      { name: "Aviation & Air Tickets", kind: "cost_of_sales", description: "Direct GDS / partner airline ticket issuance costs" },
      { name: "Hotel & Accommodations", kind: "cost_of_sales", description: "Makkah/Madinah & international hotel reservations" },
      { name: "Visa & Government Fees", kind: "cost_of_sales", description: "Consulate, embassy, and official visa processing fees" },
      { name: "Ground Transport & Logistics", kind: "cost_of_sales", description: "Chauffeur, private bus transfers, airport pickups" },
    ]);
  }

  // 3. Static policy pages
  await seedStaticContent(db);

  // 4. Core Service Taxonomy (clean empty categories for operational readiness)
  const existingCats = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceCategories);

  if (existingCats[0]?.count === 0) {
    await db.insert(serviceCategories).values([
      { name: "Tour Packages", slug: "tour-packages", kind: "package", sortOrder: 1, icon: "compass" },
      { name: "Hajj", slug: "hajj", kind: "package", sortOrder: 2, icon: "moon-star" },
      { name: "Umrah", slug: "umrah", kind: "package", sortOrder: 3, icon: "moon" },
      { name: "Medical Travel", slug: "medical-travel", kind: "package", sortOrder: 4, icon: "heart-pulse" },
      { name: "Flight Tickets", slug: "flight-tickets", kind: "inquiry_based", sortOrder: 5, icon: "plane-takeoff" },
      { name: "Visa Services", slug: "visa-services", kind: "inquiry_based", sortOrder: 6, icon: "file-check" },
      { name: "Passport Services", slug: "passport-services", kind: "inquiry_based", sortOrder: 7, icon: "book-open" },
      { name: "Hotel Bookings", slug: "hotel-bookings", kind: "inquiry_based", sortOrder: 8, icon: "building" },
    ]);
  }

  // 5. Payment Gateways baseline (Manual Gateways + Pay Later)
  const existingGateways = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentGateways);

  if (existingGateways[0]?.count === 0) {
    await db.insert(paymentGateways).values([
      {
        name: "bKash (Manual)",
        kind: "manual",
        sortOrder: 1,
        config: { accountType: "merchant", number: "" },
        instructions: "Send payment via bKash to our official number, then submit your transaction ID for verification.",
      },
      {
        name: "Nagad (Manual)",
        kind: "manual",
        sortOrder: 2,
        config: { accountType: "merchant", number: "" },
        instructions: "Send payment via Nagad to our official number, then submit your transaction ID for verification.",
      },
      {
        name: "Bank Transfer",
        kind: "manual",
        sortOrder: 3,
        config: { bankName: "", accountName: "", accountNo: "", branch: "", routingNo: "" },
        instructions: "Deposit or wire funds to our corporate bank account, then upload your deposit receipt or transfer reference.",
      },
      {
        name: "Pay Later",
        kind: "paylater",
        sortOrder: 4,
        config: { accountType: "pay_later" },
        instructions: "Confirm your reservation immediately. Full payment can be completed at our agency office or online before departure.",
      },
    ]);
  }

  return { ok: true };
}
