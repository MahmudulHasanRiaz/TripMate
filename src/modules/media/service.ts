import "server-only";
import { and, desc, eq, ilike, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { escapeLike } from "@/lib/db-utils";
import { mediaFiles } from "@/modules/media/schema";
import { copyFileObject, deleteFileObject } from "@/modules/media/storage";
import {
  extensionForMime,
  planRenamedKey,
  slugifyFileStem,
} from "@/modules/media/validation";

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
    public code: "NOT_FOUND" | "ALREADY_DELETED" | "VALIDATION",
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

/** Restore a trashed row: clear deletedAt so it rejoins the library grid.
 *  The stored object was never removed by trashing, so nothing else moves. */
export async function restoreMediaFile(id: string): Promise<boolean> {
  const [row] = await db
    .update(mediaFiles)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(mediaFiles.id, id), isNotNull(mediaFiles.deletedAt)))
    .returning({ id: mediaFiles.id });
  return Boolean(row);
}

/**
 * Permanently delete ONE trashed file: remove the stored object through its
 * own driver first, then the row. A driver failure propagates (the action
 * relays it as STORAGE) and the row is KEPT, so a failed purge never orphans
 * an object the library no longer knows about — same rule as emptyTrash.
 */
export async function permanentlyDeleteMediaFile(id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: mediaFiles.id, disk: mediaFiles.disk, path: mediaFiles.path })
    .from(mediaFiles)
    .where(and(eq(mediaFiles.id, id), isNotNull(mediaFiles.deletedAt)))
    .limit(1);
  if (!row) return false;
  await deleteFileObject(row.disk, row.path);
  await db.delete(mediaFiles).where(eq(mediaFiles.id, row.id));
  return true;
}

// ---- rename (SEO slug) -------------------------------------------------------
//
// Content across the app references a media file by its URL STRING (the
// picker stores the picked URL into listings, posts, settings, …), so a
// rename that moves the stored object MUST rewrite every stored copy of the
// old URL in the same transaction, or the site keeps pointing at the old key.
// The registry below is every column that can hold a media URL, audited
// against the module schemas (FU-13). `replace()` on the exact full URL is
// safe: URLs contain no JSON-escaped characters, and a full-string match can
// never partially rewrite a different file's URL. When a new URL-bearing
// column is added anywhere, it must be added here too.

type UrlColumn = { table: string; column: string; kind: "text" | "jsonb" };

const MEDIA_URL_COLUMNS: UrlColumn[] = [
  { table: "destinations", column: "image", kind: "text" },
  { table: "destinations", column: "seo", kind: "jsonb" },
  { table: "listings", column: "cover_image", kind: "jsonb" },
  { table: "listings", column: "gallery", kind: "jsonb" },
  { table: "listings", column: "seo", kind: "jsonb" },
  { table: "posts", column: "content", kind: "text" },
  { table: "posts", column: "featured_image", kind: "jsonb" },
  { table: "posts", column: "gallery", kind: "jsonb" },
  { table: "posts", column: "seo", kind: "jsonb" },
  { table: "pages", column: "sections", kind: "jsonb" },
  { table: "pages", column: "seo", kind: "jsonb" },
  { table: "landing_pages", column: "sections", kind: "jsonb" },
  { table: "landing_pages", column: "form_config", kind: "jsonb" },
  { table: "landing_pages", column: "seo", kind: "jsonb" },
  { table: "settings", column: "value", kind: "jsonb" },
  { table: "payment_gateways", column: "logo_url", kind: "text" },
  { table: "expenses", column: "receipt_url", kind: "text" },
  { table: "testimonials", column: "photo_url", kind: "text" },
  { table: "testimonials", column: "gallery_urls", kind: "jsonb" },
  { table: "visa_services", column: "seo", kind: "jsonb" },
  { table: "service_options", column: "seo", kind: "jsonb" },
];

