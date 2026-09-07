import "server-only";
import { and, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaFiles } from "@/modules/media/schema";
import { deleteFileObject } from "@/modules/media/storage";

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
  /** Set only on trashed rows (soft delete stamp). */
  deletedAt: Date | null;
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

/** Project a media_files row into the public MediaFile shape. Exported for
 *  the sibling user-docs.ts (the portal-owned upload/list surface), which
 *  reads the same table and must return the same projection. */
export function toMediaFile(row: MediaFilesRow): MediaFile {
  return {
    id: row.id,
    name: row.name,
    disk: row.disk,
    path: row.path,
    url: row.url,
    mime: row.mime,
    size: row.size,
    alt: row.alt,
    deletedAt: row.deletedAt,
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
  // Owner-scoped rows (customer documents) never appear in the admin library
  // grid — the library is the content-asset surface; user documents have
  // their own owner-keyed read (user-docs.ts listUserDocuments).
  const conditions: SQL[] = [isNull(mediaFiles.deletedAt), isNull(mediaFiles.ownerUserId)];

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

/** The trash view: every soft-deleted row (library files AND user documents —
 *  both hold stored objects), most recently trashed first. Owner-scoped rows
 *  are deliberately included: their objects occupy the same storage and the
 *  empty-trash pass is the only reclamation path for them. */
export async function listTrashedFiles(
  query: { page?: number; perPage?: number } = {},
): Promise<Paginated<MediaFile>> {
  const where = isNotNull(mediaFiles.deletedAt);
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
    .orderBy(desc(mediaFiles.deletedAt), desc(mediaFiles.id))
    .limit(safePerPage)
    .offset(offset);

  return { items: rows.map(toMediaFile), total: countRow.total };
}

export type EmptyTrashResult = {
  /** Rows whose object AND row were both removed. */
  deleted: number;
  /** Rows kept because their object could not be deleted (driver failure) —
   *  they stay in the trash for a retry. */
  failed: number;
};

/**
 * Reclaim every soft-deleted file: delete the stored object through its own
 * driver (see deleteFileObject for why the disk comes from the row, not the
 * live setting), then hard-delete the row. Each file is its own try/catch —
 * one failing object (e.g. an R2 outage or a file already gone from disk)
 * must not abort the pass; its row is kept so the object can be retried
 * instead of being orphaned.
 */
export async function emptyTrash(): Promise<EmptyTrashResult> {
  const rows = await db
    .select({ id: mediaFiles.id, disk: mediaFiles.disk, path: mediaFiles.path })
    .from(mediaFiles)
    .where(isNotNull(mediaFiles.deletedAt));

  let deleted = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await deleteFileObject(row.disk, row.path);
      await db.delete(mediaFiles).where(eq(mediaFiles.id, row.id));
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { deleted, failed };
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
 * hides the row immediately; the object is reclaimed only by the empty-trash
 * pass (emptyTrash below) so a mistaken trash can be restored without a
 * re-upload until it is emptied.
 */
export async function softDeleteMediaFile(id: string): Promise<boolean> {
  const [row] = await db
    .update(mediaFiles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(mediaFiles.id, id), isNull(mediaFiles.deletedAt)))
    .returning({ id: mediaFiles.id });
  return Boolean(row);
}
