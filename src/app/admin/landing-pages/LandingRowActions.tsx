"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { AlertCircle, Check, Copy, Edit, ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { LandingPageStatus } from "@/modules/landing-pages/validation";
import { setLandingStatus, trashLandingPage } from "@/modules/landing-pages/actions";
import { Button } from "@/components/ui/button";
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

type LandingRowActionsProps = {
  id: string;
  slug: string;
  status: LandingPageStatus;
  title: string;
};

export default function LandingRowActions({
  id,
  slug,
  status,
  title,
}: LandingRowActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"status" | "trash" | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmTrashOpen, setConfirmTrashOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPublished = status === "published";
  const targetStatus: LandingPageStatus = isPublished ? "draft" : "published";

  const handleStatusToggle = async () => {
    setErrorMessage(null);
    setBusy("status");
    try {
      const res = await setLandingStatus({ id, status: targetStatus });
      if (res.ok) {
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to update landing page status.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred while updating status.");
    } finally {
      setBusy(null);
    }
  };

  const handleTrash = async () => {
    setErrorMessage(null);
    setBusy("trash");
    try {
      const res = await trashLandingPage({ id });
      if (res.ok) {
        setConfirmTrashOpen(false);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to delete landing page.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred while deleting landing page.");
    } finally {
      setBusy(null);
    }
  };

  const handleCopyUrl = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/l/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {errorMessage ? (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[220px]" title={errorMessage}>
            {errorMessage}
          </span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="underline text-[10px] ml-1"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-1.5">
        {/* Copy public link */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopyUrl}
          aria-label={`Copy link for ${title}`}
          title={copied ? "Copied!" : "Copy public link"}
          className="size-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
        >
          {copied ? (
            <Check className="size-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </Button>

        {/* View live page if published */}
        {isPublished ? (
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`View live page for ${title}`}
            title="Open live page"
            className="size-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          >
            <Link href={`/l/${slug}` as Route} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}

        {/* Edit button */}
        <Button asChild variant="outline" size="sm" className="h-11 min-h-[44px] px-3.5 gap-1.5 text-xs">
          <Link href={`/admin/landing-pages/${id}/edit` as Route}>
            <Edit className="size-3.5" aria-hidden="true" />
            Edit
          </Link>
        </Button>

        {/* Publish / Unpublish toggle */}
        <Button
          type="button"
          variant={isPublished ? "secondary" : "default"}
          size="sm"
          disabled={busy !== null}
          onClick={handleStatusToggle}
          className="h-11 min-h-[44px] px-3.5 text-xs font-medium"
        >
          {busy === "status" && <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden="true" />}
          {isPublished ? "Unpublish" : "Publish"}
        </Button>

        {/* Trash action */}
        <AlertDialog open={confirmTrashOpen} onOpenChange={setConfirmTrashOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy !== null}
              aria-label={`Trash ${title}`}
              className="size-11 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Trash &ldquo;{title}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                This landing page will be unpublished immediately and removed from public view.
                You can reuse the slug &ldquo;{slug}&rdquo; later; soft-deleted records will not collide.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleTrash}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {busy === "trash" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                Trash page
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
