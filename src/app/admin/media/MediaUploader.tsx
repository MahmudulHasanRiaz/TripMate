"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, UploadCloud } from "lucide-react";
import {
  ACCEPTED_MIME_LIST,
  MAX_UPLOAD_BYTES,
  MIME_EXTENSIONS,
} from "@/modules/media/validation";
import { uploadFile } from "@/modules/media/actions";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCEPT_ATTR = ACCEPTED_MIME_LIST.join(",");

/** Files with an empty `type` (some drag sources) get it guessed from the
 *  extension so a valid .png/.jpg still passes the client pre-check; the server
 *  re-derives everything from the mime and stays the authority. */
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

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; current: string; index: number; total: number }
  | { kind: "error"; message: string }
  | { kind: "done"; count: number };

/**
 * Dropzone + file-input uploader for the media library.
 *
 * A single pointer alternative to drag-drop (WCAG 2.2): the whole zone is a
 * real <button> that opens the file picker, so keyboard-only users can upload
 * without dragging. Uploads ride the `uploadFile` server action (media.manage
 * + 20/min rate limit); files are queued and sent one at a time so each gets
 * its own action round-trip. Server-action bodies don't stream, so "progress"
 * is honest busy feedback (spinner + per-file status), not a fake percentage.
 */
export default function MediaUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const dragDepth = useRef(0);

  const openPicker = () => inputRef.current?.click();

  const onFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setStatus({ kind: "idle" });

    let uploaded = 0;
    const total = files.length;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mime = effectiveMime(file);

      if (mime && !ACCEPTED_MIME_LIST.includes(mime as (typeof ACCEPTED_MIME_LIST)[number])) {
        setStatus({
          kind: "error",
          message: `"${file.name}" isn't an allowed type. Use JPEG, PNG, WebP, SVG or PDF.`,
        });
        return;
      }
      if (file.size <= 0) {
        setStatus({ kind: "error", message: `"${file.name}" is empty.` });
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setStatus({
          kind: "error",
          message: `"${file.name}" exceeds the 25 MB upload limit.`,
        });
        return;
      }

      setStatus({ kind: "uploading", current: file.name, index: i + 1, total });
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await uploadFile(formData);
        if (!res.ok) {
          if (res.error === "RATE_LIMITED") {
            setStatus({
              kind: "error",
              message: "Too many uploads in the last minute — please wait and try again.",
            });
          } else {
            setStatus({ kind: "error", message: res.error ?? "Upload failed." });
          }
          return;
        }
        uploaded += 1;
      } catch {
        setStatus({ kind: "error", message: "Upload failed on the server." });
        return;
      }
    }

    setStatus({ kind: "done", count: uploaded });
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    void onFiles(files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void onFiles(Array.from(e.dataTransfer.files ?? []));
  };

  const busy = status.kind === "uploading";

  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
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
          onDrop={onDrop}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-8 text-center outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={inputRef}
            id="media-file-input"
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="sr-only"
            onChange={onInputChange}
            disabled={busy}
          />
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : dragging ? (
            <UploadCloud className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Upload className="h-6 w-6" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">
            {busy
              ? `Uploading ${status.current} (${status.index}/${status.total})…`
              : dragging
                ? "Drop files to upload"
                : "Drag & drop files here, or click to browse"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, SVG or PDF · up to 25 MB each
          </span>
        </button>

        {status.kind === "error" ? (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {status.message}
          </p>
        ) : null}
        {status.kind === "done" ? (
          <p className="mt-3 text-sm font-medium text-emerald-600">
            Uploaded {status.count} {status.count === 1 ? "file" : "files"}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
