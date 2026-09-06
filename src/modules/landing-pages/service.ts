import "server-only";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
// landing_pages is co-located with the leads schema (the leads FK points at it
// and both ship together) — this module's service consumes that table.
import { landingPages } from "@/modules/leads/schema";
// packageShowcase cards resolve against the published catalog (listings joined
// to their destination for the card's destinationName).
import { destinations, listings } from "@/modules/catalog/schema";
import type {
  FormConfig,
  LandingSection,
} from "@/modules/landing-pages/section-types";
import {
  formConfigSchema,
  landingSectionUnionSchema,
} from "@/modules/landing-pages/section-types";
import type {
  LandingPageInput,
  LandingPageSeo,
  LandingPageStatus,
} from "@/modules/landing-pages/validation";

// All DB queries for the landing-pages module. Server-only — importing this
// into a client bundle fails the build. Conventions mirror modules/content
// service.ts:
//   - Slug uniqueness is a DB concern; upserts surface the unique-violation as
//     a typed LandingError(SLUG_CONFLICT).
//   - When the conflicting slug belongs to a SOFT-DELETED row, the insert
//     auto-suffixes (`-2`, `-3`, …) so an admin can recreate a trashed slug.
//   - JSONB cells are free-form at rest; every read is projected defensively
//     (sections/formConfig/seo are run through the validation schemas).
//
// Public reads return RESOLVED sections: a packageShowcase row's configured
// listingIds are expanded into published listing cards by the backend so the
// /l/<slug> renderer never re-queries (Plan 4 handoff contract).

// ---- public types ------------------------------------------------------------

export type LandingListingCard = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  currency: string;
  coverImage: { url: string; alt?: string } | null;
  durationDays: number | null;
  destinationName: string | null;
};

export type ResolvedPackageShowcaseConfig = {
  /** The configured ids (author order, source of truth for what was picked). */
  listingIds: string[];
  /** The published/non-deleted cards among those ids, in configured order. */
  listings: LandingListingCard[];
};

export type ResolvedPackageShowcaseSection = {
  type: "packageShowcase";
  config: ResolvedPackageShowcaseConfig;
  order?: number;
};

/** Every section type except packageShowcase passes through unchanged; the
 *  showcase's raw listingIds are replaced by the resolved card payloads. */
export type ResolvedLandingSection =
  | Exclude<LandingSection, { type: "packageShowcase" }>
  | ResolvedPackageShowcaseSection;

export type LandingRenderData = {
  id: string;
  slug: string;
  title: string;
  seo: LandingPageSeo | null;
  fbContentId: string | null;
  sections: ResolvedLandingSection[];
  form: { formConfig: FormConfig | null; landingSlug: string };
};

