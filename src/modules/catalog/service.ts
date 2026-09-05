import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
import { destinations, listings, serviceCategories } from "@/modules/catalog/schema";
import type {
  CategoryInput,
  DestinationInput,
  ListingImage,
  ListingInput,
  ListingStatus,
  ItineraryItem,
  ServiceKind,
  Seo,
} from "@/modules/catalog/validation";

// All DB queries for the catalog module. Server-only — importing this into a
// client bundle fails the build. Numeric columns come back from Postgres as
// strings; the mapper converts price/rating to numbers at this boundary so
// callers never see drizzle's string representation.
//
// Slug uniqueness is a DB concern: the upserts surface the unique-violation as
// a typed CatalogError(SLUG_CONFLICT). JSONB cells are free-form at rest; every
// read is projected defensively into the documented shapes below.

// ---- public types ------------------------------------------------------------

export type Category = {
  id: string;
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Destination = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  isActive: boolean;
};

export type ListingCategory = {
  id: string;
  name: string;
  slug: string;
  kind: ServiceKind;
  redirectUrl: string | null;
};

export type ListingDestination = { id: string; name: string; slug: string };

export type ListingWithRefs = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  coverImage: ListingImage | null;
  gallery: ListingImage[];
  videoUrl: string | null;
  durationDays: number | null;
  rating: number | null;
  price: number | null;
  currency: string;
  itinerary: ItineraryItem[];
  inclusions: string[];
  exclusions: string[];
  formConfig: Record<string, unknown> | null;
  seo: Seo | null;
  status: ListingStatus;
  categoryId: string;
  destinationId: string | null;
  category: ListingCategory;
  destination: ListingDestination | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Paginated<T> = { items: T[]; total: number };

// ---- errors ------------------------------------------------------------------

