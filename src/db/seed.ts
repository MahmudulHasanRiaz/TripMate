import "dotenv/config";
import { db } from "./connection";
import {
  destinations,
  listings,
  paymentGateways,
  serviceCategories,
  settings,
} from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceCategories);
  if (existing[0].count > 0) {
    console.log("Seed skipped: data already present.");
    return;
  }

  const cats = await db
    .insert(serviceCategories)
    .values([
      { name: "Tour Packages", slug: "tour-packages", kind: "package", sortOrder: 1, icon: "compass" },
      { name: "Hajj", slug: "hajj", kind: "package", sortOrder: 2, icon: "moon-star" },
      { name: "Umrah", slug: "umrah", kind: "package", sortOrder: 3, icon: "moon" },
      { name: "Medical Travel", slug: "medical-travel", kind: "package", sortOrder: 4, icon: "heart-pulse" },
      { name: "Flight Tickets", slug: "flight-tickets", kind: "inquiry_based", sortOrder: 5, icon: "plane-takeoff" },
      { name: "Visa & Passport", slug: "visa-passport", kind: "inquiry_based", sortOrder: 6, icon: "file-check" },
    ])
    .returning();

  const dests = await db
    .insert(destinations)
    .values([
      { name: "Makkah & Madinah", slug: "makkah-madinah" },
      { name: "Malaysia & Singapore", slug: "malaysia-singapore" },
      { name: "Dubai", slug: "dubai" },
      { name: "Cox's Bazar & Sylhet", slug: "coxs-bazar-sylhet" },
    ])
    .returning();

  const hajj = cats.find((c) => c.slug === "hajj")!;
  const umrah = cats.find((c) => c.slug === "umrah")!;
  const tour = cats.find((c) => c.slug === "tour-packages")!;
  const mm = dests.find((d) => d.slug === "makkah-madinah")!;

  await db.insert(listings).values([
    {
      categoryId: hajj.id,
      destinationId: mm.id,
      title: "Premium Hajj Package 2026",
      slug: "premium-hajj-2026",
      summary: "21 days, 5-star hotels near Haramain, scholar guidance.",
      price: "850000",
      durationDays: 21,
      currency: "BDT",
      status: "published",
      itinerary: [
        { day: "1-10", title: "Makkah", details: "Ibadah in Masjid al-Haram, 5-star stay." },
        { day: "11-15", title: "Manasik", details: "Guided Mina, Arafat, Muzdalifah." },
        { day: "16-20", title: "Madinah", details: "Ziyarat tours, hotel by Masjid an-Nabawi." },
        { day: "21", title: "Departure", details: "Final prayer and departure." },
      ],
      inclusions: ["5-star hotels", "Visa processing", "Full board"],
      exclusions: ["Flights", "Personal expenses"],
    },
    {
      categoryId: umrah.id,
      destinationId: mm.id,
      title: "Economy Umrah Package",
      slug: "economy-umrah",
      summary: "10 days, clean 3-star hotels, group transport.",
      price: "120000",
      durationDays: 10,
      currency: "BDT",
      status: "published",
    },
    {
      categoryId: tour.id,
      title: "Malaysia-Singapore Family Tour",
      slug: "malaysia-singapore-family-tour",
      summary: "7 days, family-friendly, all transfers.",
      price: "145000",
      durationDays: 7,
      currency: "BDT",
      status: "published",
    },
  ]);

  await db.insert(settings).values([
    {
      key: "site",
      value: {
        title: "TripMate",
        logoUrl: "/logo.svg",
        faviconUrl: "/favicon.svg",
        searchEngineVisibility: true,
        phone: "+8801000000000",
        email: "info@tripmate.example",
        address: "Dhaka, Bangladesh",
      },
    },
    { key: "home", value: { heroHeadline: "Your Journey Begins Here", heroSub: "Hajj, Umrah, tours, flights & visa — one trusted agency." } },
    { key: "storage", value: { driver: "local" } },
    { key: "setup", value: { setupComplete: false } },
  ]);

  await db.insert(paymentGateways).values([
    {
      name: "bKash (Manual)",
      kind: "manual",
      sortOrder: 1,
      config: { accountType: "personal", number: "+8801000000000" },
      instructions: "Send the amount to the bKash number, then submit the transaction ID below.",
    },
    {
      name: "Nagad (Manual)",
      kind: "manual",
      sortOrder: 2,
      config: { accountType: "personal", number: "+8801000000000" },
      instructions: "Send the amount to the Nagad number, then submit the transaction ID below.",
    },
    {
      name: "Bank Transfer",
      kind: "manual",
      sortOrder: 3,
      config: { bankName: "Example Bank", accountName: "TripMate Travel", accountNo: "0000000000", branch: "Gulshan" },
      instructions: "Transfer to the bank account, then submit the deposit slip.",
    },
  ]);

  console.log("Seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