export type LandingPage = {
  id: string;
  title: string;
  slug: string;
  sections: LandingSection[];
  formConfig: FormConfig | null;
  seo: LandingPageSeo | null;
  status: LandingPageStatus;
  fbContentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LandingPageSummary = {
  id: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  fbContentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Paginated<T> = { items: T[]; total: number };

// ---- errors ------------------------------------------------------------------

export class LandingError extends Error {
  constructor(
    public code: "SLUG_CONFLICT" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "LandingError";
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

// ---- jsonb projection helpers -------------------------------------------------

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toCoverImage(value: unknown): LandingListingCard["coverImage"] {
  const obj = asObject(value);
  if (!obj || typeof obj.url !== "string" || obj.url.length === 0) return null;
  const image: { url: string; alt?: string } = { url: obj.url };
  if (typeof obj.alt === "string") image.alt = obj.alt;
  return image;
}

function toSeo(value: unknown): LandingPageSeo | null {
  const obj = asObject(value);
  if (!obj) return null;
  const seo: LandingPageSeo = {};
  if (typeof obj.title === "string") seo.title = obj.title;
  if (typeof obj.description === "string") seo.description = obj.description;
  return seo;
}

/** Stored sections are free-form jsonb; run through the schema so the service
 *  only ever hands typed sections to callers. Individually-invalid rows are
 *  dropped (defensive; writes are always validated, so in practice all pass).
 *  The zod-discriminated-union parse output widens its `type` key at the type
 *  level, so each row is cast to the explicit LandingSection alias here. */
function toSections(value: unknown): LandingSection[] {
  if (!Array.isArray(value)) return [];
  const sections: LandingSection[] = [];
  for (const entry of value) {
    const parsed = landingSectionUnionSchema.safeParse(entry);
    if (parsed.success) sections.push(parsed.data as LandingSection);
  }
  return sections;
}

function toFormConfig(value: unknown): FormConfig | null {
  if (value === null || value === undefined) return null;
  const parsed = formConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// ---- public read --------------------------------------------------------------

/** The published page a /l/<slug> route renders, with showcase sections
 *  resolved into listing cards. null when the slug is missing, unpublished or
 *  soft-deleted — the caller turns that into notFound(). */
export async function getPublishedLandingBySlug(
  slug: string,
): Promise<LandingRenderData | null> {
  const [row] = await db
    .select()
    .from(landingPages)
    .where(and(eq(landingPages.slug, slug), eq(landingPages.status, "published"), isNull(landingPages.deletedAt)))
    .limit(1);
  if (!row) return null;

  const sections = await resolveSections(toSections(row.sections));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    seo: toSeo(row.seo),
    fbContentId: row.fbContentId,
    sections,
    form: { formConfig: toFormConfig(row.formConfig), landingSlug: row.slug },
  };
}

/** Narrow a stored section to its packageShowcase variant (the zod-inferred
 *  union does not always narrow on the `type` literal alone). */
function isPackageShowcaseSection(
  section: LandingSection,
): section is Extract<LandingSection, { type: "packageShowcase" }> {
  return section.type === "packageShowcase";
}

/** Expand every packageShowcase section's configured ids into cards. Runs a
 *  single IN query over the catalog (published + non-deleted, matching
 *  listPublishedListings' predicate) rather than calling listPublishedListings
 *  — that helper paginates at perPage ≤ 50, so it cannot guarantee resolving an
 *  arbitrary showcase of up to 6 ids once the catalog grows past its first page.
 */
async function resolveSections(sections: LandingSection[]): Promise<ResolvedLandingSection[]> {
  const ids = new Set<string>();
  for (const section of sections) {
    if (isPackageShowcaseSection(section)) {
      for (const id of section.config.listingIds) ids.add(id);
    }
  }

  let byId = new Map<string, LandingListingCard>();
  if (ids.size > 0) {
    const rows = await db
      .select({
        id: listings.id,
        slug: listings.slug,
        title: listings.title,
        price: listings.price,
        currency: listings.currency,
        coverImage: listings.coverImage,
        durationDays: listings.durationDays,
        destinationName: destinations.name,
      })
      .from(listings)
      .leftJoin(destinations, eq(listings.destinationId, destinations.id))
      .where(
        and(
          eq(listings.status, "published"),
          isNull(listings.deletedAt),
          inArray(listings.id, [...ids]),
        ),
      );
    byId = new Map(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          slug: row.slug,
          title: row.title,
          price: row.price === null ? null : Number(row.price),
          currency: row.currency,
          coverImage: toCoverImage(row.coverImage),
          durationDays: row.durationDays,
          destinationName: row.destinationName,
        },
      ]),
    );
  }

  return sections.map((section): ResolvedLandingSection => {
    if (!isPackageShowcaseSection(section)) return section;
    const listingIds = section.config.listingIds;
    const cards: LandingListingCard[] = [];
    for (const id of listingIds) {
      const card = byId.get(id);
      if (card) cards.push(card);
    }
    return { ...section, config: { listingIds, listings: cards } };
  });
}

// ---- admin reads --------------------------------------------------------------

export type AdminLandingPagesQuery = {
  search?: string;
  status?: LandingPageStatus;
  page?: number;
  perPage?: number;
};

/** Escape LIKE wildcards so user search input is treated literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function pagination(page?: number, perPage?: number, defaultPerPage = 12) {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safePerPage = Math.min(50, Math.max(1, Math.floor(perPage ?? defaultPerPage)));
  return { page: safePage, perPage: safePerPage, offset: (safePage - 1) * safePerPage };
}

const landingSummaryCols = {
  id: landingPages.id,
  title: landingPages.title,
  slug: landingPages.slug,
  status: landingPages.status,
  fbContentId: landingPages.fbContentId,
  createdAt: landingPages.createdAt,
  updatedAt: landingPages.updatedAt,
} as const;

/** Admin list: non-deleted pages with optional title search + status filter. */
export async function listLandingPages(
  query: AdminLandingPagesQuery = {},
): Promise<Paginated<LandingPageSummary>> {
  const conditions: SQL[] = [isNull(landingPages.deletedAt)];

  const search = query.search?.trim();
  if (search) conditions.push(ilike(landingPages.title, `%${escapeLike(search)}%`));
  if (query.status) conditions.push(eq(landingPages.status, query.status));

  const where = and(...conditions);
  const { offset, perPage } = pagination(query.page, query.perPage, 20);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(landingPages)
    .where(where);
  const rows = await db
    .select(landingSummaryCols)
    .from(landingPages)
    .where(where)
    .orderBy(desc(landingPages.updatedAt), desc(landingPages.createdAt))
    .limit(perPage)
    .offset(offset);

  const items: LandingPageSummary[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status as LandingPageStatus,
    fbContentId: row.fbContentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  return { items, total: countRow.total };
}

/** Full page for the admin editor (unresolved sections — the editor owns the
 *  raw listingIds / config forms). */
export async function getLandingById(id: string): Promise<LandingPage | null> {
  const [row] = await db
    .select()
    .from(landingPages)
    .where(and(eq(landingPages.id, id), isNull(landingPages.deletedAt)))
    .limit(1);
  return row ? toLandingPage(row) : null;
}

/** Total non-deleted landing pages (admin count chip / list footer). */
export async function countLandingPages(): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(landingPages)
    .where(isNull(landingPages.deletedAt));
  return row.total;
}

type LandingPagesRow = typeof landingPages.$inferSelect;

function toLandingPage(row: LandingPagesRow): LandingPage {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    sections: toSections(row.sections),
    formConfig: toFormConfig(row.formConfig),
    seo: toSeo(row.seo),
    status: row.status as LandingPageStatus,
    fbContentId: row.fbContentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---- writes -------------------------------------------------------------------

type LandingWrite = Pick<typeof landingPages.$inferInsert, "title" | "slug"> &
  Partial<Omit<typeof landingPages.$inferInsert, "title" | "slug">>;

/** Maps a validated input to DB columns; absent fields are left out so partial
 *  updates never clobber stored values the caller did not send. */
function toLandingWrite(input: LandingPageInput): LandingWrite {
  const w: LandingWrite = { title: input.title, slug: input.slug };
  if (input.sections !== undefined) w.sections = input.sections;
  if (input.formConfig !== undefined) w.formConfig = input.formConfig;
  if (input.seo !== undefined) w.seo = input.seo;
  if (input.status !== undefined) w.status = input.status;
  if (input.fbContentId !== undefined) w.fbContentId = input.fbContentId;
  return w;
}

async function landingSlugExists(slug: string): Promise<boolean> {
  const rows = await db
    .select({ id: landingPages.id })
    .from(landingPages)
    .where(eq(landingPages.slug, slug))
    .limit(1);
  return rows.length > 0;
}

/** First free `base-2`, `base-3`, … slug not already used (live OR trashed). */
async function nextFreeLandingSlug(base: string): Promise<string> {
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await landingSlugExists(candidate))) return candidate;
  }
  throw new LandingError("SLUG_CONFLICT", `No free slug available for "${base}".`);
}

