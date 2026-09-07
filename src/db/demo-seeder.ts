import "server-only";
import { db } from "./client";
import {
  destinations,
  expenseCategories,
  expenses,
  listings,
  paymentGateways,
  postCategories,
  posts,
  serviceCategories,
  serviceOptions,
  settings,
  visaServices,
  visaTypes,
} from "./schema";
import { seedStaticContent } from "@/modules/content/seed-static-pages";
import { downloadAndStoreDemoAsset, generateTravelSvg, type SeedAsset } from "./asset-downloader";
import { DEFAULT_THEME_SETTINGS } from "@/modules/settings/theme";
import { sql } from "drizzle-orm";

/**
 * Demo Seeder for TripMate.
 *
 * Seeds a complete, realistic, production-ready showcase into the database:
 *  - 100% database-driven (no fake mockups in components)
 *  - Downloads copyright-safe images into APPLICATION STORAGE (local/r2)
 *  - Public site consumes records through stored application URLs
 *  - Idempotent: checks for existence before inserting to allow re-runs safely
 */
export async function seedDemoData() {
  console.log("[demo-seed] Starting realistic TripMate showcase seeding...");

  // --------------------------------------------------------------------------
  // 1. Download & Store Demo Assets in Application Storage
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Provisioning demo media in application storage...");

  const ASSETS: Record<string, SeedAsset> = {
    hero: {
      name: "hero-luxury-travel.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1600&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Luxury travel journey with scenic vistas",
      fallbackSvg: generateTravelSvg("Your Next Journey", "Curated tours, spiritual pilgrimages and flight concierge", "178 74% 21%"),
    },
    destMakkah: {
      name: "dest-makkah-madinah.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Masjid al-Haram in Makkah",
      fallbackSvg: generateTravelSvg("Makkah & Madinah", "Hajj and Umrah Spiritual Journeys", "41 55% 44%"),
    },
    destDubai: {
      name: "dest-dubai-uae.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Downtown Dubai skyline and Burj Khalifa",
      fallbackSvg: generateTravelSvg("Dubai, UAE", "Futuristic Architecture & Desert Safaris", "215 78% 28%"),
    },
    destMalaysia: {
      name: "dest-malaysia-singapore.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Kuala Lumpur Petronas Towers and city skyline",
      fallbackSvg: generateTravelSvg("Malaysia & Singapore", "Family Holidays, Theme Parks & Shopping", "158 64% 25%"),
    },
    destMaldives: {
      name: "dest-maldives-resort.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Crystal clear ocean overwater villas in Maldives",
      fallbackSvg: generateTravelSvg("Maldives Islands", "Tropical Paradise & Luxury Honeymoons", "190 75% 35%"),
    },
    destCoxsBazar: {
      name: "dest-coxs-bazar.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Golden sunset over the coastline of Cox's Bazar",
      fallbackSvg: generateTravelSvg("Cox's Bazar & Sylhet", "World's Longest Sea Beach & Tea Gardens", "30 70% 38%"),
    },
    destTurkey: {
      name: "dest-turkey-istanbul.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Historic Istanbul architecture across the Bosphorus",
      fallbackSvg: generateTravelSvg("Turkey & Europe", "Where East Meets West", "14 65% 36%"),
    },
    pkgHajjCover: {
      name: "pkg-hajj-executive.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Pilgrims at the Grand Mosque in Makkah",
      fallbackSvg: generateTravelSvg("Premium Hajj 2026", "21 Days 5-Star Guided Pilgrimage", "178 74% 21%"),
    },
    pkgUmrahCover: {
      name: "pkg-umrah-spiritual.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "The Prophet's Mosque in Madinah illuminated at sunset",
      fallbackSvg: generateTravelSvg("Executive Umrah 14-Day", "Deluxe Hotels & Full Ground Support", "41 55% 44%"),
    },
    pkgMalaysiaCover: {
      name: "pkg-malaysia-family.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Universal Studios Singapore and Sentosa Island",
      fallbackSvg: generateTravelSvg("Malaysia & Singapore Family Tour", "7 Days All-Inclusive City & Resort", "158 64% 25%"),
    },
    pkgDubaiCover: {
      name: "pkg-dubai-desert.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Sunset over golden dunes in Dubai desert safari",
      fallbackSvg: generateTravelSvg("Dubai Luxury & Desert Safari", "5 Days 4-Star Stay & Dhow Cruise", "215 78% 28%"),
    },
    pkgMaldivesCover: {
      name: "pkg-maldives-honeymoon.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Turquoise lagoon and water bungalow in Maldives",
      fallbackSvg: generateTravelSvg("Maldives Resort Retreat", "4 Days All-Inclusive Beach Resort", "190 75% 35%"),
    },
    guideUmrah: {
      name: "guide-umrah-preparation.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Prayer beads and Islamic guide",
      fallbackSvg: generateTravelSvg("First-Time Umrah Guide", "Step-by-Step Preparation & Advice", "41 55% 44%"),
    },
    guideMalaysia: {
      name: "guide-malaysia-family.jpg",
      sourceUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop",
      mime: "image/jpeg",
      alt: "Scenic Asian tea plantation",
      fallbackSvg: generateTravelSvg("Malaysia Family Travel Tips", "What to see, eat and experience", "158 64% 25%"),
    },
  };

  const storedUrls: Record<string, string> = {};
  for (const [key, asset] of Object.entries(ASSETS)) {
    try {
      storedUrls[key] = await downloadAndStoreDemoAsset(asset);
    } catch (e) {
      console.warn(`[demo-seed] Failed storing asset ${asset.name}, fallback used`, e);
      storedUrls[key] = "";
    }
  }

  // --------------------------------------------------------------------------
  // 2. Settings & Branding
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding site and theme settings...");

  const existingSettings = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(settings)
    .where(sql`key = 'site'`);

  if (existingSettings[0]?.count === 0) {
    await db.insert(settings).values([
      {
        key: "site",
        value: {
          title: "TripMate Travel",
          logoUrl: "/logo.svg",
          faviconUrl: "/favicon.svg",
          searchEngineVisibility: true,
          phone: "+880 1711-234567",
          email: "support@tripmate.com",
          address: "Concord Bilkis Tower, 6th Floor, Madani Avenue, Gulshan-2, Dhaka-1212",
          footerDescription: "Bangladesh's premier B2C travel commerce platform. Providing specialized Hajj & Umrah pilgrimages, curated holiday tours, medical travel assistance, and express visa concierge services.",
        },
      },
      {
        key: "home",
        value: {
          heroHeadline: "Travel better. We'll handle the rest.",
          heroSub: "Spiritual pilgrimages, family holidays, and corporate travel — planned with precision, transparency, and 24/7 human care.",
          heroButtonLabel: "Explore Journeys",
          heroButtonLink: "/packages",
          heroImage: storedUrls.hero || null,
          heroImageAlt: "Scenic luxury travel journey by TripMate",
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

  // --------------------------------------------------------------------------
  // 3. Service Categories (All 7 Launch Services + Passport)
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding service categories...");

  let cats = await db.select().from(serviceCategories);
  if (cats.length === 0) {
    cats = await db
      .insert(serviceCategories)
      .values([
        {
          name: "Flight Tickets",
          slug: "flights",
          kind: "redirect",
          redirectUrl: "https://b2b.tripmate.example/flights",
          icon: "plane-takeoff",
          sortOrder: 1,
          isActive: true,
        },
        {
          name: "Hotel Booking",
          slug: "hotels",
          kind: "redirect",
          redirectUrl: "https://b2b.tripmate.example/hotels",
          icon: "building",
          sortOrder: 2,
          isActive: true,
        },
        {
          name: "Tour Packages",
          slug: "tour-packages",
          kind: "package",
          icon: "compass",
          sortOrder: 3,
          isActive: true,
        },
        {
          name: "Hajj Packages",
          slug: "hajj",
          kind: "package",
          icon: "moon-star",
          sortOrder: 4,
          isActive: true,
        },
        {
          name: "Umrah Packages",
          slug: "umrah",
          kind: "package",
          icon: "moon",
          sortOrder: 5,
          isActive: true,
        },
        {
          name: "Medical Travel",
          slug: "medical-travel",
          kind: "package",
          icon: "heart-pulse",
          sortOrder: 6,
          isActive: true,
        },
        {
          name: "Visa Concierge",
          slug: "visa",
          kind: "inquiry_based",
          icon: "file-check",
          sortOrder: 7,
          isActive: true,
        },
        {
          name: "Passport Services",
          slug: "passport",
          kind: "inquiry_based",
          icon: "book-open",
          sortOrder: 8,
          isActive: true,
        },
      ])
      .returning();
  }

  // --------------------------------------------------------------------------
  // 4. Destinations
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding destinations...");

  let dests = await db.select().from(destinations);
  if (dests.length === 0) {
    dests = await db
      .insert(destinations)
      .values([
        {
          name: "Makkah & Madinah",
          slug: "makkah-madinah",
          image: storedUrls.destMakkah || null,
          description: "The holiest sanctuaries of Islam. Experience spiritual tranquility with luxury accommodations located steps from Masjid al-Haram and Masjid an-Nabawi.",
          sortOrder: 1,
          isFeatured: true,
          isActive: true,
          seo: {
            title: "Hajj & Umrah Packages in Makkah & Madinah | TripMate",
            description: "Book verified Hajj and Umrah packages with 5-star hotels near the Haramain.",
          },
        },
        {
          name: "Dubai, UAE",
          slug: "dubai",
          image: storedUrls.destDubai || null,
          description: "The pinnacle of modern opulence, cutting-edge architecture, desert adventures, and world-class shopping experiences.",
          sortOrder: 2,
          isFeatured: true,
          isActive: true,
          seo: {
            title: "Dubai Tour Packages & Tourist Visa | TripMate",
            description: "Explore luxury Dubai tours, desert safaris, and express UAE tourist visas.",
          },
        },
        {
          name: "Malaysia & Singapore",
          slug: "malaysia-singapore",
          image: storedUrls.destMalaysia || null,
          description: "Dual-nation family favorites featuring world-famous theme parks, vibrant street food, lush rainforests, and modern metropolitan wonders.",
          sortOrder: 3,
          isFeatured: true,
          isActive: true,
          seo: {
            title: "Malaysia & Singapore Family Tour Packages | TripMate",
            description: "Customized holiday packages covering Kuala Lumpur, Genting Highlands, and Singapore.",
          },
        },
        {
          name: "Maldives Islands",
          slug: "maldives",
          image: storedUrls.destMaldives || null,
          description: "Pure tropical paradise of turquoise atolls, private overwater bungalows, and world-renowned underwater marine reserves.",
          sortOrder: 4,
          isFeatured: true,
          isActive: true,
        },
        {
          name: "Cox's Bazar & Sylhet",
          slug: "coxs-bazar-sylhet",
          image: storedUrls.destCoxsBazar || null,
          description: "Bangladesh's natural wonders: the unbroken 120km golden sea beach of Cox's Bazar and the rolling emerald tea gardens of Sylhet.",
          sortOrder: 5,
          isFeatured: true,
          isActive: true,
        },
        {
          name: "Turkey & Europe",
          slug: "turkey-europe",
          image: storedUrls.destTurkey || null,
          description: "Breathtaking crossroads of European and Asian civilization, hot air balloon flights in Cappadocia, and Ottoman grand palaces.",
          sortOrder: 6,
          isFeatured: false,
          isActive: true,
        },
      ])
      .returning();
  }

  // --------------------------------------------------------------------------
  // 5. Visa Types & Dynamic Visa Services
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding visa types and offerings...");

  let vTypes = await db.select().from(visaTypes);
  if (vTypes.length === 0) {
    vTypes = await db
      .insert(visaTypes)
      .values([
        { name: "Tourist Visa", slug: "tourist-visa", description: "Leisure, sightseeing and family visits", icon: "camera", sortOrder: 1, isActive: true },
        { name: "Student Visa", slug: "student-visa", description: "Higher education university admissions & processing", icon: "graduation-cap", sortOrder: 2, isActive: true },
        { name: "Business Visa", slug: "business-visa", description: "Trade meetings, conferences, exhibitions & investment", icon: "briefcase", sortOrder: 3, isActive: true },
        { name: "Medical Visa", slug: "medical-visa", description: "Hospital admission & medical treatment travel", icon: "activity", sortOrder: 4, isActive: true },
        { name: "Work Visa", slug: "work-visa", description: "Employment and overseas contractor documentation", icon: "hard-hat", sortOrder: 5, isActive: true },
      ])
      .returning();
  }

  const existingVisaServices = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(visaServices);

  if (existingVisaServices[0]?.count === 0 && dests.length > 0 && vTypes.length > 0) {
    const dubaiDest = dests.find((d) => d.slug === "dubai")!;
    const myDest = dests.find((d) => d.slug === "malaysia-singapore")!;
    const saDest = dests.find((d) => d.slug === "makkah-madinah")!;

    const touristType = vTypes.find((v) => v.slug === "tourist-visa")!;
    const studentType = vTypes.find((v) => v.slug === "student-visa")!;
    const businessType = vTypes.find((v) => v.slug === "business-visa")!;

    await db.insert(visaServices).values([
      {
        destinationId: dubaiDest.id,
        visaTypeId: touristType.id,
        title: "Dubai 30-Day Tourist Visa",
        slug: "dubai-30-day-tourist-visa",
        price: "18500",
        costPrice: "14800",
        processingTime: "3-5 Working Days",
        validity: "60 Days from issuance",
        stayDuration: "30 Days Single Entry",
        requirements: [
          "Scanned copy of valid passport (minimum 6 months validity)",
          "Passport-size photograph with white background",
          "Confirmed return flight ticket",
          "National ID card copy",
        ],
        description: "Official Dubai electronic tourist visa approved by GDRFA. Fast processing with guaranteed approval for eligible travelers.",
        sortOrder: 1,
        isActive: true,
      },
      {
        destinationId: myDest.id,
        visaTypeId: touristType.id,
        title: "Malaysia eNTRI / e-Visa",
        slug: "malaysia-tourist-evisa",
        price: "8500",
        costPrice: "6200",
        processingTime: "5-7 Working Days",
        validity: "90 Days",
        stayDuration: "30 Days",
        requirements: [
          "Original passport with at least 2 blank pages",
          "Recent 35mm x 50mm studio photo",
          "Bank statement (last 6 months with minimum balance of ৳100,000)",
          "Bank solvency certificate",
          "Forwarding letter / trade license for business travelers",
        ],
        description: "Standard Malaysian electronic visa processed through official immigration channels.",
        sortOrder: 2,
        isActive: true,
      },
      {
        destinationId: myDest.id,
        visaTypeId: studentType.id,
        title: "Malaysia Student Visa (EMGS Processing)",
        slug: "malaysia-student-visa-emgs",
        price: "45000",
        costPrice: "32000",
        processingTime: "15-21 Working Days",
        validity: "1 Year Renewable",
        stayDuration: "Full Academic Term",
        requirements: [
          "University Offer Letter from accredited institution",
          "Academic certificates and transcripts attested by Education Board & MOFA",
          "Health declaration and medical examination report",
          "Financial proof and sponsor bank guarantee",
          "Passport scan (all pages)",
        ],
        description: "Complete EMGS student pass assistance, university coordination, and visa approval letter (VAL) tracking.",
        sortOrder: 3,
        isActive: true,
      },
      {
        destinationId: saDest.id,
        visaTypeId: touristType.id,
        title: "Saudi Arabia Electronic Tourist / Umrah Visa",
        slug: "saudi-arabia-tourist-umrah-visa",
        price: "34000",
        costPrice: "29500",
        processingTime: "2-4 Working Days",
        validity: "1 Year Multiple Entry",
        stayDuration: "Up to 90 Days per visit",
        requirements: [
          "Passport with minimum 6 months validity",
          "Passport size digital photograph",
          "Full COVID & Meningitis vaccination certification",
        ],
        description: "Official Saudi electronic visa with integrated health insurance, valid for tourism and independent Umrah year-round.",
        sortOrder: 4,
        isActive: true,
      },
      {
        destinationId: dubaiDest.id,
        visaTypeId: businessType.id,
        title: "Dubai 90-Day Multiple Entry Business Visa",
        slug: "dubai-90-day-business-visa",
        price: "42000",
        costPrice: "34000",
        processingTime: "5-7 Working Days",
        validity: "6 Months",
        stayDuration: "90 Days Multiple Entry",
        requirements: [
          "Passport copy",
          "Trade license copy",
          "Official business invitation letter from UAE entity",
          "Company bank statement",
        ],
        description: "Ideal for corporate executives, trade fair participants, and commercial investors traveling frequently to the UAE.",
        sortOrder: 5,
        isActive: true,
      },
    ]);
  }

  // --------------------------------------------------------------------------
  // 6. Passport Orderable Options
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding passport options...");

  const passportCat = cats.find((c) => c.slug === "passport");
  const existingOptions = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceOptions);

  if (existingOptions[0]?.count === 0 && passportCat) {
    await db.insert(serviceOptions).values([
      {
        categoryId: passportCat.id,
        title: "e-Passport 5 Years (48 Pages) - Regular Delivery",
        slug: "epassport-5yr-48pages-regular",
        duration: "5 Years",
        price: "5750",
        costPrice: "4025",
        deliveryTime: "15-21 Working Days",
        requirements: [
          "Original NID (National ID) Card or verified Online Birth Certificate",
          "Old passport (if re-issuance)",
          "Application printout with barcoded summary",
          "Profession document / Trade license / Student ID",
        ],
        description: "Government e-passport fee payment, application verification, and biometric appointment scheduling.",
        sortOrder: 1,
        isActive: true,
      },
      {
        categoryId: passportCat.id,
        title: "e-Passport 5 Years (48 Pages) - Express Fast-Track",
        slug: "epassport-5yr-48pages-express",
        duration: "5 Years",
        price: "8050",
        costPrice: "6325",
        deliveryTime: "7-10 Working Days",
        requirements: [
          "Original NID Card",
          "Old passport for verification",
          "Urgent police clearance facilitation where necessary",
        ],
        description: "Priority government processing for urgent travelers with accelerated police verification handling.",
        sortOrder: 2,
        isActive: true,
      },
      {
        categoryId: passportCat.id,
        title: "e-Passport 10 Years (64 Pages) - Regular Delivery",
        slug: "epassport-10yr-64pages-regular",
        duration: "10 Years",
        price: "10350",
        costPrice: "8050",
        deliveryTime: "15-21 Working Days",
        requirements: [
          "Original NID Card",
          "Proof of profession / tax document",
          "Previous passport (if applicable)",
        ],
        description: "Maximum page count for frequent international travelers, business executives, and diaspora.",
        sortOrder: 3,
        isActive: true,
      },
      {
        categoryId: passportCat.id,
        title: "e-Passport 10 Years (64 Pages) - Super Express Delivery",
        slug: "epassport-10yr-64pages-super-express",
        duration: "10 Years",
        price: "14950",
        costPrice: "12075",
        deliveryTime: "2-3 Working Days",
        requirements: [
          "Original NID Card",
          "Verified emergency travel proof (medical or official travel orders)",
        ],
        description: "Emergency super-express issuance through Agargaon VIP wing with direct immigration concierge accompaniment.",
        sortOrder: 4,
        isActive: true,
      },
    ]);
  }

  // --------------------------------------------------------------------------
  // 7. Commercial Travel Packages (Tour, Hajj, Umrah, Medical)
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding travel packages...");

  const existingListings = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings);

  if (existingListings[0]?.count === 0 && dests.length > 0 && cats.length > 0) {
    const hajjCat = cats.find((c) => c.slug === "hajj")!;
    const umrahCat = cats.find((c) => c.slug === "umrah")!;
    const tourCat = cats.find((c) => c.slug === "tour-packages")!;
    const medicalCat = cats.find((c) => c.slug === "medical-travel")!;

    const makkahDest = dests.find((d) => d.slug === "makkah-madinah")!;
    const dubaiDest = dests.find((d) => d.slug === "dubai")!;
    const myDest = dests.find((d) => d.slug === "malaysia-singapore")!;
    const maldivesDest = dests.find((d) => d.slug === "maldives")!;

    await db.insert(listings).values([
      {
        categoryId: hajjCat.id,
        destinationId: makkahDest.id,
        title: "Premium Executive Hajj 2026",
        slug: "premium-executive-hajj-2026",
        summary: "21-Day VIP pilgrimage with 5-star Clock Tower hotels in Makkah, elite Madinah accommodations, and Islamic scholar guidance.",
        description: "## An Uncompromising Spiritual Journey\n\nExperience the journey of a lifetime with TripMate's signature Executive Hajj Package. Designed for pilgrims who prioritize comfort, proximity, and spiritual immersion, this package ensures complete peace of mind throughout the Manasik.\n\n### Accommodation Highlights\n- **Makkah**: Swissôtel Al Maqam / Fairmont Clock Royal Tower (steps from the courtyard)\n- **Madinah**: The Oberoi / Dar Al Taqwa overlooking the Prophet's Green Dome\n- **Mina & Arafat**: Air-conditioned European-standard VIP tents with private sofa-beds and 24/7 dedicated buffet service\n\n### Exclusive Services\n- Guided by renowned Bangladeshi Islamic scholars with daily spiritual halaqahs\n- Private VIP air-conditioned coach transfers throughout all rites\n- Full three-course open buffet breakfast and dinner\n- Complete Hajj visa processing and Nusuk registration management",
        coverImage: {
          url: storedUrls.pkgHajjCover || "",
          alt: "Pilgrims worshiping at the Holy Kaaba",
        },
        gallery: [
          { url: storedUrls.pkgHajjCover || "", alt: "Kaaba Grand Mosque" },
          { url: storedUrls.destMakkah || "", alt: "Clock Tower luxury hotel room view" },
        ],
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        durationDays: 21,
        rating: "4.95",
        price: "850000",
        costPrice: "740000",
        startingPrice: "820000",
        currency: "BDT",
        isFeatured: true,
        itinerary: [
          { day: "1", title: "Arrival in Jeddah & Transfer to Makkah", details: "Direct flight from Dhaka to King Abdulaziz International Airport (JED). VIP welcome and private bus transfer to Swissôtel Makkah. Perform Umrah with scholar guidance." },
          { day: "2-7", title: "Ibadah in Makkah al-Mukarramah", details: "Dedicated time for prayers, Tawaf, and spiritual reflections. Daily lectures after Asr in private conference room. Optional guided Ziyarat to Jabal al-Nour and Ghar Thawr." },
          { day: "8", title: "Day of Tarwiyah (Move to Mina)", details: "Enter Ihram and move to private air-conditioned VIP tents in Mina. Prayers in congregation." },
          { day: "9", title: "Day of Arafat & Muzdalifah", details: "The pinnacle of Hajj: Day of Dua on the plains of Arafat in our VIP air-cooled marquee. Post-sunset movement to Muzdalifah for pebble collection and night under the stars." },
          { day: "10-12", title: "Rami al-Jamarat, Qurbani & Tawaf al-Ifadah", details: "Guided movement for pebble throwing at the Jamarat. Managed Qurbani sacrifice. Return to Haram for Tawaf al-Ifadah and Sa'i." },
          { day: "13-18", title: "Journey to the City of the Prophet (Madinah)", details: "Luxury Haramain High-Speed Railway transfer to Madinah. Check-in at 5-star hotel next to Bab as-Salam. Prayers in Rawdah ash-Sharifah." },
          { day: "19-20", title: "Madinah Ziyarat Tours", details: "Guided visits to Masjid Quba, Mount Uhud and martyrs cemetery, and the Seven Mosques." },
          { day: "21", title: "Final Prayer & Departure", details: "Farewell prayers in the Prophet's Mosque. Transfer to Prince Mohammad bin Abdulaziz Airport for return flight to Dhaka." },
        ],
        inclusions: [
          "5-Star hotel accommodations directly in front of the Haramain",
          "Full board catering (Breakfast, Lunch & Dinner)",
          "VIP Mina & Arafat air-conditioned tents with private beds",
          "Haramain High-Speed Train ticket (First Class)",
          "Dedicated Islamic scholar accompaniment",
          "Complete Hajj visa & Nusuk registration",
          "Complementary 5-liter Zamzam water container per pilgrim",
        ],
        exclusions: [
          "Personal laundry and international roaming phone bills",
          "Wheelchair attendant fees during Tawaf and Sa'i (available upon request)",
          "Extra baggage charges beyond airline weight allowances",
        ],
        status: "published",
        seo: {
          title: "Premium Executive Hajj Package 2026 | TripMate Bangladesh",
          description: "Book 21-day luxury VIP Hajj package with Clock Tower 5-star hotels and scholar accompaniment.",
        },
      },
      {
        categoryId: umrahCat.id,
        destinationId: makkahDest.id,
        title: "Executive Umrah 14-Day Spiritual Journey",
        slug: "executive-umrah-14-day",
        summary: "14 Days of spiritual elevation with 5-star accommodations near the Haramain, luxury transfers, and comprehensive Ziyarat.",
        description: "## Connect With Your Faith in Serenity\n\nA meticulously curated Umrah experience designed to allow you and your loved ones to focus wholly on devotion.\n\n### Package Inclusions\n- 7 Nights in Makkah (Hilton Suites / Pullman Zamzam)\n- 6 Nights in Madinah (Crowne Plaza Madinah / Anwar Al Madinah)\n- Daily international buffet breakfast\n- Private airport & intercity limousine or GMC transfers",
        coverImage: {
          url: storedUrls.pkgUmrahCover || "",
          alt: "Pilgrims in contemplation at the Prophet's Mosque",
        },
        gallery: [
          { url: storedUrls.pkgUmrahCover || "", alt: "Madinah Prophet's Mosque at dusk" },
          { url: storedUrls.destMakkah || "", alt: "Grand Mosque Makkah" },
        ],
        durationDays: 14,
        rating: "4.90",
        price: "185000",
        costPrice: "155000",
        startingPrice: "175000",
        currency: "BDT",
        isFeatured: true,
        itinerary: [
          { day: "1-7", title: "Makkah al-Mukarramah", details: "Perform Umrah with guide. Stay in 5-star hotel. Full Ziyarat included." },
          { day: "8-13", title: "Madinah al-Munawwarah", details: "Pray in the Rawdah. Visit Mount Uhud, Masjid Quba, and dates market." },
          { day: "14", title: "Return Flight to Dhaka", details: "Check-out and transfer to Madinah airport for return flight." },
        ],
        inclusions: [
          "5-Star hotels (walking distance to Harams)",
          "Daily buffet breakfast",
          "Comprehensive Saudi tourist/Umrah e-visa with health insurance",
          "Private ground transfers in AC coach/GMC",
          "Complete historical Ziyarat in both holy cities",
        ],
        exclusions: ["Lunch and Dinner", "Personal expenses"],
        status: "published",
        seo: {
          title: "Executive 14-Day Umrah Package | TripMate Travel",
          description: "High-end Umrah package with 5-star hotels in Makkah and Madinah.",
        },
      },
      {
        categoryId: tourCat.id,
        destinationId: myDest.id,
        title: "Malaysia & Singapore 7-Day Family Escape",
        slug: "malaysia-singapore-family-escape",
        summary: "7 Days across Kuala Lumpur, Genting Highlands, and Singapore. Features Universal Studios, Sentosa Island, and Genting SkyWorlds.",
        description: "## The Ultimate Southeast Asian Holiday\n\nExperience the best of two modern Asian metropolises in one unforgettable week. Perfectly balanced for families with children, couples, and leisure travelers.\n\n### Key Highlights\n- **Singapore**: Marina Bay Sands, Gardens by the Bay, Universal Studios Singapore\n- **Malaysia**: Petronas Twin Towers, Batu Caves, Genting SkyWorlds theme park\n- Full luxury cross-border coach transfer",
        coverImage: {
          url: storedUrls.pkgMalaysiaCover || "",
          alt: "Sentosa Island and Singapore skyline",
        },
        gallery: [
          { url: storedUrls.pkgMalaysiaCover || "", alt: "Universal Studios Sentosa" },
          { url: storedUrls.destMalaysia || "", alt: "Kuala Lumpur Petronas Towers" },
        ],
        durationDays: 7,
        rating: "4.85",
        price: "145000",
        costPrice: "122000",
        startingPrice: "135000",
        currency: "BDT",
        isFeatured: true,
        itinerary: [
          { day: "1", title: "Arrival in Singapore", details: "Changi airport greeting, hotel transfer, evening Marina Bay laser light show." },
          { day: "2", title: "Universal Studios Singapore & Sentosa", details: "Full day pass to Universal Studios rides, cable car transfer to Sentosa." },
          { day: "3", title: "Gardens by the Bay & Scenic Transfer to KL", details: "Visit Cloud Forest and Flower Dome. Luxury coach transfer to Kuala Lumpur." },
          { day: "4", title: "Genting Highlands & Cable Car", details: "Awana SkyWay cable car ride, indoor and outdoor Genting SkyWorlds theme park." },
          { day: "5", title: "Kuala Lumpur City Highlights & Batu Caves", details: "Petronas Twin Towers observation deck, King's Palace, Batu Caves temple." },
          { day: "6", title: "Sunway Lagoon Theme Park / Shopping", details: "Day of leisure at Sunway Lagoon water park or shopping at Pavilion Mall." },
          { day: "7", title: "Departure from Kuala Lumpur", details: "Souvenir shopping and transfer to KLIA for flight home to Dhaka." },
        ],
        inclusions: [
          "4-Star hotels with daily breakfast",
          "All theme park entry tickets (Universal Studios, Genting Cable Car)",
          "Cross-border AC luxury coach between Singapore and Malaysia",
          "City tours with English/Bengali-speaking guide",
          "Tourist visas for both Singapore and Malaysia",
        ],
        exclusions: ["Lunch and dinner (unless specified)", "Personal shopping"],
        status: "published",
        seo: {
          title: "Malaysia & Singapore Family Tour 7 Days | TripMate",
          description: "All-inclusive family holiday across Singapore and Malaysia with Universal Studios and Genting.",
        },
      },
      {
        categoryId: tourCat.id,
        destinationId: dubaiDest.id,
        title: "Luxury Dubai & Desert Safari 5-Day Retreat",
        slug: "luxury-dubai-desert-safari",
        summary: "5 Days of Middle Eastern glamour: Burj Khalifa At The Top, VIP 4x4 Desert Dune Bashing, Marina Dhow Cruise, and Miracle Garden.",
        description: "## Dazzling Skylines and Ancient Sands\n\nImmerse yourself in the captivating contrast of futuristic skyscrapers and serene desert sunsets.",
        coverImage: {
          url: storedUrls.pkgDubaiCover || "",
          alt: "Desert safari 4x4 dune bashing in Dubai",
        },
        gallery: [
          { url: storedUrls.pkgDubaiCover || "", alt: "Dubai Desert Safari" },
          { url: storedUrls.destDubai || "", alt: "Burj Khalifa Downtown" },
        ],
        durationDays: 5,
        rating: "4.88",
        price: "115000",
        costPrice: "94000",
        startingPrice: "105000",
        currency: "BDT",
        isFeatured: true,
        itinerary: [
          { day: "1", title: "Arrival in Dubai & Marina Dhow Cruise", details: "DXB airport reception, 4-star hotel check-in. Evening Marina dinner cruise with live entertainment." },
          { day: "2", title: "Burj Khalifa & Dubai Mall", details: "124th floor observation deck ticket, Dubai Aquarium visit, Fountain show." },
          { day: "3", title: "Thrilling 4x4 Desert Dune Safari", details: "Red dune bashing in Land Cruiser, camel ride, sandboarding, BBQ dinner under desert stars." },
          { day: "4", title: "Dubai Frame & Miracle Garden", details: "Morning photo tour of Dubai Frame, afternoon stroll through millions of flowers in Miracle Garden." },
          { day: "5", title: "Gold Souk & Departure", details: "Traditional Abra boat ride across Dubai Creek, Gold & Spice Souk shopping, airport transfer." },
        ],
        inclusions: [
          "4-Star accommodation with daily buffet breakfast",
          "Burj Khalifa At The Top entry ticket",
          "VIP 4x4 Desert Safari with BBQ dinner buffet",
          "Marina Dhow Dinner Cruise",
          "Dubai 30-Day Tourist Visa & Insurance",
        ],
        exclusions: ["Personal expenses", "Tourism Dirham hotel fee (approx $4/night)"],
        status: "published",
      },
      {
        categoryId: tourCat.id,
        destinationId: maldivesDest.id,
        title: "Maldives Overwater Resort Honeymoon 4-Day",
        slug: "maldives-resort-honeymoon",
        summary: "4 Days in a private luxury overwater villa, private speedboat transfers, sunset dolphin cruise, and all-inclusive gourmet dining.",
        description: "## Unrivaled Romance on the Indian Ocean\n\nStep off your private sun deck directly into turquoise waters filled with vibrant coral reefs.",
        coverImage: {
          url: storedUrls.pkgMaldivesCover || "",
          alt: "Maldives overwater villa resort",
        },
        durationDays: 4,
        rating: "4.92",
        price: "165000",
        costPrice: "138000",
        startingPrice: "155000",
        currency: "BDT",
        isFeatured: true,
        inclusions: [
          "Private Water Villa at 4-Star Deluxe Island Resort",
          "Full board gourmet meals (Breakfast, Lunch, Dinner & Drinks)",
          "Roundtrip airport speedboat transfers",
          "Complimentary sunset dolphin cruise",
          "Free snorkeling equipment rental",
        ],
        exclusions: ["International flights from Dhaka", "Spa and scuba diving treatments"],
        status: "published",
      },
      {
        categoryId: medicalCat.id,
        destinationId: myDest.id,
        title: "Executive Medical Checkup & Wellness Travel - Kuala Lumpur",
        slug: "malaysia-medical-travel-package",
        summary: "Comprehensive executive health screening at JCI-accredited Prince Court Medical Centre, luxury hotel stay, and dedicated medical concierge.",
        description: "## World-Class Healthcare With Warm Hospitality\n\nMalaysia is consistently ranked among the world's top healthcare destinations. This package combines an exhaustive health screening with a serene holiday.",
        coverImage: {
          url: storedUrls.destMalaysia || "",
          alt: "Prince Court Medical Centre Kuala Lumpur",
        },
        durationDays: 5,
        rating: "4.80",
        price: "120000",
        costPrice: "98000",
        startingPrice: "110000",
        currency: "BDT",
        isFeatured: false,
        inclusions: [
          "Comprehensive Executive Health Screening (Cardiology, Full Blood Panel, Ultrasound, Cancer Markers)",
          "Doctor consultation and same-day personalized report review",
          "4-Star hotel near medical district with daily breakfast",
          "Dedicated medical travel chaperone and hospital transfers",
        ],
        exclusions: ["Any additional surgeries or specialist follow-up treatments"],
        status: "published",
      },
    ]);
  }

  // --------------------------------------------------------------------------
  // 8. Payment Gateways (bKash, Nagad, Rocket, Bank Transfer, Pay Later)
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding payment gateways...");

  let gateways = await db.select().from(paymentGateways);
  if (gateways.length === 0) {
    gateways = await db
      .insert(paymentGateways)
      .values([
        {
          name: "bKash (Manual MFS)",
          kind: "manual",
          sortOrder: 1,
          config: {
            accountType: "personal",
            number: "01711-234567",
            channel: "bkash",
          },
          instructions: "Open your bKash app and select 'Send Money'. Enter our official personal number below, complete the transfer, and submit your Transaction ID and Sender Number.",
          isActive: true,
        },
        {
          name: "Nagad (Manual MFS)",
          kind: "manual",
          sortOrder: 2,
          config: {
            accountType: "merchant",
            number: "01811-345678",
            channel: "nagad",
          },
          instructions: "Open your Nagad app and select 'Payment' (Merchant). Enter our merchant account number, make payment, and enter the transaction reference below.",
          isActive: true,
        },
        {
          name: "Rocket (Manual MFS)",
          kind: "manual",
          sortOrder: 3,
          config: {
            accountType: "personal",
            number: "01911-456789-2",
            channel: "rocket",
          },
          instructions: "Select 'Send Money' on DBBL Rocket, transfer to the number below, and enter your Rocket Transaction ID.",
          isActive: true,
        },
        {
          name: "Bank Wire / Deposit (The City Bank PLC)",
          kind: "manual",
          sortOrder: 4,
          config: {
            accountType: "bank",
            bankName: "The City Bank PLC",
            accountName: "TripMate Travel & Tours Ltd",
            accountNo: "1102938475001",
            branch: "Gulshan-2 Corporate Branch, Dhaka",
            routing: "225271837",
          },
          instructions: "Transfer funds via Internet Banking (BEFTN/NPSB/RTGS) or deposit directly at any City Bank branch. Enter your deposit reference number and upload a screenshot/deposit slip.",
          isActive: true,
        },
        {
          name: "Pay Later (Advisor Assisted)",
          kind: "paylater",
          sortOrder: 5,
          config: {
            accountType: "paylater",
          },
          instructions: "Choose Pay Later to place your order reservation now without immediate payment. A TripMate travel consultant will contact you within 2 business hours to arrange payment methods before ticket issuance.",
          isActive: true,
        },
      ])
      .returning();
  }

  // --------------------------------------------------------------------------
  // 9. Expense Categories & Realistic Sample Expenses for P&L
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding expense taxonomy and realistic financials...");

  let expCats = await db.select().from(expenseCategories);
  if (expCats.length === 0) {
    expCats = await db
      .insert(expenseCategories)
      .values([
        { name: "Office & Rent", kind: "operational", description: "Gulshan head office lease, building service, power" },
        { name: "Marketing & Meta CAPI Ads", kind: "operational", description: "Facebook & Instagram targeted advertising, search ads" },
        { name: "Staff Salaries & Travel Guides", kind: "operational", description: "Permanent operational payroll and seasonal guides" },
        { name: "Airline Ticket Procurement", kind: "cost_of_sales", description: "Direct group ticket issuance via Biman & Saudia" },
        { name: "Hotel Accommodations (Makkah & Madinah)", kind: "cost_of_sales", description: "Direct hotel room bookings tied to confirmed packages" },
        { name: "Embassy & Government Visa Fees", kind: "cost_of_sales", description: "Consular visa fees paid to official embassies" },
      ])
      .returning();
  }

  const existingExpenses = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenses);

  if (existingExpenses[0]?.count === 0 && expCats.length > 0) {
    const rentCat = expCats.find((c) => c.name.includes("Rent")) || expCats[0];
    const adCat = expCats.find((c) => c.name.includes("Marketing")) || expCats[1];
    const airCat = expCats.find((c) => c.name.includes("Airline")) || expCats[2];

    const todayStr = new Date().toISOString().split("T")[0];
    await db.insert(expenses).values([
      {
        categoryId: rentCat.id,
        amount: "120000",
        currency: "BDT",
        date: todayStr,
        description: "Monthly Gulshan-2 branch office lease payment",
        vendor: "Concord Properties Ltd",
        status: "approved",
      },
      {
        categoryId: adCat.id,
        amount: "45000",
        currency: "BDT",
        date: todayStr,
        description: "Meta CAPI Umrah & Hajj campaign spend",
        vendor: "Meta Platforms Ireland",
        status: "approved",
      },
      {
        categoryId: airCat.id,
        amount: "380000",
        currency: "BDT",
        date: todayStr,
        description: "Group air tickets block booking on Saudia (SV805)",
        vendor: "Saudi Arabian Airlines",
        status: "approved",
      },
    ]);
  }

  // --------------------------------------------------------------------------
  // 10. Travel Guides & Articles (Content Module)
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding travel guides and articles...");

  let postCats = await db.select().from(postCategories);
  if (postCats.length === 0) {
    postCats = await db
      .insert(postCategories)
      .values([
        { name: "Pilgrimage Advice", slug: "pilgrimage" },
        { name: "Family Travel", slug: "family-travel" },
        { name: "Visa Guidelines", slug: "visa-guidelines" },
      ])
      .returning();
  }

  const existingPosts = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts);

  if (existingPosts[0]?.count === 0 && postCats.length > 0) {
    const pilCat = postCats.find((p) => p.slug === "pilgrimage") || postCats[0];
    const famCat = postCats.find((p) => p.slug === "family-travel") || postCats[1];

    await db.insert(posts).values([
      {
        categoryId: pilCat.id,
        title: "First-Time Umrah: Complete Step-by-Step Spiritual & Practical Guide",
        slug: "first-time-umrah-guide",
        excerpt: "Everything you need to know before embarking on your sacred pilgrimage: Ihram rules, Tawaf etiquette, packing essentials, and avoiding common mistakes.",
        content: `## The Journey of Hearts\n\nPerforming Umrah is a transformative spiritual experience for millions of Muslims each year. Whether you are traveling for the first time or returning to the holy sanctuaries, proper preparation ensures you maximize every precious moment in Makkah and Madinah.\n\n### 1. Entering the State of Ihram\nPilgrims traveling from Bangladesh by air will enter Ihram at or before the designated Miqat (Yalamlam for flights arriving via the southern route). Ensure you shower, trim nails, and make your intention (*Niyyah*) before the aircraft passes over the boundary.\n\n### 2. The Four Pillars of Umrah\n1. **Ihram**: The sacred intention and state.\n2. **Tawaf**: Seven anti-clockwise circumambulations around the Holy Kaaba.\n3. **Sa'i**: Walking seven times between the hills of Safa and Marwah.\n4. **Halq or Taqsir**: Shaving or trimming the hair to mark completion.\n\n### Practical Tips for Bangladeshi Pilgrims\n- Keep a pair of comfortable walking sandals.\n- Stay well-hydrated with Zamzam water available in abundance.\n- Download the official Nusuk app for Rawdah visiting permits.`,
        featuredImage: {
          url: storedUrls.guideUmrah || "",
          alt: "Umrah prayer beads and Islamic holy sanctuary",
        },
        status: "published",
        publishedAt: new Date(),
        seo: {
          title: "First-Time Umrah Guide for Bangladeshi Pilgrims | TripMate",
          description: "Comprehensive step-by-step Umrah preparation guide with Ihram guidelines and tips.",
        },
      },
      {
        categoryId: famCat.id,
        title: "Top 7 Things to Do in Malaysia with Kids for an Unforgettable Vacation",
        slug: "malaysia-family-vacation-tips",
        excerpt: "From thrilling cable cars in Genting Highlands to interactive animal encounters in Sunway Lagoon, explore the ultimate family-friendly Malaysian itinerary.",
        content: `## Family Fun in Tropical Southeast Asia\n\nMalaysia remains the top choice for Bangladeshi families traveling with young children and seniors. Its modern infrastructure, halal cuisine everywhere, and friendly hospitality make it effortless to explore.\n\n### 1. Genting SkyWorlds Theme Park\nPerched atop Genting Highlands at 6,000 feet, enjoy cool mountain air and state-of-the-art cinematic rides.\n\n### 2. Aquaria KLCC\nLocated directly underneath the iconic Petronas Towers, walk through a 90-meter underwater tunnel surrounded by tiger sharks and giant stingrays.\n\n### 3. Sunway Lagoon Water Park\nCool off in massive surf wave pools and wildlife sanctuaries located 30 minutes from Kuala Lumpur.`,
        featuredImage: {
          url: storedUrls.guideMalaysia || "",
          alt: "Scenic tea plantations in Cameron Highlands, Malaysia",
        },
        status: "published",
        publishedAt: new Date(),
        seo: {
          title: "Top 7 Things to Do in Malaysia with Kids | TripMate",
          description: "Discover the best family attractions in Kuala Lumpur, Genting, and Penang.",
        },
      },
    ]);
  }

  // --------------------------------------------------------------------------
  // 11. Static Pages (About, FAQ, Terms, Privacy)
  // --------------------------------------------------------------------------
  console.log("[demo-seed] Seeding static legal and information pages...");
  await seedStaticContent(db);

  console.log("[demo-seed] Realistic TripMate showcase seeding finished successfully!");
  return { ok: true };
}
