import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { FileText, Images, Trash2 } from "lucide-react";
import { listFiles, listTrashedFiles, type MediaFile } from "@/modules/media/service";
import { formatBytes } from "@/modules/media/validation";
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
    <div className="flex items-center justify-between px-1 text-sm text-muted-foreground pt-2">
      <span className="text-sm tabular-nums font-medium">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page <= 1}
          className={`h-9 gap-1 text-sm rounded-lg font-medium ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
        >
          <Link href={page > 1 ? (href(-1) as Route) : "#"}>Previous</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          className={`h-9 gap-1 text-sm rounded-lg font-medium ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
        >
          <Link href={page < totalPages ? (href(1) as Route) : "#"}>Next</Link>
        </Button>
      </div>
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
    <div className="space-y-6">
      {view === "library" ? <MediaUploader /> : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {view === "trash" ? "Trash Bin" : "Media Library"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === "trash"
              ? `${trashTotal} ${trashTotal === 1 ? "file" : "files"} waiting for permanent deletion or restore`
              : `${total} ${total === 1 ? "file" : "files"} available across catalog and content modules`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {view === "trash" ? <EmptyTrashButton count={trashTotal} /> : null}
          <nav
            aria-label="Media library views"
            className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-xs"
          >
            <Button asChild variant={view === "library" ? "secondary" : "ghost"} size="sm" className="h-9 px-3 text-sm font-medium rounded-md">
              <Link href={libraryHref}>Library</Link>
            </Button>
            <Button asChild variant={view === "trash" ? "secondary" : "ghost"} size="sm" className="h-9 px-3 text-sm font-medium rounded-md">
              <Link href="/admin/media?view=trash">
                Trash ({trashTotal})
              </Link>
            </Button>
          </nav>
        </div>
      </div>

      {view === "trash" ? (
        trashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-14 text-center shadow-xs">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Trash2 className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">Trash is empty</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Trashed media items will wait here until permanently purged.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {trashItems.map((f) => (
              <li
                key={f.id}
                className={cn("flex items-center gap-3.5 rounded-xl border border-border bg-card p-3.5 shadow-xs")}
              >
                <TrashThumb file={f} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground" title={f.name}>
                    {f.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5">
                    Trashed {f.deletedAt ? formatDeleted(f.deletedAt) : "—"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-mono tabular-nums text-muted-foreground">
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-14 text-center shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Images className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">No media files found</h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                {q
                  ? `No media items match your search for "${q}".`
                  : "No media files uploaded yet. Drag and drop images or PDFs above."}
              </p>
              {q ? (
                <Button asChild variant="outline" className="mt-5 h-9 rounded-lg text-sm font-semibold">
                  <Link href={"/admin/media" as Route}>
                    Clear Search
                  </Link>
                </Button>
              ) : null}
            </div>
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
