"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { extensionForMime, formatBytes } from "@/modules/media/validation";
import { renameFile, trashFile, updateFileAlt } from "@/modules/media/actions";
import { useToast } from "@/hooks/use-toast";
import type { MediaItem } from "./types";
import CopyUrlButton, { absoluteMediaUrl } from "./CopyUrlButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALT_MAX = 200;

/** "12 Sep 2026, 14:32"-style stamp, matching the trash view's formatter. */
function formatUploaded(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function stemOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Media detail dialog (FU-13) — what opens when a library card is clicked.
 * Before FU-13 a click did nothing and the only per-file actions were the
 * card's hover alt-edit and trash icons. The dialog carries the full
 * management surface for one file: large preview, metadata (type, size,
 * uploaded date, pixel dimensions read from the loaded image), the file URL
 * with copy, open/download, alt-text editing, SEO rename, and trash.
 *
 * Rename is a REAL rename: the service moves the stored object to the slug
 * key and rewrites every in-site reference, so the helper copy warns that
 * links shared OUTSIDE the site break — that trade-off is the price of an
 * SEO-friendly URL and the admin must see it before confirming.
 */
export default function MediaDetailDialog({
  file,
  open,
  onOpenChange,
}: {
  file: MediaItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isPdf = file.mime === "application/pdf";
  const ext = extensionForMime(file.mime) ?? "";

  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [stem, setStem] = useState(stemOf(file.name));
  const [alt, setAlt] = useState(file.alt ?? "");
  const [busy, setBusy] = useState<"rename" | "alt" | "trash" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingTrash, setConfirmingTrash] = useState(false);

  // Fresh drafts every time the dialog opens (and never mid-edit). Scheduled
  // via a 0ms timer — the codebase convention for open-triggered state resets
  // (react-hooks set-state-in-effect; same pattern as the media picker).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setStem(stemOf(file.name));
      setAlt(file.alt ?? "");
      setDims(null);
      setError(null);
      setConfirmingTrash(false);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [open ]);

  const relay = (res: { ok: boolean; error?: string }, fallback: string) =>
    res.error === "UNAUTHORIZED" ? "You don't have permission." : (res.error ?? fallback);

  const saveRename = async () => {
    const next = stem.trim();
    if (!next || next === stemOf(file.name)) return;
    setBusy("rename");
    setError(null);
    try {
      const res = await renameFile({ id: file.id, name: next });
      if (!res.ok) {
        setError(relay(res, "Could not rename the file."));
        return;
      }
      toast({
        title: "File renamed",
        description: `New address: ${res.data.url}`,
      });
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(null);
    }
  };

  const saveAlt = async () => {
    const next = alt.trim();
    if (next === (file.alt ?? "").trim()) return;
    setBusy("alt");
    setError(null);
    try {
      const res = await updateFileAlt({ id: file.id, alt: next });
      if (!res.ok) {
        setError(relay(res, "Could not save alt text."));
        return;
      }
      toast({ title: "Alt text saved" });
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(null);
    }
  };

  const trash = async () => {
    setBusy("trash");
    setError(null);
    try {
      const res = await trashFile({ id: file.id });
      if (!res.ok) {
        setError(relay(res, "Could not trash the file."));
        return;
      }
      toast({ title: "Moved to trash", description: `"${file.name}" left the library.` });
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(null);
    }
  };

  const absoluteUrl = absoluteMediaUrl(file.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate pr-8 text-base font-semibold" title={file.name}>
            {file.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {file.mime} · {formatBytes(file.size)} · Uploaded {formatUploaded(file.createdAt)}
            {dims ? ` · ${dims.w} × ${dims.h} px` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {isPdf ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileText className="h-12 w-12" aria-hidden="true" />
              <span className="text-sm font-medium">PDF document</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- detail preview needs natural-size onLoad + unoptimized SVG/remote parity with the card
            <img
              src={file.url}
              alt={file.alt?.trim() || file.name}
              className="h-full w-full object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth > 0) {
                  setDims({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
            />
          )}
        </div>

        {/* URL + quick actions */}
        <div className="space-y-2">
          <Label htmlFor={`detail-url-${file.id}`} className="text-[13px] font-medium text-foreground">
            File URL
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`detail-url-${file.id}`}
              value={absoluteUrl}
              readOnly
              onFocus={(e) => e.target.select()}
              className="h-10 flex-1 rounded-lg font-mono text-xs"
            />
            <CopyUrlButton url={file.url} name={file.name} variant="labeled" />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button asChild variant="outline" className="h-10 gap-1.5 rounded-lg text-sm font-semibold">
              <a href={absoluteUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 gap-1.5 rounded-lg text-sm font-semibold">
              <a href={absoluteUrl} download={file.name}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </a>
            </Button>
          </div>
        </div>

        {/* Rename (SEO) */}
        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label htmlFor={`detail-name-${file.id}`} className="text-[13px] font-medium text-foreground">
            File name (used in the web address — SEO)
          </Label>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center">
              <Input
                id={`detail-name-${file.id}`}
                value={stem}
                onChange={(e) => setStem(e.target.value)}
                placeholder="umrah-package-makkah-view"
                className="h-10 flex-1 rounded-r-none rounded-l-lg font-mono text-xs"
              />
              <span className="flex h-10 items-center rounded-r-lg border border-l-0 border-border bg-muted px-2.5 font-mono text-xs text-muted-foreground">
                .{ext}
              </span>
            </div>
            <Button
              type="button"
              className="h-10 shrink-0 rounded-lg text-sm font-semibold"
              disabled={busy !== null || !stem.trim() || stem.trim() === stemOf(file.name)}
              onClick={() => void saveRename()}
            >
              {busy === "rename" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Rename
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Renaming changes the file&rsquo;s web address. Links inside this site
            update automatically — links shared outside the site (for example on
            Facebook) will stop working.
          </p>
        </div>

        {/* Alt text */}
        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label htmlFor={`detail-alt-${file.id}`} className="text-[13px] font-medium text-foreground">
            Alt text
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`detail-alt-${file.id}`}
              value={alt}
              maxLength={ALT_MAX}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers and search engines"
              className="h-10 flex-1 rounded-lg text-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 rounded-lg text-sm font-semibold"
              disabled={busy !== null || alt.trim() === (file.alt ?? "").trim()}
              onClick={() => void saveAlt()}
            >
              {busy === "alt" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
              Save
            </Button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {/* Trash */}
        <div className="border-t border-border/60 pt-4">
          {confirmingTrash ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2.5">
              <p className="text-sm font-medium text-destructive">
                Move &ldquo;{file.name}&rdquo; to the trash?
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg text-sm font-semibold"
                  disabled={busy !== null}
                  onClick={() => setConfirmingTrash(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-lg bg-destructive text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
                  disabled={busy !== null}
                  onClick={() => void trash()}
                >
                  {busy === "trash" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Trash file
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-10 gap-1.5 rounded-lg text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmingTrash(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Move to trash
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
