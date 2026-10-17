import "server-only";

import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { testimonials, type Testimonial } from "./testimonials-schema";
import { listings } from "@/modules/catalog/schema";
import { getSetting } from "@/modules/settings/service";
import type { TestimonialInput } from "./testimonials-validation";

export type TestimonialWithPackage = Testimonial & {
  packageName: string | null;
};

export type ListTestimonialsQuery = {
  search?: string;
  isPublished?: boolean;
  featured?: boolean;
  page?: number;
  perPage?: number;
};

/** List testimonials with optional search, filtering, and package relation */
export async function listTestimonials(
  query: ListTestimonialsQuery = {},
): Promise<{ items: TestimonialWithPackage[]; total: number; page: number; perPage: number }> {
  // Ensure legacy records are migrated if table is empty
  await importLegacyTestimonialsIfEmpty().catch(() => {});

  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(100, Math.max(1, query.perPage ?? 20));
  const offset = (page - 1) * perPage;

  const conditions = [];

  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    conditions.push(
      or(
        ilike(testimonials.name, term),
        ilike(testimonials.tripLabel, term),
        ilike(testimonials.quote, term),
      ),
    );
  }

  if (typeof query.isPublished === "boolean") {
    conditions.push(eq(testimonials.isPublished, query.isPublished));
  }

  if (typeof query.featured === "boolean") {
    conditions.push(eq(testimonials.featured, query.featured));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(testimonials)
      .where(whereClause),
    db
      .select({
        id: testimonials.id,
        name: testimonials.name,
        tripLabel: testimonials.tripLabel,
        packageId: testimonials.packageId,
        quote: testimonials.quote,
        rating: testimonials.rating,
        photoUrl: testimonials.photoUrl,
        videoUrl: testimonials.videoUrl,
        galleryUrls: testimonials.galleryUrls,
        featured: testimonials.featured,
        isPublished: testimonials.isPublished,
        sortOrder: testimonials.sortOrder,
        createdAt: testimonials.createdAt,
        updatedAt: testimonials.updatedAt,
        packageName: listings.title,
      })
      .from(testimonials)
      .leftJoin(listings, eq(testimonials.packageId, listings.id))
      .where(whereClause)
      .orderBy(desc(testimonials.featured), asc(testimonials.sortOrder), desc(testimonials.createdAt))
      .limit(perPage)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return {
    items: rows as TestimonialWithPackage[],
    total,
    page,
    perPage,
  };
}

/** Get single testimonial by ID */
export async function getTestimonialById(id: string): Promise<TestimonialWithPackage | null> {
  const [row] = await db
    .select({
      id: testimonials.id,
      name: testimonials.name,
      tripLabel: testimonials.tripLabel,
      packageId: testimonials.packageId,
      quote: testimonials.quote,
      rating: testimonials.rating,
      photoUrl: testimonials.photoUrl,
      videoUrl: testimonials.videoUrl,
      galleryUrls: testimonials.galleryUrls,
      featured: testimonials.featured,
      isPublished: testimonials.isPublished,
      sortOrder: testimonials.sortOrder,
      createdAt: testimonials.createdAt,
      updatedAt: testimonials.updatedAt,
      packageName: listings.title,
    })
    .from(testimonials)
    .leftJoin(listings, eq(testimonials.packageId, listings.id))
    .where(eq(testimonials.id, id))
    .limit(1);

  return (row as TestimonialWithPackage) || null;
}

