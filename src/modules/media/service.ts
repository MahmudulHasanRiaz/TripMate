import "server-only";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaFiles } from "@/modules/media/schema";

// All DB queries for the media library. Server-only — importing this into a
// client bundle fails the build. Rows are returned as plain `MediaFile` values;
// bigint size already decodes to a JS number via the drizzle `mode: "number"`
// mapping in schema.ts.

// ---- public types ------------------------------------------------------------

export type MediaFile = {
  id: string;
  name: string;
  disk: "local" | "r2";
  path: string;
  url: string;
  mime: string;
  size: number;
  alt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MediaListQuery = {
  search?: string;
  page?: number;
  perPage?: number;
};

export type Paginated<T> = { items: T[]; total: number };

// ---- errors ------------------------------------------------------------------

export class MediaError extends Error {
  constructor(
    public code: "NOT_FOUND" | "ALREADY_DELETED",
    message: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

// ---- reads -------------------------------------------------------------------

type MediaFilesRow = typeof mediaFiles.$inferSelect;

function toMediaFile(row: MediaFilesRow): MediaFile {
  return {
    id: row.id,
    name: row.name,
    disk: row.disk,
    path: row.path,
    url: row.url,
    mime: row.mime,
    size: row.size,
    alt: row.alt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Escape LIKE wildcards so user search input is treated literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function searchCondition(query: string): SQL {
  const pattern = `%${escapeLike(query)}%`;
  return or(ilike(mediaFiles.name, pattern), ilike(mediaFiles.alt, pattern)) as SQL;
}

export async function listFiles(query: MediaListQuery = {}): Promise<Paginated<MediaFile>> {
  const conditions: SQL[] = [isNull(mediaFiles.deletedAt)];

  const search = query.search?.trim();
  if (search) conditions.push(searchCondition(search));

  const where = and(...conditions);
  const safePage = Math.max(1, Math.floor(query.page ?? 1));
  const safePerPage = Math.min(50, Math.max(1, Math.floor(query.perPage ?? 24)));
  const offset = (safePage - 1) * safePerPage;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(mediaFiles)
    .where(where);

  const rows = await db
    .select()
    .from(mediaFiles)
    .where(where)
    .orderBy(desc(mediaFiles.createdAt), desc(mediaFiles.id))
    .limit(safePerPage)
    .offset(offset);

  return { items: rows.map(toMediaFile), total: countRow.total };
}

export async function getFileById(id: string): Promise<MediaFile | null> {
  const rows = await db
    .select()
    .from(mediaFiles)
    .where(and(eq(mediaFiles.id, id), isNull(mediaFiles.deletedAt)))
    .limit(1);
  return rows[0] ? toMediaFile(rows[0]) : null;
}

// ---- writes ------------------------------------------------------------------

/** Insert a completed upload's row. The storage object already exists; this is
 *  purely the DB record that makes it appear in the library. */
export async function insertMediaFile(
  input: Pick<MediaFilesRow, "name" | "disk" | "path" | "url" | "mime" | "size">,
): Promise<MediaFile> {
  const [row] = await db
    .insert(mediaFiles)
    .values({ ...input, alt: "" })
    .returning();
  return toMediaFile(row);
}

/** Replace the alt text on a live file. Empty string clears it to NULL. */
export async function updateMediaFileAlt(id: string, alt: string): Promise<MediaFile> {
  const [row] = await db
    .update(mediaFiles)
    .set({ alt: alt.trim() || null, updatedAt: new Date() })
    .where(and(eq(mediaFiles.id, id), isNull(mediaFiles.deletedAt)))
    .returning();
  if (!row) {
    throw new MediaError("NOT_FOUND", "File not found or already deleted.");
  }
  return toMediaFile(row);
}

/**
 * Soft-delete a media row: stamp deletedAt, keep the stored object. The library
 * hides the row immediately; the object is reclaimed only by a future
 * "empty trash" pass (out of scope — Plan 3 keeps the object so a mistaken
 * trash can be restored without a re-upload).
 */
export async function softDeleteMediaFile(id: string): Promise<boolean> {
  const [row] = await db
    .update(mediaFiles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(mediaFiles.id, id), isNull(mediaFiles.deletedAt)))
    .returning({ id: mediaFiles.id });
  return Boolean(row);
}