/** Rewrite every stored reference from oldUrl to newUrl inside a transaction.
 *  Table/column identifiers come ONLY from the constant registry above; the
 *  URLs travel as bound parameters. */
async function replaceMediaUrlReferences(
  tx: Pick<typeof db, "execute">,
  oldUrl: string,
  newUrl: string,
): Promise<void> {
  const pattern = `%${oldUrl.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  for (const { table, column, kind } of MEDIA_URL_COLUMNS) {
    const t = sql.identifier(table);
    const c = sql.identifier(column);
    if (kind === "jsonb") {
      await tx.execute(
        sql`UPDATE ${t} SET ${c} = replace(${c}::text, ${oldUrl}, ${newUrl})::jsonb WHERE ${c}::text LIKE ${pattern} ESCAPE '\\'`,
      );
    } else {
      await tx.execute(
        sql`UPDATE ${t} SET ${c} = replace(${c}, ${oldUrl}, ${newUrl}) WHERE ${c} LIKE ${pattern} ESCAPE '\\'`,
      );
    }
  }
}

/**
 * Rename a library file to an SEO-friendly slug name. The user-typed stem is
 * slugified server-side; the stored object is COPIED to the new slug key, the
 * row + every stored URL reference are updated in one transaction, and only
 * then is the old object deleted (best effort — an orphaned old object harms
 * nothing, while a lost new object would break the site). If the transaction
 * fails, the copied object is removed and the original state is untouched.
 * The display name always follows the real file name (`<slug>.<ext>`, with a
 * `-2`/`-3` suffix when the slug is taken) so what the admin sees IS the URL.
 * Owner-scoped portal documents are not renamable here (NOT_FOUND).
 */
export async function renameMediaFile(id: string, requestedStem: string): Promise<MediaFile> {
  const slug = slugifyFileStem(requestedStem);
  if (!slug) {
    throw new MediaError(
      "VALIDATION",
      "The file name must contain English letters or numbers — the web address can only use a–z, 0–9 and hyphens.",
    );
  }

  const [row] = await db
    .select()
    .from(mediaFiles)
    .where(and(eq(mediaFiles.id, id), isNull(mediaFiles.deletedAt), isNull(mediaFiles.ownerUserId)))
    .limit(1);
  if (!row) {
    throw new MediaError("NOT_FOUND", "File not found or already deleted.");
  }

  const ext = extensionForMime(row.mime);
  if (!ext) {
    throw new MediaError("VALIDATION", "This file type cannot be renamed.");
  }

  const takenRows = await db
    .select({ path: mediaFiles.path })
    .from(mediaFiles)
    .where(ne(mediaFiles.id, id));
  const newKey = planRenamedKey(slug, ext, new Set(takenRows.map((r) => r.path)));

  if (newKey === row.path && newKey === row.name) {
    return toMediaFile(row); // already carries exactly this name — no-op
  }

  let newUrl = row.url;
  let copied = false;
  if (newKey !== row.path) {
    const stored = await copyFileObject(row.disk, row.path, newKey, row.mime);
    newUrl = stored.url;
    copied = true;
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const [u] = await tx
        .update(mediaFiles)
        .set({ name: newKey, path: newKey, url: newUrl, updatedAt: new Date() })
        .where(eq(mediaFiles.id, id))
        .returning();
      if (!u) {
        throw new MediaError("NOT_FOUND", "File not found or already deleted.");
      }
      if (newUrl !== row.url) {
        await replaceMediaUrlReferences(tx, row.url, newUrl);
      }
      return u;
    });
    if (copied) {
      try {
        await deleteFileObject(row.disk, row.path);
      } catch {
        // Best effort: the old object is unreferenced after the sweep; an
        // orphan costs a little storage but must not fail the rename.
      }
    }
    return toMediaFile(updated);
  } catch (e) {
    if (copied) {
      try {
        await deleteFileObject(row.disk, newKey);
      } catch {
        // Rollback cleanup is best effort too — the row still points at the
        // original object, which was never touched.
      }
    }
    throw e;
  }
}