/**
 * Insert with admin-friendly slug recovery. When the insert collides with a row
 * that was soft-deleted (the classic "recreate after trash" flow), we re-try
 * under the next free `-2`/`-3`/… suffixed slug instead of failing. A collision
 * with a LIVE row is a genuine conflict and stays a typed SLUG_CONFLICT error.
 */
async function insertLandingPageWithSlugRecovery(
  write: LandingWrite,
  slug: string,
): Promise<string> {
  try {
    const [created] = await db
      .insert(landingPages)
      .values(write)
      .returning({ id: landingPages.id });
    return created.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const [blocker] = await db
      .select({ deletedAt: landingPages.deletedAt })
      .from(landingPages)
      .where(eq(landingPages.slug, slug))
      .limit(1);
    if (!blocker || blocker.deletedAt === null) {
      throw new LandingError("SLUG_CONFLICT", `A landing page with slug "${slug}" already exists.`);
    }
    const free = await nextFreeLandingSlug(slug);
    try {
      const [created] = await db
        .insert(landingPages)
        .values({ ...write, slug: free })
        .returning({ id: landingPages.id });
      return created.id;
    } catch (retryErr) {
      if (isUniqueViolation(retryErr)) {
        throw new LandingError("SLUG_CONFLICT", `A landing page with slug "${free}" already exists.`);
      }
      throw retryErr;
    }
  }
}

export async function upsertLandingPage(input: LandingPageInput): Promise<LandingPage> {
  const write = toLandingWrite(input);
  let id: string | undefined = input.id;

  if (id) {
    try {
      const updated = await db
        .update(landingPages)
        .set({ ...write, updatedAt: new Date() })
        .where(and(eq(landingPages.id, id), isNull(landingPages.deletedAt)))
        .returning({ id: landingPages.id });
      if (updated.length === 0) {
        throw new LandingError("NOT_FOUND", `Landing page ${id} not found or already deleted.`);
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new LandingError(
          "SLUG_CONFLICT",
          `A landing page with slug "${input.slug}" already exists.`,
        );
      }
      throw err;
    }
  } else {
    id = await insertLandingPageWithSlugRecovery(write, input.slug);
  }

  const saved = await getLandingById(id as string);
  if (!saved) throw new LandingError("NOT_FOUND", "Landing page could not be loaded after save.");
  return saved;
}

/** Publish/unpublish a landing page from the list UI without resubmitting its
 *  sections. Unpublishing takes it off /l/<slug> immediately. */
export async function updateLandingStatus(
  id: string,
  status: LandingPageStatus,
): Promise<LandingPage> {
  const [row] = await db
    .update(landingPages)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(landingPages.id, id), isNull(landingPages.deletedAt)))
    .returning({ id: landingPages.id });
  if (!row) {
    throw new LandingError("NOT_FOUND", `Landing page ${id} not found or already deleted.`);
  }
  const saved = await getLandingById(id);
  if (!saved) throw new LandingError("NOT_FOUND", "Landing page could not be loaded after status change.");
  return saved;
}

export async function softDeleteLandingPage(id: string): Promise<boolean> {
  const [row] = await db
    .update(landingPages)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(landingPages.id, id), isNull(landingPages.deletedAt)))
    .returning({ id: landingPages.id });
  return Boolean(row);
}