export class CatalogError extends Error {
  constructor(
    public code: "SLUG_CONFLICT" | "IN_USE" | "NOT_FOUND" | "INVALID_REFERENCE",
    message: string,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

/** drizzle wraps driver errors in DrizzleQueryError; the pg error code
 *  (e.g. 23505) lives on the underlying cause, so walk the cause chain. */
function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth++) {
    if (typeof current === "object" && (current as { code?: string }).code === "23505") {
      return true;
    }
    current =
      typeof current === "object" ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}

// ---- listing reads ------------------------------------------------------------

export type PublishedListingsQuery = {
  search?: string;
  categorySlug?: string;
  destinationSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  perPage?: number;
};

export type AdminListingsQuery = {
  search?: string;
  status?: ListingStatus;
  page?: number;
  perPage?: number;
};

const listingCols = {
  listing: {
    id: listings.id,
    categoryId: listings.categoryId,
    destinationId: listings.destinationId,
    title: listings.title,
    slug: listings.slug,
    summary: listings.summary,
    description: listings.description,
    coverImage: listings.coverImage,
    gallery: listings.gallery,
    videoUrl: listings.videoUrl,
    durationDays: listings.durationDays,
    rating: listings.rating,
    price: listings.price,
    currency: listings.currency,
    itinerary: listings.itinerary,
    inclusions: listings.inclusions,
    exclusions: listings.exclusions,
    formConfig: listings.formConfig,
    status: listings.status,
    seo: listings.seo,
    createdAt: listings.createdAt,
    updatedAt: listings.updatedAt,
  },
  category: {
    id: serviceCategories.id,
    name: serviceCategories.name,
    slug: serviceCategories.slug,
    kind: serviceCategories.kind,
    redirectUrl: serviceCategories.redirectUrl,
  },
  destination: {
    id: destinations.id,
    name: destinations.name,
    slug: destinations.slug,
  },
} as const;

type ListingRow = {
  listing: {
    id: string;
    categoryId: string;
    destinationId: string | null;
    title: string;
    slug: string;
    summary: string | null;
    description: string | null;
    coverImage: unknown;
    gallery: unknown;
    videoUrl: string | null;
    durationDays: number | null;
    rating: string | null;
    price: string | null;
    currency: string;
    itinerary: unknown;
    inclusions: unknown;
    exclusions: unknown;
    formConfig: unknown;
    status: ListingStatus;
    seo: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
  category: {
    id: string;
    name: string;
    slug: string;
    kind: ServiceKind;
    redirectUrl: string | null;
  };
  destination: { id: string; name: string; slug: string } | null;
};

function listingQuery() {
  return db
    .select(listingCols)
    .from(listings)
    .innerJoin(serviceCategories, eq(listings.categoryId, serviceCategories.id))
    .leftJoin(destinations, eq(listings.destinationId, destinations.id));
}

function listingCountQuery() {
  return db
    .select({ total: sql<number>`count(*)::int` })
    .from(listings)
    .innerJoin(serviceCategories, eq(listings.categoryId, serviceCategories.id))
    .leftJoin(destinations, eq(listings.destinationId, destinations.id));
}

/** Escape LIKE wildcards so user search input is treated literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Search hits the listing title OR the joined destination name. */
function listingSearchCondition(query: string): SQL {
  const pattern = `%${escapeLike(query)}%`;
  return or(
    ilike(listings.title, pattern),
    ilike(destinations.name, pattern),
  ) as SQL;
}

function pagination(page?: number, perPage?: number, defaultPerPage = 12) {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safePerPage = Math.min(50, Math.max(1, Math.floor(perPage ?? defaultPerPage)));
  return { page: safePage, perPage: safePerPage, offset: (safePage - 1) * safePerPage };
}

export async function listPublishedListings(
  query: PublishedListingsQuery = {},
): Promise<Paginated<ListingWithRefs>> {
  const conditions: SQL[] = [
    eq(listings.status, "published"),
    isNull(listings.deletedAt),
  ];

  const search = query.search?.trim();
  if (search) conditions.push(listingSearchCondition(search));
  if (query.categorySlug) conditions.push(eq(serviceCategories.slug, query.categorySlug));
  if (query.destinationSlug) conditions.push(eq(destinations.slug, query.destinationSlug));
  if (query.minPrice !== undefined) conditions.push(gte(listings.price, query.minPrice.toFixed(2)));
  if (query.maxPrice !== undefined) conditions.push(lte(listings.price, query.maxPrice.toFixed(2)));

  const where = and(...conditions);
  const { offset, perPage } = pagination(query.page, query.perPage, 12);

  const [countRow] = await listingCountQuery().where(where);
  const rows = await listingQuery()
    .where(where)
    .orderBy(desc(listings.createdAt), desc(listings.id))
    .limit(perPage)
    .offset(offset);

  return { items: rows.map(toListing), total: countRow.total };
}

export async function getListingBySlug(slug: string): Promise<ListingWithRefs | null> {
  const rows = await listingQuery()
    .where(
      and(
        eq(listings.slug, slug),
        eq(listings.status, "published"),
        isNull(listings.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ? toListing(rows[0]) : null;
}

export async function listAllListings(
  query: AdminListingsQuery = {},
): Promise<Paginated<ListingWithRefs>> {
  const conditions: SQL[] = [isNull(listings.deletedAt)];

  const search = query.search?.trim();
  if (search) conditions.push(listingSearchCondition(search));
  if (query.status) conditions.push(eq(listings.status, query.status));

  const where = and(...conditions);
  const { offset, perPage } = pagination(query.page, query.perPage, 20);

  const [countRow] = await listingCountQuery().where(where);
  const rows = await listingQuery()
    .where(where)
    .orderBy(desc(listings.createdAt), desc(listings.id))
    .limit(perPage)
    .offset(offset);

  return { items: rows.map(toListing), total: countRow.total };
}

export async function getListingById(id: string): Promise<ListingWithRefs | null> {
  const rows = await listingQuery()
    .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
    .limit(1);
  return rows[0] ? toListing(rows[0]) : null;
}

// ---- categories & destinations reads ------------------------------------------

export async function listCategories(activeOnly: boolean): Promise<Category[]> {
  return db
    .select({
      id: serviceCategories.id,
      name: serviceCategories.name,
      slug: serviceCategories.slug,
      kind: serviceCategories.kind,
      redirectUrl: serviceCategories.redirectUrl,
      icon: serviceCategories.icon,
      sortOrder: serviceCategories.sortOrder,
      isActive: serviceCategories.isActive,
    })
    .from(serviceCategories)
    .where(activeOnly ? eq(serviceCategories.isActive, true) : undefined)
    .orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name));
}

export async function listDestinations(activeOnly = true): Promise<Destination[]> {
  return db
    .select({
      id: destinations.id,
      name: destinations.name,
      slug: destinations.slug,
      image: destinations.image,
      isActive: destinations.isActive,
    })
    .from(destinations)
    .where(activeOnly ? eq(destinations.isActive, true) : undefined)
    .orderBy(asc(destinations.name));
}

// ---- listing writes -----------------------------------------------------------

type ListingWrite = Pick<typeof listings.$inferInsert, "title" | "slug" | "categoryId"> &
  Partial<Omit<typeof listings.$inferInsert, "title" | "slug" | "categoryId">>;

/** Maps a validated input to DB columns; absent fields are left out so partial
 *  updates never clobber stored values the caller did not send. */
function toListingWrite(input: ListingInput): ListingWrite {
  const w: ListingWrite = {
    title: input.title,
    slug: input.slug,
    categoryId: input.categoryId,
  };
  if (input.destinationId !== undefined) w.destinationId = input.destinationId;
  if (input.summary !== undefined) w.summary = input.summary || null;
  if (input.description !== undefined) w.description = input.description || null;
  if (input.coverImage !== undefined) {
    w.coverImage = input.coverImage ? { url: input.coverImage } : null;
  }
  if (input.gallery !== undefined) w.gallery = input.gallery;
  if (input.videoUrl !== undefined) w.videoUrl = input.videoUrl || null;
  if (input.durationDays !== undefined) w.durationDays = input.durationDays;
  if (input.rating !== undefined) {
    w.rating = input.rating === null ? null : input.rating.toFixed(2);
  }
  if (input.price !== undefined) {
    w.price = input.price === null ? null : input.price.toFixed(2);
  }
  if (input.currency !== undefined) w.currency = input.currency;
  if (input.itinerary !== undefined) w.itinerary = input.itinerary;
  if (input.inclusions !== undefined) w.inclusions = input.inclusions;
  if (input.exclusions !== undefined) w.exclusions = input.exclusions;
  if (input.formConfig !== undefined) w.formConfig = input.formConfig;
  if (input.status !== undefined) w.status = input.status;
  if (input.seo !== undefined) w.seo = input.seo;
  return w;
}

/**
 * Referential guard (admin surface carry-in): a listing may only point at a
 * category/destination that still exists AND is active. This keeps a
 * deactivated taxonomy item from silently absorbing new content — the UI
 * surfaces the typed INVALID_REFERENCE error so the operator reactivates the
 * item (or picks another) instead of saving into a hidden branch.
 */
async function assertListingReferences(input: ListingInput): Promise<void> {
  const [category] = await db
    .select({ isActive: serviceCategories.isActive })
    .from(serviceCategories)
    .where(eq(serviceCategories.id, input.categoryId))
    .limit(1);
  if (!category) {
    throw new CatalogError("INVALID_REFERENCE", "The selected category no longer exists.");
  }
  if (!category.isActive) {
    throw new CatalogError(
      "INVALID_REFERENCE",
      "The selected category is inactive — activate it before saving a listing under it.",
    );
  }

  if (input.destinationId) {
    const [destination] = await db
      .select({ isActive: destinations.isActive })
      .from(destinations)
      .where(eq(destinations.id, input.destinationId))
      .limit(1);
    if (!destination) {
      throw new CatalogError("INVALID_REFERENCE", "The selected destination no longer exists.");
    }
    if (!destination.isActive) {
      throw new CatalogError(
        "INVALID_REFERENCE",
        "The selected destination is inactive — activate it before saving a listing under it.",
      );
    }
  }
}

async function listingSlugExists(slug: string): Promise<boolean> {
  const rows = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.slug, slug))
    .limit(1);
  return rows.length > 0;
}

/** First free `base-2`, `base-3`, … slug not already used (live OR trashed). */
async function nextFreeListingSlug(base: string): Promise<string> {
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await listingSlugExists(candidate))) return candidate;
  }
  throw new CatalogError("SLUG_CONFLICT", `No free slug available for "${base}".`);
}

