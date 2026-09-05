import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
import { pages, postCategories, posts } from "@/modules/content/schema";
import { users } from "@/modules/users/schema";
import type {
  ContentImage,
  ContentStatus,
  PageInput,
  PageSection,
  PostCategoryInput,
  PostInput,
  Seo,
} from "@/modules/content/validation";

// All DB queries for the content module (posts, post categories, pages).
// Server-only — importing this into a client bundle fails the build. Same
// conventions as modules/catalog/service.ts:
//   - Slug uniqueness is a DB concern; upserts surface the unique-violation as
//     a typed ContentError(SLUG_CONFLICT).
//   - When the conflicting slug belongs to a SOFT-DELETED row, the insert
//     auto-suffixes (`-2`, `-3`, …) so an admin can recreate a trashed slug
//     instead of hitting a wall (the Task-5 recovery pattern).
//   - JSONB cells are free-form at rest; every read is projected defensively.
//
// Post status lifecycle: publishing auto-stamps `publishedAt` the FIRST time a
// post becomes published (a draft kept as a draft stays null). Re-publishing
// after a draft keeps the original date; the public read path additionally
// requires `publishedAt IS NOT NULL` so ordering is well-defined.

// ---- public types ------------------------------------------------------------

export type PostCategoryRef = { id: string; name: string; slug: string };
export type PostAuthor = { id: string; name: string };

