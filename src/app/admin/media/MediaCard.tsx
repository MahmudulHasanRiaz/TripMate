"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { formatBytes } from "@/modules/media/validation";
import { trashFile, updateFileAlt } from "@/modules/media/actions";
import type { MediaItem } from "./types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ALT_MAX = 200;

const RASTER: Record<string, boolean> = {
  "image/jpeg": true,
  "image/png": true,
  "image/webp": true,
};

/** Short type badge for the preview corner. */
function typeLabel(mime: string): string {
  if (mime === "image/jpeg") return "JPG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "image/svg+xml") return "SVG";
  if (mime === "application/pdf") return "PDF";
  return mime.split("/")[1]?.toUpperCase() ?? "FILE";
}

function Preview({ file }: { file: MediaItem }) {
  const isPdf = file.mime === "application/pdf";

  if (isPdf) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  const alt = file.alt?.trim() || file.name;
  // Raster served from our own /uploads/... root → next/image optimizer. SVG and
  // any future remote (R2 custom domain) URL render unoptimized instead, so no
  // image config has to list the R2 host.
  const optimized = RASTER[file.mime] && file.url.startsWith("/");

  if (optimized) {
    return (
      <Image
        src={file.url}
        alt={alt}
        fill
        sizes="(min-width: 640px) 25vw, 50vw"
        className="object-cover"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG/remote raster bypass next/image on purpose
    <img src={file.url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
  );
}

/**
 * One library tile: preview + name + meta + inline alt-text editor + trash.
 * Alt editing is inline (no modal) — the field is the whole edit surface, with
 * Cancel to discard. Trash confirms first and only soft-deletes the ROW (the
 * stored object is kept for a future restore/empty-trash pass).
 */
export default function MediaCard({ file }: { file: MediaItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.alt ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const beginEdit = () => {
    setDraft(file.alt ?? "");
    setError(null);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (next === (file.alt ?? "").trim()) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await updateFileAlt({ id: file.id, alt: next });
      if (!res.ok) {
        setError(res.error ?? "Could not save alt text.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(false);
    }
  };

  const trash = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await trashFile({ id: file.id });
      if (!res.ok) {
        setError(res.error === "UNAUTHORIZED" ? "You don't have permission." : (res.error ?? "Could not trash file."));
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="group flex flex-col rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted">
        <Preview file={file} />
        <span className="absolute top-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-semibold tracking-wide text-foreground shadow-xs">
          {typeLabel(file.mime)}
        </span>
        <div className="absolute right-2 bottom-2 flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-lg shadow-xs"
            aria-label={`Edit alt for ${file.name}`}
            onClick={beginEdit}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive shadow-xs"
                aria-label={`Trash ${file.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base font-semibold">Trash this file?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  &ldquo;{file.name}&rdquo; will leave the library. The stored file
                  is kept so it can be restored later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}
              <AlertDialogFooter className="pt-2">
                <AlertDialogCancel disabled={busy} className="h-10 rounded-lg text-sm font-semibold">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    void trash();
                  }}
                  className="h-10 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Trash File
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="truncate text-sm font-semibold text-foreground" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          {typeLabel(file.mime)} · {formatBytes(file.size)}
        </p>

        {editing ? (
          <form onSubmit={save} className="mt-auto space-y-2 pt-1">
            <Label htmlFor={`alt-${file.id}`} className="text-[13px] font-medium text-foreground">
              Alt text
            </Label>
            <Input
              ref={inputRef}
              id={`alt-${file.id}`}
              value={draft}
              maxLength={ALT_MAX}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Describe the image for screen readers"
              className="h-9 text-xs rounded-lg border-border"
            />
            {error ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-semibold rounded-lg" disabled={busy}>
                {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Save
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-auto flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {file.alt?.trim() ? (
                file.alt
              ) : (
                <span className="italic">No alt text</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