/**
 * Insert with admin-friendly slug recovery. When the insert collides with a
 * row that was soft-deleted (the classic "recreate after trash" flow), we
 * re-try under the next free `-2`/`-3`/… suffixed slug instead of failing. A
 * collision with a LIVE row is a genuine conflict and stays a typed
 * SLUG_CONFLICT error.
 */
async function insertListingWithSlugRecovery(
  write: ListingWrite,
  slug: string,
): Promise<string> {
  try {
    const [created] = await db
      .insert(listings)
      .values(write)
      .returning({ id: listings.id });
    return created.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const [blocker] = await db
      .select({ deletedAt: listings.deletedAt })
      .from(listings)
      .where(eq(listings.slug, slug))
      .limit(1);
    if (!blocker || blocker.deletedAt === null) {
      throw new CatalogError(
        "SLUG_CONFLICT",
        `A listing with slug "${slug}" already exists.`,
      );
    }
    const free = await nextFreeListingSlug(slug);
    try {
      const [created] = await db
        .insert(listings)
        .values({ ...write, slug: free })
        .returning({ id: listings.id });
      return created.id;
    } catch (retryErr) {
      if (isUniqueViolation(retryErr)) {
        throw new CatalogError(
          "SLUG_CONFLICT",
          `A listing with slug "${free}" already exists.`,
        );
      }
      throw retryErr;
    }
  }
}