export type PostWithRefs = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featuredImage: ContentImage | null;
  gallery: ContentImage[];
  videoUrl: string | null;
  authorId: string | null;
  categoryId: string | null;
  category: PostCategoryRef | null;
  author: PostAuthor | null;
  status: ContentStatus;
  publishedAt: Date | null;
  seo: Seo | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PostCategory = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Page = {
  id: string;
  title: string;
  slug: string;
  sections: PageSection[];
  seo: Seo | null;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type Paginated<T> = { items: T[]; total: number };

// ---- errors ------------------------------------------------------------------

export class ContentError extends Error {
  constructor(
    public code: "SLUG_CONFLICT" | "IN_USE" | "NOT_FOUND" | "INVALID_REFERENCE",
    message: string,
  ) {
    super(message);
    this.name = "ContentError";
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

// ---- post reads --------------------------------------------------------------

export type PublishedPostsQuery = {
  search?: string;
  categorySlug?: string;
  page?: number;
  perPage?: number;
};

export type AdminPostsQuery = {
  search?: string;
  status?: ContentStatus;
  categoryId?: string;
  page?: number;
  perPage?: number;
};

const postCols = {
  post: {
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    excerpt: posts.excerpt,
    content: posts.content,
    featuredImage: posts.featuredImage,
    gallery: posts.gallery,
    videoUrl: posts.videoUrl,
    authorId: posts.authorId,
    categoryId: posts.categoryId,
    status: posts.status,
    publishedAt: posts.publishedAt,
    seo: posts.seo,
    createdAt: posts.createdAt,
    updatedAt: posts.updatedAt,
  },
  category: {
    id: postCategories.id,
    name: postCategories.name,
    slug: postCategories.slug,
  },
  author: {
    id: users.id,
    name: users.name,
  },
} as const;

type PostRow = {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    featuredImage: unknown;
    gallery: unknown;
    videoUrl: string | null;
    authorId: string | null;
    categoryId: string | null;
    status: ContentStatus;
    publishedAt: Date | null;
    seo: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; name: string } | null;
};

function postQuery() {
  return db
    .select(postCols)
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .leftJoin(users, eq(posts.authorId, users.id));
}

function postCountQuery() {
  return db
    .select({ total: sql<number>`count(*)::int` })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .leftJoin(users, eq(posts.authorId, users.id));
}

/** Escape LIKE wildcards so user search input is treated literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Search hits the post title OR excerpt (body search is out of scope). */
function postSearchCondition(query: string): SQL {
  const pattern = `%${escapeLike(query)}%`;
  return or(ilike(posts.title, pattern), ilike(posts.excerpt, pattern)) as SQL;
}

function pagination(page?: number, perPage?: number, defaultPerPage = 12) {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safePerPage = Math.min(50, Math.max(1, Math.floor(perPage ?? defaultPerPage)));
  return { page: safePage, perPage: safePerPage, offset: (safePage - 1) * safePerPage };
}

/** Public blog index: published, stamped with a publish date, newest first. */
export async function listPublishedPosts(
  query: PublishedPostsQuery = {},
): Promise<Paginated<PostWithRefs>> {
  const conditions: SQL[] = [
    eq(posts.status, "published"),
    isNull(posts.deletedAt),
    isNotNull(posts.publishedAt),
  ];

  const search = query.search?.trim();
  if (search) conditions.push(postSearchCondition(search));
  if (query.categorySlug) conditions.push(eq(postCategories.slug, query.categorySlug));

  const where = and(...conditions);
  const { offset, perPage } = pagination(query.page, query.perPage, 12);

  const [countRow] = await postCountQuery().where(where);
  const rows = await postQuery()
    .where(where)
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(perPage)
    .offset(offset);

  return { items: rows.map(toPost), total: countRow.total };
}

export async function getPublishedPostBySlug(slug: string): Promise<PostWithRefs | null> {
  const rows = await postQuery()
    .where(
      and(
        eq(posts.slug, slug),
        eq(posts.status, "published"),
        isNull(posts.deletedAt),
        isNotNull(posts.publishedAt),
      ),
    )
    .limit(1);
  return rows[0] ? toPost(rows[0]) : null;
}

export async function listAllPosts(
  query: AdminPostsQuery = {},
): Promise<Paginated<PostWithRefs>> {
  const conditions: SQL[] = [isNull(posts.deletedAt)];

  const search = query.search?.trim();
  if (search) conditions.push(postSearchCondition(search));
  if (query.status) conditions.push(eq(posts.status, query.status));
  if (query.categoryId) conditions.push(eq(posts.categoryId, query.categoryId));

  const where = and(...conditions);
  const { offset, perPage } = pagination(query.page, query.perPage, 20);

  const [countRow] = await postCountQuery().where(where);
  const rows = await postQuery()
    .where(where)
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(perPage)
    .offset(offset);

  return { items: rows.map(toPost), total: countRow.total };
}

export async function getPostById(id: string): Promise<PostWithRefs | null> {
  const rows = await postQuery()
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .limit(1);
  return rows[0] ? toPost(rows[0]) : null;
}

// ---- post categories reads ---------------------------------------------------

export async function listPostCategories(): Promise<PostCategory[]> {
  return db
    .select({
      id: postCategories.id,
      name: postCategories.name,
      slug: postCategories.slug,
      createdAt: postCategories.createdAt,
      updatedAt: postCategories.updatedAt,
    })
    .from(postCategories)
    .orderBy(asc(postCategories.name));
}

// ---- page reads --------------------------------------------------------------

export type AdminPagesQuery = {
  search?: string;
  status?: ContentStatus;
  page?: number;
  perPage?: number;
};

export async function getPublishedPageBySlug(slug: string): Promise<Page | null> {
  const rows = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, "published"), isNull(pages.deletedAt)))
    .limit(1);
  return rows[0] ? toPage(rows[0]) : null;
}

export async function listAllPages(
  query: AdminPagesQuery = {},
): Promise<Paginated<Page>> {
  const conditions: SQL[] = [isNull(pages.deletedAt)];

  const search = query.search?.trim();
  if (search) {
    conditions.push(ilike(pages.title, `%${escapeLike(search)}%`));
  }
  if (query.status) conditions.push(eq(pages.status, query.status));

  const where = and(...conditions);
  const { offset, perPage } = pagination(query.page, query.perPage, 20);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(pages)
    .where(where);
  const rows = await db
    .select()
    .from(pages)
    .where(where)
    .orderBy(asc(pages.title))
    .limit(perPage)
    .offset(offset);

  return { items: rows.map(toPage), total: countRow.total };
}

export async function getPageById(id: string): Promise<Page | null> {
  const rows = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), isNull(pages.deletedAt)))
    .limit(1);
  return rows[0] ? toPage(rows[0]) : null;
}

// ---- post writes -------------------------------------------------------------

type PostWrite = Pick<typeof posts.$inferInsert, "title" | "slug"> &
  Partial<Omit<typeof posts.$inferInsert, "title" | "slug">>;

/** Maps a validated input to DB columns; absent fields are left out so partial
 *  updates never clobber stored values the caller did not send. */
