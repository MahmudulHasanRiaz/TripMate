import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Images } from "lucide-react";
import { listFiles } from "@/modules/media/service";
import type { MediaFile } from "@/modules/media/service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MediaUploader from "./MediaUploader";
import MediaSearch from "./MediaSearch";
import MediaCard from "./MediaCard";
import type { MediaItem } from "./types";

export const metadata: Metadata = { title: "Media library" };

// Fresh, per-request DB reads behind an auth gate — no static shell to serve.
export const instant = false;

const PER_PAGE = 24;

type SearchParams = { q?: string; page?: string };

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

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const { items, total } = await listFiles({ search: q || undefined, page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const pageParams = (delta: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(Math.min(totalPages, Math.max(1, page + delta))));
    return params.toString();
  };

  const empty = items.length === 0;

  return (
    <div className="space-y-5">
      <MediaUploader />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Files</h2>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "file" : "files"}
          </p>
        </div>
      </div>

      <MediaSearch initialQ={q} />

      {empty ? (
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
          >
            <Link href={page > 1 ? (`/admin/media?${pageParams(-1)}` as Route) : "#"}>
              Previous
            </Link>
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
            <Link
              href={page < totalPages ? (`/admin/media?${pageParams(1)}` as Route) : "#"}
            >
              Next
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
