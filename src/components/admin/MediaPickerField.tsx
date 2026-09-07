"use client";

/**
 * MediaPickerField — the admin forms' image-URL input with a media-library
 * picker attached (Plan 7 T2).
 *
 * Replaces the bare URL text inputs on ListingForm / PostForm /
 * SettingsTabsView: manual URL typing stays fully working, and a "Browse"
 * button opens a dialog that lists the library (searchable, page 1 of 24) with
 * an inline upload dropzone — the upload flow mirrors MediaUploader (same
 * client pre-checks, same FormData → uploadFile action) so an operator can
 * upload-then-pick in one place.
 *
 * Two exports:
 *  - default MediaPickerField: label + URL input + 44px-target Browse button.
 *    Drop it inside <FormControl> — the input passthrough props (id,
 *    aria-invalid, aria-describedby from the Slot merge) land on the <Input>,
 *    so react-hook-form's wiring keeps working.
 *  - MediaPickerButton: the browse button alone (44px target, compact 32px
 *    visual) for repeatable rows that already render their own registered
 *    input — the caller receives the picked URL and writes it via setValue.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { FileText, ImagePlus, Loader2, Search, Upload, UploadCloud } from "lucide-react";
import {
  ACCEPTED_MIME_LIST,
  MAX_UPLOAD_BYTES,
  MIME_EXTENSIONS,
} from "@/modules/media/validation";
import { listMediaAction, uploadFile } from "@/modules/media/actions";
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
import { cn } from "@/lib/utils";

const ACCEPT_ATTR = ACCEPTED_MIME_LIST.join(",");

/** The item subset the picker grid renders (the action returns full rows). */
type PickerItem = {
  id: string;
  name: string;
  url: string;
  mime: string;
  alt: string | null;
};

/** Files with an empty `type` (some drag sources) get it guessed from the
 *  extension — same helper as MediaUploader; the server re-derives everything
 *  from the mime and stays the authority. */
function effectiveMime(file: File): string {
  if (file.type) return file.type;
  const dot = file.name.lastIndexOf(".");
  if (dot < 0) return "";
  const ext = file.name.slice(dot + 1).toLowerCase();
  for (const [mime, e] of Object.entries(MIME_EXTENSIONS)) {
    if (e === ext) return mime;
  }
  return "";
}

/* -------------------------------------------------------------------------- */
/* Picker dialog                                                              */
/* -------------------------------------------------------------------------- */

