import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { pages, postCategories } from "@/modules/content/schema";
import type { PageSection } from "@/modules/content/validation";

// Static content seed — the four evergreen pages (about-us, faq,
// terms-of-service, privacy-policy) plus the blog's starter post categories.
//
// Content is a separate pure-data module (imported by src/db/seed.ts) so it can
// also be shape-checked by the validation suite. Seeding is idempotent: rows
// insert ONLY when their unique slug is absent, so `npm run db:seed` is safe to
// re-run against a live DB without touching admin edits to the same rows.

export const STATIC_POST_CATEGORIES = [
  { name: "Travel Tips", slug: "travel-tips" },
  { name: "Spiritual Journeys", slug: "spiritual-journeys" },
  { name: "City Guides", slug: "city-guides" },
] as const;

export type StaticPageSeed = {
  title: string;
  slug: string;
  sections: PageSection[];
  seo: { title: string; description: string };
};

// SEO title convention: these `seo.title` values must NOT carry a trailing
// "| TripMate" — the root layout's title.template ("%s | TripMate") appends the
// suffix at render time, so an inline one would double it. NOTE: rows seeded
// before this convention (the FAQ/Terms/Privacy "…| TripMate" titles) keep the
// old suffixed value in an existing DB — seeding only inserts when the slug is
// absent and never rewrites admin rows. Plan 6's settings polish can normalize
// those pre-existing rows.
export const STATIC_PAGES: StaticPageSeed[] = [
  {
    title: "About Us",
    slug: "about-us",
    sections: [
      {
        type: "markdown",
        content: `TripMate is a Dhaka-based travel agency built around one idea: meaningful journeys should be simple to plan and trusted to deliver. From Hajj and Umrah to family tours, flights and visa assistance, we bring together seasoned ground teams, transparent pricing and a small team that answers its own phones — so the people you plan with are the people who carry you through.`,
      },
      {
        type: "markdown",
        content: `Our roots are in spiritual travel. Over the years we have guided thousands of Bangladeshi pilgrims through the rites of Hajj and Umrah, and that care now shapes every corner of TripMate — the way we vet hotels, brief guides, and stay with a traveller from the first inquiry until they are safely home.`,
      },
      {
        type: "markdown",
        content: `We are not a marketplace that disappears after payment. Every package is put together by a real TripMate team member, every document checked twice, and every itinerary built so you spend your energy on the journey — not on logistics. Wherever you are travelling next, we would be glad to plan it with you.`,
      },
    ],
    seo: {
      title: "About TripMate — the team behind your journey",
      description: "TripMate is a Dhaka-based travel agency for Hajj, Umrah, tours, flights and visa — transparent pricing and a team that stays with you end to end.",
    },
  },
  {
    title: "Frequently Asked Questions",
    slug: "faq",
    sections: [
      {
        type: "markdown",
        content: `## How do I book a Hajj or Umrah package?\n\nReach us by phone, WhatsApp or the contact form and tell us your preferred dates and budget. A TripMate advisor will share the current package options, availability and a full cost breakdown — no pressure, no hidden line items. When you are ready, we confirm your booking in writing and guide you through documents and payments step by step.`,
      },
      {
        type: "markdown",
        content: `## What is included in the package price?\n\nThe inclusions are listed on every package page and repeated in your written confirmation, so there is no ambiguity later. Typically these cover accommodation, transport, visa processing and the services of an experienced guide. Anything extra — flights, meals, personal expenses — is shown clearly as an exclusion before you commit.`,
      },
      {
        type: "markdown",
        content: `## How do payments work?\n\nWe accept bank transfer, bKash and Nagad. For most packages you secure your booking with an advance and settle the balance on the schedule in your confirmation. You will always receive an official receipt, and a TripMate team member confirms every payment with you personally rather than leaving it to an automated message.`,
      },
      {
        type: "markdown",
        content: `## Is my booking confirmed before I travel?\n\nYes — and that is the part we obsess over. Once your documents are in and the supplier confirms, you receive a written final itinerary with hotel names, transport details, contact numbers and your guide's details. Should anything shift before departure, we contact you immediately with options, not surprises.`,
      },
      {
        type: "markdown",
        content: `## What happens if I need to cancel or change my plan?\n\nCancellation and change terms depend on the package and how close to departure the change happens — they are stated in your confirmation from day one. The earlier you tell us, the more flexibility the supplier allows. Contact your dedicated advisor first; we will always try to reschedule or transfer your booking before a refund becomes the only option.`,
      },
    ],
    seo: {
      title: "FAQ — Hajj, Umrah & travel questions answered",
      description: "Answers to common questions about TripMate packages, inclusions, payments, booking confirmation and cancellations.",
    },
  },
  {
    title: "Terms of Service",
    slug: "terms-of-service",
    sections: [
      {
        type: "markdown",
        content: `These terms govern your use of TripMate's website and travel services. By making a booking or inquiry you agree to them. Please read them alongside the specific inclusions, exclusions and cancellation terms in your written confirmation, which take precedence for that booking.`,
      },
      {
        type: "markdown",
        content: `Prices and availability are quoted at the time of inquiry and may change until your booking is confirmed in writing. A confirmed booking is a contract between you and TripMate for the services described; we act on behalf of the hotels, airlines and ground operators who provide those services, and their own conditions (visa rulings, flight schedules, hotel policies) apply where relevant.`,
      },
      {
        type: "markdown",
        content: `You are responsible for the accuracy of the details you provide, for holding a valid passport and for meeting visa and health requirements. Payments are due on the schedule in your confirmation. Cancellations and changes are subject to the terms stated in that confirmation — contact your advisor as early as possible, and we will always try to reschedule or transfer before a refund becomes necessary.`,
      },
      {
        type: "markdown",
        content: `TripMate's liability is limited to the services we directly provide, and we are not liable for delays or losses caused by events outside our reasonable control. Nothing in these terms limits your statutory rights. Questions about these terms can be sent to the contact details on our website.`,
      },
    ],
    seo: {
      title: "Terms of Service",
      description: "The terms governing use of TripMate's website and travel services — bookings, payments, cancellations and liability.",
    },
  },
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    sections: [
      {
        type: "markdown",
        content: `TripMate respects your privacy. This policy explains what personal information we collect when you use our site or book with us, why we collect it, and the choices you have. We collect only what we need to serve you: contact details (name, phone, email), travel document information required for bookings and visas, and payment records.`,
      },
      {
        type: "markdown",
        content: `We use your information to prepare quotations, process bookings and visas, arrange travel services, confirm payments and respond to your inquiries. We do not sell your personal information. It is shared only with the suppliers and authorities who need it to deliver your travel — for example the airline, hotel or visa office — and only to the extent required.`,
      },
      {
        type: "markdown",
        content: `We keep your information only as long as needed for the purposes above or as law requires, and we apply reasonable safeguards to protect it. When your documents are no longer needed we dispose of them securely.`,
      },
      {
        type: "markdown",
        content: `You may ask us at any time what information we hold about you, request a correction, or ask us to delete it where the law allows. To make a request, contact us using the details on our website and we will respond promptly. This policy may be updated occasionally; the current version is always available on this page.`,
      },
    ],
    seo: {
      title: "Privacy Policy",
      description: "How TripMate collects, uses and protects your personal information — what we hold, why, and the choices you have.",
    },
  },
];

/**
 * Idempotent content seed. Categories insert when their slug is absent; pages
 * insert when their slug is absent. Existing rows (including admin edits) are
 * left untouched so re-running `npm run db:seed` is a no-op on the static set.
 */
export async function seedStaticContent(db: Database): Promise<{
  categoriesInserted: number;
  pagesInserted: number;
}> {
  let categoriesInserted = 0;
  for (const category of STATIC_POST_CATEGORIES) {
    const existing = await db
      .select({ id: postCategories.id })
      .from(postCategories)
      .where(eq(postCategories.slug, category.slug))
      .limit(1);
    if (existing.length === 0) {
      await db
        .insert(postCategories)
        .values({ name: category.name, slug: category.slug })
        .onConflictDoNothing();
      categoriesInserted += 1;
    }
  }

  let pagesInserted = 0;
  for (const page of STATIC_PAGES) {
    const existing = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, page.slug))
      .limit(1);
    if (existing.length === 0) {
      await db
        .insert(pages)
        .values({
          title: page.title,
          slug: page.slug,
          sections: page.sections,
          seo: page.seo,
          status: "published",
        })
        .onConflictDoNothing();
      pagesInserted += 1;
    }
  }

  return { categoriesInserted, pagesInserted };
}
