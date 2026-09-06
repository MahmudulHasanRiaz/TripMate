import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaFiles } from "@/modules/media/schema";
import { putFileObject } from "@/modules/media/storage";
import {
  USER_DOC_MAX_UPLOAD_BYTES,
  isAcceptedUserDocMime,
  uuidSchema,
} from "@/modules/media/validation";
import { toMediaFile, type MediaFile, type Paginated } from "@/modules/media/service";

// The customer-portal document surface (Plan 5 T3 media ownership). Rows live
// in the same media_files table as the admin library, separated by
// owner_user_id: NULL = a library file, set = a user's own document. This
// module is server-only for the same reason service.ts is.
//
// The storage dispatch (setting → driver → server-generated key) is the shared
// putFileObject helper storage.ts extracts from the admin upload path; only
// the RULES differ here — the stricter user-document whitelist (no SVG) and
// the 10MB cap, both re-enforced server-side in addition to the action's zod
// boundary (the whitelist check is what keeps buildStorageKey from ever
// minting an .svg key on this path).

// ---- errors -------------------------------------------------------------------

export class UserDocError extends Error {
  constructor(
    public code: "VALIDATION" | "STORAGE",
    message: string,
  ) {
    super(message);
    this.name = "UserDocError";
  }
}

// ---- uploads ------------------------------------------------------------------

export type UploadUserDocumentInput = {
  /** The owning user — stamped on the row; reads are owner-scoped. */
  ownerUserId: string;
  /** Display name from the multipart meta (already zod-validated upstream). */
  name: string;
  mime: string;
  size: number;
  buffer: Buffer;
  alt?: string | null;
};

/**
 * Store one user document and record its owner-scoped media row. The whitelist
 * + cap are re-checked here (defense in depth — the action's zod boundary is
 * the first check, this is the last one before bytes move), the object is
 * stored through the configured driver under a server-generated key, and the
 * row lands with ownerUserId set so it appears in listUserDocuments (and
 * never in the admin library grid).
 */
export async function uploadUserDocument(
  input: UploadUserDocumentInput,
): Promise<MediaFile> {
  if (!uuidSchema.safeParse(input.ownerUserId).success) {
    throw new UserDocError("VALIDATION", "Invalid document owner.");
  }
  if (!isAcceptedUserDocMime(input.mime)) {
    throw new UserDocError(
      "VALIDATION",
      `File type "${input.mime}" is not accepted. Allowed: JPEG, PNG, WebP, PDF.`,
    );
  }
  if (!Number.isInteger(input.size) || input.size <= 0) {
    throw new UserDocError("VALIDATION", "File is empty.");
  }
  if (input.size > USER_DOC_MAX_UPLOAD_BYTES) {
    throw new UserDocError("VALIDATION", "File exceeds the 10 MB upload limit.");
  }

  let stored;
  try {
    stored = await putFileObject(input.mime, input.buffer);
  } catch (e) {
    throw new UserDocError(
      "STORAGE",
      e instanceof Error ? e.message : "Storage upload failed.",
    );
  }

  const [row] = await db
    .insert(mediaFiles)
    .values({
      name: input.name,
      disk: stored.disk,
      path: stored.path,
      url: stored.url,
      mime: input.mime,
      size: input.size,
      alt: input.alt?.trim() || null,
      ownerUserId: input.ownerUserId,
    })
    .returning();
  return toMediaFile(row);
}

// ---- reads ----------------------------------------------------------------------

export type UserDocumentListQuery = { page?: number; perPage?: number };

/** One user's own documents: owner match + not soft-deleted, newest first.
 *  perPage defaults to 20 and caps at 50. */
export async function listUserDocuments(
  ownerUserId: string,
  query: UserDocumentListQuery = {},
): Promise<Paginated<MediaFile>> {
  const where = and(eq(mediaFiles.ownerUserId, ownerUserId), isNull(mediaFiles.deletedAt));
  const safePage = Math.max(1, Math.floor(query.page ?? 1));
  const safePerPage = Math.min(50, Math.max(1, Math.floor(query.perPage ?? 20)));
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