function PickerThumb({ item }: { item: PickerItem }) {
  const alt = item.alt?.trim() || item.name;
  const raster =
    (item.mime === "image/jpeg" ||
      item.mime === "image/png" ||
      item.mime === "image/webp") &&
    item.url.startsWith("/");

  if (item.mime === "application/pdf") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }
  if (raster) {
    return (
      <Image src={item.url} alt={alt} fill sizes="160px" className="object-cover" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG/remote raster bypass next/image on purpose
    <img src={item.url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
  );
}

function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
  accept,
  selectedUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (url: string) => void;
  /** "image" hides non-image rows (PDF) from the grid; "any" shows all. */
  accept: "image" | "any";
  /** Current field value — highlights the already-selected tile. */
  selectedUrl: string;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  // Debounce the search so typing doesn't fire an action per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listMediaAction({ search: debounced || undefined, page: 1 });
      if (res.ok) {
        setItems(res.data.items);
        setTotal(res.data.total);
      } else {
        setLoadError(
          res.error === "UNAUTHORIZED"
            ? "You don't have permission to browse the media library."
            : (res.error ?? "Could not load the media library."),
        );
      }
    } catch {
      setLoadError("Could not load the media library.");
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  // Fetch on open + on search change. Scheduled out of the effect body via a
  // 0ms timer: load() starts by flipping the spinner state, and the
  // react-hooks set-state-in-effect rule (rightly) forbids synchronous
  // setState cascades in effects (same convention as PackageFilters).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [open, load]);

  const onFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mime = effectiveMime(file);

      if (mime && !ACCEPTED_MIME_LIST.includes(mime as (typeof ACCEPTED_MIME_LIST)[number])) {
        setUploadError(
          `"${file.name}" isn't an allowed type. Use JPEG, PNG, WebP, SVG or PDF.`,
        );
        return;
      }
      if (file.size <= 0) {
        setUploadError(`"${file.name}" is empty.`);
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`"${file.name}" exceeds the 25 MB upload limit.`);
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await uploadFile(formData);
        if (!res.ok) {
          setUploadError(
            res.error === "RATE_LIMITED"
              ? "Too many uploads in the last minute — please wait and try again."
              : (res.error ?? "Upload failed."),
          );
          return;
        }
      } catch {
        setUploadError("Upload failed on the server.");
        return;
      } finally {
        setUploading(false);
      }
    }

    if (inputRef.current) inputRef.current.value = "";
    // Refresh the grid so the new upload appears (newest first) and is pickable.
    await load();
  };

  const pick = (item: PickerItem) => {
    onPick(item.url);
    onOpenChange(false);
  };

  const visible = accept === "image" ? items.filter((i) => i.mime.startsWith("image/")) : items;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Pick a file or upload a new one — it lands at the top of the grid.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or alt text…"
            className="h-9 pl-9"
            aria-label="Search media library"
          />
        </div>

        {/* Inline upload dropzone (compact MediaUploader mirror) */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            void onFiles(Array.from(e.dataTransfer.files ?? []));
          }}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed px-4 py-4 text-center outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={inputRef}
            id="media-picker-upload-input"
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              void onFiles(Array.from(e.target.files ?? []));
            }}
          />
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : dragging ? (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : "Drop a file here, or click to upload"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, SVG or PDF · up to 25 MB each
          </span>
        </button>

        {uploadError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {uploadError}
          </p>
        ) : null}
        {loadError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {loadError}
          </p>
        ) : null}

        {/* Grid */}
        <div className="max-h-[55vh] overflow-y-auto pr-1" role="group" aria-label="Media files">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading files…
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {debounced
                ? `No files match "${debounced}".`
                : "No files yet — upload one above."}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {visible.map((item) => {
                const selected = item.url === selectedUrl;
                return (
                  <li key={item.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => pick(item)}
                      aria-label={`Select ${item.name}`}
                      title={item.name}
                      className={cn(
                        "w-full overflow-hidden rounded-md border text-left outline-none transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-muted-foreground/40",
                      )}
                    >
                      <span className="relative block aspect-square w-full bg-muted">
                        <PickerThumb item={item} />
                      </span>
                      <span className="block truncate px-1.5 py-1 text-[11px] text-muted-foreground">
                        {item.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? "file" : "files"} in the library
          {accept === "image" && total > 0 ? " (images only shown)" : ""}
        </p>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Field (default) + row button                                               */
/* -------------------------------------------------------------------------- */

export type MediaPickerFieldProps = {
  /** Visible label. Omit when the surrounding form already labels the field. */
  label?: string;
  value: string;
  onChange: (url: string) => void;
  /** "image" (default) filters the picker grid to images; "any" shows all. */
  accept?: "image" | "any";
} & Omit<React.ComponentPropsWithoutRef<"input">, "value" | "onChange">;

export default function MediaPickerField({
  label,
  value,
  onChange,
  accept = "image",
  id,
  ...inputProps
}: MediaPickerFieldProps) {
  const autoId = useId();
  const inputId = id ?? (label ? autoId : undefined);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or pick from the library"
          {...inputProps}
        />
        {/* Hit-slop wrapper: 40px visual button, 48px pointer target. */}
        <span className="inline-flex shrink-0 -m-1 p-1">
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 gap-1.5"
            onClick={() => setOpen(true)}
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Browse
          </Button>
        </span>
      </div>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        accept={accept}
        onPick={onChange}
        selectedUrl={value}
      />
    </div>
  );
}

/** Browse-only variant for repeatable rows that render their own input. */
export function MediaPickerButton({
  onPick,
  accept = "image",
  label,
}: {
  onPick: (url: string) => void;
  accept?: "image" | "any";
  /** Accessible label, e.g. "Browse media for gallery image 1". */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Hit-slop wrapper: 32px visual button (matches the row's remove
          button), 44px pointer target. */}
      <span className="mt-1 inline-flex shrink-0 -m-1.5 p-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label={label}
          title="Browse media library"
          onClick={() => setOpen(true)}
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </span>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        accept={accept}
        onPick={onPick}
        selectedUrl=""
      />
    </>
  );
}