function toPostWrite(input: PostInput): PostWrite {
  const w: PostWrite = { title: input.title, slug: input.slug };
  if (input.excerpt !== undefined) w.excerpt = input.excerpt || null;
  if (input.content !== undefined) w.content = input.content || null;
  if (input.featuredImage !== undefined) w.featuredImage = input.featuredImage || null;
  if (input.gallery !== undefined) w.gallery = input.gallery || null;
  if (input.videoUrl !== undefined) w.videoUrl = input.videoUrl || null;
  if (input.categoryId !== undefined) w.categoryId = input.categoryId;
  if (input.authorId !== undefined) w.authorId = input.authorId;
  if (input.status !== undefined) w.status = input.status;
  if (input.seo !== undefined) w.seo = input.seo;
  return w;
}

/** post_categories carry no active/soft-delete flag, so the only reference rule
 *  is existence: a save may only point at a category that still exists. */
async function assertCategoryReference(categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const [category] = await db
    .select({ id: postCategories.id })
    .from(postCategories)
    .where(eq(postCategories.id, categoryId))
    .limit(1);
  if (!category) {
    throw new ContentError(
      "INVALID_REFERENCE",
      "The selected category no longer exists — pick another or leave it unset.",
    );
  }
}

async function postSlugExists(slug: string): Promise<boolean> {
  const rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);
  return rows.length > 0;
}

/** First free `base-2`, `base-3`, … slug not already used (live OR trashed). */
async function nextFreePostSlug(base: string): Promise<string> {
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await postSlugExists(candidate))) return candidate;
  }
  throw new ContentError("SLUG_CONFLICT", `No free slug available for "${base}".`);
}

/**
 * Insert with admin-friendly slug recovery. When the insert collides with a row
 * that was soft-deleted (the classic "recreate after trash" flow), we re-try
 * under the next free `-2`/`-3`/… suffixed slug instead of failing. A collision
 * with a LIVE row is a genuine conflict and stays a typed SLUG_CONFLICT error.
 */
async function insertPostWithSlugRecovery(write: PostWrite, slug: string): Promise<string> {
  try {
    const [created] = await db
      .insert(posts)
      .values(write)
      .returning({ id: posts.id });
    return created.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const [blocker] = await db
      .select({ deletedAt: posts.deletedAt })
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);
    if (!blocker || blocker.deletedAt === null) {
      throw new ContentError("SLUG_CONFLICT", `A post with slug "${slug}" already exists.`);
    }
    const free = await nextFreePostSlug(slug);
    try {
      const [created] = await db
        .insert(posts)
        .values({ ...write, slug: free })
        .returning({ id: posts.id });
      return created.id;
    } catch (retryErr) {
      if (isUniqueViolation(retryErr)) {
        throw new ContentError("SLUG_CONFLICT", `A post with slug "${free}" already exists.`);
      }
      throw retryErr;
    }
  }
}

export async function upsertPost(input: PostInput): Promise<PostWithRefs> {
  await assertCategoryReference(input.categoryId);
  const write = toPostWrite(input);
  let id: string | undefined = input.id;

  if (id) {
    const [existing] = await db
      .select({ publishedAt: posts.publishedAt, status: posts.status })
      .from(posts)
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .limit(1);
    if (!existing) {
      throw new ContentError("NOT_FOUND", `Post ${id} not found or already deleted.`);
    }
    // AUTHOR IMMUTABLE ON EDIT: an update never rewrites the byline — CREATE
    // sets it once and every later save keeps it. toPostWrite may carry an
    // authorId through from the input, so drop it here: no caller (however
    // careless or crafted) can reassign authorship through the update path.
    delete write.authorId;
    // First publish stamps publishedAt; an unpublish→republish keeps the date.
    const nextStatus = input.status ?? existing.status;
    const publishedAt =
      nextStatus === "published" && existing.publishedAt === null ? new Date() : existing.publishedAt;
    try {
      const updated = await db
        .update(posts)
        .set({ ...write, publishedAt, updatedAt: new Date() })
        .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
        .returning({ id: posts.id });
      if (updated.length === 0) {
        throw new ContentError("NOT_FOUND", `Post ${id} not found or already deleted.`);
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ContentError("SLUG_CONFLICT", `A post with slug "${input.slug}" already exists.`);
      }
      throw err;
    }
  } else {
    if (input.status === "published") write.publishedAt = new Date();
    id = await insertPostWithSlugRecovery(write, input.slug);
  }

  const saved = await getPostById(id as string);
  if (!saved) throw new ContentError("NOT_FOUND", "Post could not be loaded after save.");
  return saved;
}

