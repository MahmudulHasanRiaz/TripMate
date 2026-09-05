"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { ContentStatus } from "@/modules/content/validation";
import { togglePublish, trashPost } from "./actions";
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

/**
 * Per-row post actions. Publish/Unpublish flips the row straight from the
 * table; Trash asks for confirmation first (soft delete — recoverable only by
 * re-creating under a suffixed slug). Both call a server action and then
 * router.refresh() so the freshly-revalidated list re-renders server-side.
 */
export default function PostRowActions({
  postId,
  status,
  title,
}: {
  postId: string;
  status: ContentStatus;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"publish" | "trash" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPublished = status === "published";
  const targetStatus: ContentStatus = isPublished ? "draft" : "published";

  const run = async (kind: "publish" | "trash") => {
    setBusy(kind);
    setError(null);
    try {
      const res =
        kind === "publish"
          ? await togglePublish({ id: postId, status: targetStatus })
          : await trashPost({ id: postId });
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      if (kind === "trash") setConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant={isPublished ? "outline" : "default"}
        size="sm"
        disabled={busy !== null}
        onClick={() => void run("publish")}
      >
        {busy === "publish" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isPublished ? "Unpublish" : "Publish"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={busy !== null}
            aria-label={`Trash ${title}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trash this post?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{title}&rdquo; will be hidden everywhere. You can re-create a
              post with the same slug later — it will get a suffix if the old
              slug is still in the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy === "trash"}
              onClick={(e) => {
                e.preventDefault();
                void run("trash");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy === "trash" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Trash post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