/** Create new testimonial */
export async function createTestimonial(input: TestimonialInput): Promise<Testimonial> {
  const [created] = await db
    .insert(testimonials)
    .values({
      name: input.name,
      tripLabel: input.tripLabel?.trim() || null,
      packageId: input.packageId || null,
      quote: input.quote,
      rating: input.rating,
      photoUrl: input.photoUrl?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      galleryUrls: input.galleryUrls && input.galleryUrls.length > 0 ? input.galleryUrls : null,
      featured: input.featured,
      isPublished: input.isPublished,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

/** Update existing testimonial */
export async function updateTestimonial(id: string, input: TestimonialInput): Promise<Testimonial | null> {
  const [updated] = await db
    .update(testimonials)
    .set({
      name: input.name,
      tripLabel: input.tripLabel?.trim() || null,
      packageId: input.packageId || null,
      quote: input.quote,
      rating: input.rating,
      photoUrl: input.photoUrl?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      galleryUrls: input.galleryUrls && input.galleryUrls.length > 0 ? input.galleryUrls : null,
      featured: input.featured,
      isPublished: input.isPublished,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(testimonials.id, id))
    .returning();

  return updated || null;
}

/** Delete testimonial */
export async function deleteTestimonial(id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(testimonials)
    .where(eq(testimonials.id, id))
    .returning({ id: testimonials.id });

  return Boolean(deleted);
}

/** Toggle published state */
export async function toggleTestimonialPublished(id: string, isPublished: boolean): Promise<boolean> {
  const [updated] = await db
    .update(testimonials)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
    .returning({ id: testimonials.id });

  return Boolean(updated);
}

/** Toggle featured state */
export async function toggleTestimonialFeatured(id: string, featured: boolean): Promise<boolean> {
  const [updated] = await db
    .update(testimonials)
    .set({ featured, updatedAt: new Date() })
    .where(eq(testimonials.id, id))
    .returning({ id: testimonials.id });

  return Boolean(updated);
}

/**
 * Public testimonials fetcher:
 * Returns published testimonials ordered by featured first, then sortOrder, then createdAt.
 */
export async function getPublicTestimonials(limit = 12): Promise<TestimonialWithPackage[]> {
  // Ensure legacy records are migrated if table is empty
  await importLegacyTestimonialsIfEmpty().catch(() => {});

  const rows = await db
    .select({
      id: testimonials.id,
      name: testimonials.name,
      tripLabel: testimonials.tripLabel,
      packageId: testimonials.packageId,
      quote: testimonials.quote,
      rating: testimonials.rating,
      photoUrl: testimonials.photoUrl,
      videoUrl: testimonials.videoUrl,
      galleryUrls: testimonials.galleryUrls,
      featured: testimonials.featured,
      isPublished: testimonials.isPublished,
      sortOrder: testimonials.sortOrder,
      createdAt: testimonials.createdAt,
      updatedAt: testimonials.updatedAt,
      packageName: listings.title,
    })
    .from(testimonials)
    .leftJoin(listings, eq(testimonials.packageId, listings.id))
    .where(eq(testimonials.isPublished, true))
    .orderBy(desc(testimonials.featured), asc(testimonials.sortOrder), desc(testimonials.createdAt))
    .limit(limit);

  return rows as TestimonialWithPackage[];
}

let migrationChecked = false;

/**
 * One-time data migration: imports legacy JSON testimonials from settings.home
 * into the new testimonials table if the table has no records yet.
 */
export async function importLegacyTestimonialsIfEmpty(): Promise<number> {
  if (migrationChecked) return 0;
  migrationChecked = true;

  try {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(testimonials);

    if (Number(countRow?.count ?? 0) > 0) {
      return 0; // Already has records, no migration needed
    }

    const homeRaw = (await getSetting("home")) as Record<string, unknown> | null;
    if (!homeRaw || !Array.isArray(homeRaw.testimonials) || homeRaw.testimonials.length === 0) {
      return 0;
    }

    type LegacyItem = { quote?: string; name?: string; trip?: string | null };
    const items = homeRaw.testimonials as LegacyItem[];

    let imported = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.quote && item.name) {
        await db.insert(testimonials).values({
          name: item.name.trim(),
          tripLabel: item.trip?.trim() || null,
          quote: item.quote.trim(),
          rating: 5,
          featured: true,
          isPublished: true,
          sortOrder: i,
          updatedAt: new Date(),
        });
        imported++;
      }
    }

    if (imported > 0) {
      console.log(`[Testimonials Migration] Successfully imported ${imported} legacy testimonials from settings.home.`);
    }

    return imported;
  } catch (err) {
    console.error("[Testimonials Migration] Failed to import legacy testimonials:", err);
    return 0;
  }
}