/** Flip a post's status from the list UI without resubmitting the whole form.
 *  Mirrors upsertPost's publish-stamping rule: the FIRST time a post becomes
 *  published, publishedAt is stamped; an unpublish→republish keeps the date. */
export async function updatePostStatus(id: string, status: ContentStatus): Promise<PostWithRefs> {
  const [existing] = await db
    .select({ publishedAt: posts.publishedAt, status: posts.status })
    .from(posts)
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .limit(1);
  if (!existing) {
    throw new ContentError("NOT_FOUND", `Post ${id} not found or already deleted.`);
  }
  const publishedAt =
    status === "published" && existing.publishedAt === null ? new Date() : existing.publishedAt;
  await db
    .update(posts)
    .set({ status, publishedAt, updatedAt: new Date() })
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)));
  const saved = await getPostById(id);
  if (!saved) throw new ContentError("NOT_FOUND", "Post could not be loaded after status change.");
  return saved;
}

export async function softDeletePost(id: string): Promise<boolean> {
  const [row] = await db
    .update(posts)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
    .returning({ id: posts.id });
  return Boolean(row);
}

// ---- post category writes ----------------------------------------------------

type PostCategoriesRow = typeof postCategories.$inferSelect;

function toCategory(row: PostCategoriesRow): PostCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function upsertPostCategory(input: PostCategoryInput): Promise<PostCategory> {
  const write = { name: input.name, slug: input.slug };
  try {
    let rows: PostCategoriesRow[];
    if (input.id) {
      rows = await db
        .update(postCategories)
        .set({ ...write, updatedAt: new Date() })
        .where(eq(postCategories.id, input.id))
        .returning();
      if (rows.length === 0) {
        throw new ContentError("NOT_FOUND", `Post category ${input.id} not found.`);
      }
    } else {
      rows = await db.insert(postCategories).values(write).returning();
    }
    return toCategory(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ContentError(
        "SLUG_CONFLICT",
        `A post category with slug "${input.slug}" already exists.`,
      );
    }
    throw err;
  }
}

async function countNonDeletedPostsFor(condition: SQL): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(condition, isNull(posts.deletedAt)));
  return row.total;
}

/**
 * Delete a post category. `post_categories` has no soft-delete or active
 * column, so removal is a hard DELETE guarded by the same reference rule the
 * catalog trash path enforces: refused (IN_USE) while LIVE posts reference the
 * row. References held only by TRASHED posts are cleared first (category_id is
 * nullable) so the FK does not block the delete — a restored post simply comes
 * back uncategorized.
 */
export async function deletePostCategory(id: string): Promise<boolean> {
  const referencing = await countNonDeletedPostsFor(eq(posts.categoryId, id));
  if (referencing > 0) {
    throw new ContentError(
      "IN_USE",
      `Category cannot be deleted — ${referencing} post(s) still reference it. Trash or reassign them first.`,
    );
  }
  await db
    .update(posts)
    .set({ categoryId: null })
    .where(and(eq(posts.categoryId, id), isNotNull(posts.deletedAt)));
  const [row] = await db
    .delete(postCategories)
    .where(eq(postCategories.id, id))
    .returning({ id: postCategories.id });
  return Boolean(row);
}

// ---- page writes -------------------------------------------------------------

type PagesRow = typeof pages.$inferSelect;
type PageWrite = Pick<PagesRow, "title" | "slug"> &
  Partial<Omit<PagesRow, "title" | "slug">>;

function toPageWrite(input: PageInput): PageWrite {
  const w: PageWrite = { title: input.title, slug: input.slug };
  if (input.sections !== undefined) w.sections = input.sections;
  if (input.status !== undefined) w.status = input.status;
  if (input.seo !== undefined) w.seo = input.seo;
  return w;
}

async function pageSlugExists(slug: string): Promise<boolean> {
  const rows = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.slug, slug))
    .limit(1);
  return rows.length > 0;
}