export async function upsertListing(input: ListingInput): Promise<ListingWithRefs> {
  await assertListingReferences(input);
  const write = toListingWrite(input);
  let id: string | undefined = input.id;

  if (id) {
    try {
      const updated = await db
        .update(listings)
        .set({ ...write, updatedAt: new Date() })
        .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
        .returning({ id: listings.id });
      if (updated.length === 0) {
        throw new CatalogError("NOT_FOUND", `Listing ${id} not found or already deleted.`);
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new CatalogError(
          "SLUG_CONFLICT",
          `A listing with slug "${input.slug}" already exists.`,
        );
      }
      throw err;
    }
  } else {
    id = await insertListingWithSlugRecovery(write, input.slug);
  }

  const saved = await getListingById(id as string);
  if (!saved) throw new CatalogError("NOT_FOUND", "Listing could not be loaded after save.");
  return saved;
}

export async function softDeleteListing(id: string): Promise<boolean> {
  const [row] = await db
    .update(listings)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
    .returning({ id: listings.id });
  return Boolean(row);
}

/** Publish/unpublish/archive without touching any other listing column. */
export async function updateListingStatus(
  id: string,
  status: ListingStatus,
): Promise<ListingWithRefs> {
  const [row] = await db
    .update(listings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
    .returning({ id: listings.id });
  if (!row) {
    throw new CatalogError("NOT_FOUND", `Listing ${id} not found or already deleted.`);
  }
  const saved = await getListingById(id);
  if (!saved) throw new CatalogError("NOT_FOUND", "Listing could not be loaded after status change.");
  return saved;
}

async function countNonDeletedListingsFor(condition: SQL): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(condition, isNull(listings.deletedAt)));
  return row.total;
}

// ---- category writes ----------------------------------------------------------

type ServiceCategoriesRow = typeof serviceCategories.$inferSelect;
type CategoryWrite = Pick<ServiceCategoriesRow, "name" | "slug" | "kind"> &
  Partial<Omit<ServiceCategoriesRow, "name" | "slug" | "kind">>;

function toCategory(row: ServiceCategoriesRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    redirectUrl: row.redirectUrl,
    icon: row.icon,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

function toCategoryWrite(input: CategoryInput): CategoryWrite {
  return {
    name: input.name,
    slug: input.slug,
    kind: input.kind,
    redirectUrl: input.redirectUrl || null,
    icon: input.icon || null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };
}

export async function upsertCategory(input: CategoryInput): Promise<Category> {
  const write = toCategoryWrite(input);
  try {
    let rows: ServiceCategoriesRow[];
    if (input.id) {
      rows = await db
        .update(serviceCategories)
        .set({ ...write, updatedAt: new Date() })
        .where(eq(serviceCategories.id, input.id))
        .returning();
      if (rows.length === 0) {
        throw new CatalogError("NOT_FOUND", `Category ${input.id} not found.`);
      }
    } else {
      rows = await db.insert(serviceCategories).values(write).returning();
    }
    return toCategory(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new CatalogError("SLUG_CONFLICT", `A category with slug "${input.slug}" already exists.`);
    }
    throw err;
  }
}

export async function softDeleteCategory(id: string): Promise<boolean> {
  const referencing = await countNonDeletedListingsFor(eq(listings.categoryId, id));
  if (referencing > 0) {
    throw new CatalogError(
      "IN_USE",
      `Category cannot be deactivated — ${referencing} listing(s) still reference it.`,
    );
  }
  const [row] = await db
    .update(serviceCategories)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(serviceCategories.id, id))
    .returning({ id: serviceCategories.id });
  return Boolean(row);
}

