import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { FileText, Images, Trash2 } from "lucide-react";
import { listFiles, listTrashedFiles, type MediaFile } from "@/modules/media/service";
import { formatBytes } from "@/modules/media/validation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MediaUploader from "./MediaUploader";
import MediaSearch from "./MediaSearch";
import MediaCard from "./MediaCard";
import EmptyTrashButton from "./EmptyTrashButton";
import type { MediaItem } from "./types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Media library" };

// Fresh, per-request DB reads behind an auth gate — no static shell to serve.
export const instant = false;

const PER_PAGE = 24;

type SearchParams = { q?: string; page?: string; view?: string };

function toItem(f: MediaFile): MediaItem {
  return {
    id: f.id,
    name: f.name,
    url: f.url,
    mime: f.mime,
    size: f.size,
    alt: f.alt,
  };
}

/** Deterministic "12 Sep 2026"-style stamp for trash rows. */
function formatDeleted(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Compact 40px thumbnail for a trash row (same preview rules as MediaCard). */
function TrashThumb({ file }: { file: MediaFile }) {
  const alt = file.alt?.trim() || file.name;
  const raster =
    (file.mime === "image/jpeg" ||
      file.mime === "image/png" ||
      file.mime === "image/webp") &&
    file.url.startsWith("/");

  if (file.mime === "application/pdf") {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }
  if (raster) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
        <Image src={file.url} alt={alt} fill sizes="40px" className="object-cover" />
      </div>
    );
  }
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG/remote raster bypass next/image on purpose */}
      <img src={file.url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

/** Shared Previous/Next pager (both views pass their own link builder). */
function Pager({
  page,
  totalPages,
  href,
}: {
  page: number;
  totalPages: number;
  href: (delta: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        asChild
        variant="outline"
        size="sm"
        aria-disabled={page <= 1}
        className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
      >
        <Link href={page > 1 ? (href(-1) as Route) : "#"}>Previous</Link>
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        asChild
        variant="outline"
        size="sm"
        aria-disabled={page >= totalPages}
        className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
      >
        <Link href={page < totalPages ? (href(1) as Route) : "#"}>Next</Link>
      </Button>
    </div>
  );
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;
  const view = sp.view === "trash" ? "trash" : "library";

  // The toggle badge needs the trash count in both views; the trash view's
  // own listing provides it there, so the extra count query only runs on the
  // library tab.
  let trashTotal = 0;
  let trashItems: MediaFile[] = [];
  let items: MediaFile[] = [];
  let total = 0;

  if (view === "trash") {
    const trash = await listTrashedFiles({ page, perPage: PER_PAGE });
    trashItems = trash.items;
    trashTotal = trash.total;
  } else {
    const library = await listFiles({ search: q || undefined, page, perPage: PER_PAGE });
    items = library.items;
    total = library.total;
    const countOnly = await listTrashedFiles({ page: 1, perPage: 1 });
    trashTotal = countOnly.total;
  }

  const totalPages = Math.max(1, Math.ceil((view === "trash" ? trashTotal : total) / PER_PAGE));

  const pageParams = (delta: number) => {
    const params = new URLSearchParams();
    if (view === "trash") {
      params.set("view", "trash");
    } else if (q) {
      params.set("q", q);
    }
    params.set("page", String(Math.min(totalPages, Math.max(1, page + delta))));
    return params.toString();
  };

  const libraryHref = q ? (`/admin/media?q=${encodeURIComponent(q)}` as Route) : ("/admin/media" as Route);

  return (
    <div className="space-y-5">
      {view === "library" ? <MediaUploader /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {view === "trash" ? "Trash" : "Files"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {view === "trash"
              ? `${trashTotal} ${trashTotal === 1 ? "file" : "files"} — permanently deleted when the trash is emptied`
              : `${total} ${total === 1 ? "file" : "files"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === "trash" ? <EmptyTrashButton count={trashTotal} /> : null}
          <nav
            aria-label="Media library views"
            className="flex items-center gap-1 rounded-md border border-border p-1"
          >
            <Button asChild variant={view === "library" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs">
              <Link href={libraryHref}>Library</Link>
            </Button>
            <Button asChild variant={view === "trash" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs">
              <Link href="/admin/media?view=trash">
                Trash ({trashTotal})
              </Link>
            </Button>
          </nav>
        </div>
      </div>

      {view === "trash" ? (
        trashItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <Trash2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium text-muted-foreground">
                Trash is empty — trashed files wait here until permanently deleted.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {trashItems.map((f) => (
              <li
                key={f.id}
                className={cn("flex items-center gap-3 rounded-md border border-border p-3")}
              >
                <TrashThumb file={f} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={f.name}>
                    {f.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Trashed {f.deletedAt ? formatDeleted(f.deletedAt) : "—"}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(f.size)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <MediaSearch initialQ={q} />

          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <Images className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium text-muted-foreground">
                  {q
                    ? `No files match "${q}".`
                    : "No files yet — upload your first image or PDF above."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((f) => (
                <li key={f.id} className="min-w-0">
                  <MediaCard file={toItem(f)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Pager page={page} totalPages={totalPages} href={(delta) => `/admin/media?${pageParams(delta)}`} />
    </div>
  );
}