/** First free `base-2`, `base-3`, … slug not already used (live OR trashed). */
async function nextFreePageSlug(base: string): Promise<string> {
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await pageSlugExists(candidate))) return candidate;
  }
  throw new ContentError("SLUG_CONFLICT", `No free slug available for "${base}".`);
}

/** Post-style slug recovery for pages (same recreate-after-trash semantics). */
async function insertPageWithSlugRecovery(write: PageWrite, slug: string): Promise<string> {
  try {
    const [created] = await db
      .insert(pages)
      .values(write)
      .returning({ id: pages.id });
    return created.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const [blocker] = await db
      .select({ deletedAt: pages.deletedAt })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1);
    if (!blocker || blocker.deletedAt === null) {
      throw new ContentError("SLUG_CONFLICT", `A page with slug "${slug}" already exists.`);
    }
    const free = await nextFreePageSlug(slug);
    try {
      const [created] = await db
        .insert(pages)
        .values({ ...write, slug: free })
        .returning({ id: pages.id });
      return created.id;
    } catch (retryErr) {
      if (isUniqueViolation(retryErr)) {
        throw new ContentError("SLUG_CONFLICT", `A page with slug "${free}" already exists.`);
      }
      throw retryErr;
    }
  }
}

export async function upsertPage(input: PageInput): Promise<Page> {
  const write = toPageWrite(input);
  let id: string | undefined = input.id;

  if (id) {
    try {
      const updated = await db
        .update(pages)
        .set({ ...write, updatedAt: new Date() })
        .where(and(eq(pages.id, id), isNull(pages.deletedAt)))
        .returning({ id: pages.id });
      if (updated.length === 0) {
        throw new ContentError("NOT_FOUND", `Page ${id} not found or already deleted.`);
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ContentError("SLUG_CONFLICT", `A page with slug "${input.slug}" already exists.`);
      }
      throw err;
    }
  } else {
    id = await insertPageWithSlugRecovery(write, input.slug);
  }

  const saved = await getPageById(id as string);
  if (!saved) throw new ContentError("NOT_FOUND", "Page could not be loaded after save.");
  return saved;
}

export async function softDeletePage(id: string): Promise<boolean> {
  const [row] = await db
    .update(pages)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(pages.id, id), isNull(pages.deletedAt)))
    .returning({ id: pages.id });
  return Boolean(row);
}

// ---- jsonb projection helpers -------------------------------------------------

function asObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toImage(value: unknown): ContentImage | null {
  const obj = asObject(value);
  if (!obj || typeof obj.url !== "string" || obj.url.length === 0) return null;
  const image: ContentImage = { url: obj.url };
  if (typeof obj.alt === "string") image.alt = obj.alt;
  return image;
}

function toImages(value: unknown): ContentImage[] {
  if (!Array.isArray(value)) return [];
  const images: ContentImage[] = [];
  for (const entry of value) {
    const image = toImage(entry);
    if (image) images.push(image);
  }
  return images;
}

function toSeo(value: unknown): Seo | null {
  const obj = asObject(value);
  if (!obj) return null;
  const seo: Seo = {};
  if (typeof obj.title === "string") seo.title = obj.title;
  if (typeof obj.description === "string") seo.description = obj.description;
  return seo;
}

function toPost(row: PostRow): PostWithRefs {
  const p = row.post;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    featuredImage: toImage(p.featuredImage),
    gallery: toImages(p.gallery),
    videoUrl: p.videoUrl,
    authorId: p.authorId,
    categoryId: p.categoryId,
    category: row.category
      ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
      : null,
    author: row.author ? { id: row.author.id, name: row.author.name } : null,
    status: p.status,
    publishedAt: p.publishedAt,
    seo: toSeo(p.seo),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Sections model v1 is markdown-only; unknown/future types are filtered out of
 *  the read projection (Plan 4's LP renderer extends this mapper). */
function toSections(value: unknown): PageSection[] {
  if (!Array.isArray(value)) return [];
  const sections: PageSection[] = [];
  for (const entry of value) {
    const obj = asObject(entry);
    if (obj && obj.type === "markdown" && typeof obj.content === "string") {
      sections.push({ type: "markdown", content: obj.content });
    }
  }
  return sections;
}

function toPage(row: PagesRow): Page {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    sections: toSections(row.sections),
    seo: toSeo(row.seo),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