// ---- destination writes -------------------------------------------------------

type DestinationsRow = typeof destinations.$inferSelect;
type DestinationWrite = Pick<DestinationsRow, "name" | "slug"> &
  Partial<Omit<DestinationsRow, "name" | "slug">>;

function toDestination(row: DestinationsRow): Destination {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: row.image,
    isActive: row.isActive,
  };
}

function toDestinationWrite(input: DestinationInput): DestinationWrite {
  return {
    name: input.name,
    slug: input.slug,
    image: input.image || null,
    isActive: input.isActive,
  };
}

export async function upsertDestination(input: DestinationInput): Promise<Destination> {
  const write = toDestinationWrite(input);
  try {
    let rows: DestinationsRow[];
    if (input.id) {
      rows = await db
        .update(destinations)
        .set({ ...write, updatedAt: new Date() })
        .where(eq(destinations.id, input.id))
        .returning();
      if (rows.length === 0) {
        throw new CatalogError("NOT_FOUND", `Destination ${input.id} not found.`);
      }
    } else {
      rows = await db.insert(destinations).values(write).returning();
    }
    return toDestination(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new CatalogError("SLUG_CONFLICT", `A destination with slug "${input.slug}" already exists.`);
    }
    throw err;
  }
}

export async function softDeleteDestination(id: string): Promise<boolean> {
  const referencing = await countNonDeletedListingsFor(eq(listings.destinationId, id));
  if (referencing > 0) {
    throw new CatalogError(
      "IN_USE",
      `Destination cannot be deactivated — ${referencing} listing(s) still reference it.`,
    );
  }
  const [row] = await db
    .update(destinations)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(destinations.id, id))
    .returning({ id: destinations.id });
  return Boolean(row);
}

// ---- jsonb projection helpers -------------------------------------------------

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toImage(value: unknown): ListingImage | null {
  const obj = asObject(value);
  if (!obj || typeof obj.url !== "string" || obj.url.length === 0) return null;
  const image: ListingImage = { url: obj.url };
  if (typeof obj.alt === "string") image.alt = obj.alt;
  return image;
}

function toImages(value: unknown): ListingImage[] {
  if (!Array.isArray(value)) return [];
  const images: ListingImage[] = [];
  for (const entry of value) {
    const image = toImage(entry);
    if (image) images.push(image);
  }
  return images;
}

function toStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function toItinerary(value: unknown): ItineraryItem[] {
  if (!Array.isArray(value)) return [];
  const itinerary: ItineraryItem[] = [];
  for (const entry of value) {
    const obj = asObject(entry);
    if (
      obj &&
      typeof obj.day === "string" &&
      typeof obj.title === "string" &&
      typeof obj.details === "string"
    ) {
      itinerary.push({ day: obj.day, title: obj.title, details: obj.details });
    }
  }
  return itinerary;
}

function toSeo(value: unknown): Seo | null {
  const obj = asObject(value);
  if (!obj) return null;
  const seo: Seo = {};
  if (typeof obj.title === "string") seo.title = obj.title;
  if (typeof obj.description === "string") seo.description = obj.description;
  return seo;
}

function toListing(row: ListingRow): ListingWithRefs {
  const l = row.listing;
  return {
    id: l.id,
    categoryId: l.categoryId,
    destinationId: l.destinationId,
    category: {
      id: row.category.id,
      name: row.category.name,
      slug: row.category.slug,
      kind: row.category.kind,
      redirectUrl: row.category.redirectUrl,
    },
    destination: row.destination?.id
      ? { id: row.destination.id, name: row.destination.name, slug: row.destination.slug }
      : null,
    title: l.title,
    slug: l.slug,
    summary: l.summary,
    description: l.description,
    coverImage: toImage(l.coverImage),
    gallery: toImages(l.gallery),
    videoUrl: l.videoUrl,
    durationDays: l.durationDays,
    rating: l.rating === null ? null : Number(l.rating),
    price: l.price === null ? null : Number(l.price),
    currency: l.currency,
    itinerary: toItinerary(l.itinerary),
    inclusions: toStrings(l.inclusions),
    exclusions: toStrings(l.exclusions),
    formConfig: asObject(l.formConfig),
    seo: toSeo(l.seo),
    status: l.status,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}
