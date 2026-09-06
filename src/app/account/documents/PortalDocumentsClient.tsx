"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
} from "lucide-react";
import type { MediaFile } from "@/modules/media/service";
import { uploadMyDocumentAction } from "@/modules/media/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PortalDocumentsClientProps = {
  items: MediaFile[];
  total: number;
  page: number;
  totalPages: number;
};

const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalDocumentsClient({
  items,
  total,
  page,
  totalPages,
}: PortalDocumentsClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleUploadFile = (file: File) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    // Validate size
    if (file.size > MAX_BYTES) {
      setErrorMessage("File exceeds the 10 MB upload limit.");
      return;
    }

    // Validate type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validMimes.includes(file.type)) {
      setErrorMessage("Invalid file type. Allowed formats: JPEG, PNG, WebP, PDF.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);

        const res = await uploadMyDocumentAction(formData);
        if (res.ok) {
          setSuccessNotice(`Document "${file.name}" uploaded successfully.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to upload document.");
        }
      } catch {
        setErrorMessage("An unexpected upload error occurred. Please try again.");
      }
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleUploadFile(droppedFile);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload and store passport copies, visa grants, and travel health documents for your bookings.
        </p>
      </div>

      {/* Global Notices */}
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {successNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-success"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Upload Dropzone — keyboard reachable (Enter/Space opens the file
          picker) alongside click and drag-drop. */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a document"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30 bg-card"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUploadFile(f);
          }}
          className="hidden"
        />

        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary mb-3">
          {isPending ? (
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-6" aria-hidden="true" />
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground">
          {isPending ? "Uploading Document..." : "Click or drag & drop to upload document"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Supports JPEG, PNG, WebP, and PDF up to 10 MB. Documents are securely stored and accessible to your travel advisors.
        </p>
      </div>

      {/* Documents Grid */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((doc) => {
            const isPdf = doc.mime === "application/pdf";
            return (
              <Card key={doc.id} className="shadow-xs overflow-hidden flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary/30">
                      {isPdf ? (
                        <FileText className="size-5 text-destructive" aria-hidden="true" />
                      ) : (
                        <ImageIcon className="size-5 text-primary" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {formatFileSize(doc.size)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-2.5">
                    <Button asChild variant="outline" size="sm" className="h-8 w-full text-xs gap-1.5">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3" aria-hidden="true" />
                        View Document
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{items.length}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> documents
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/account/documents?page=${page - 1}` as Route}>
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Previous
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/account/documents?page=${page + 1}` as Route}>
                Next
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
