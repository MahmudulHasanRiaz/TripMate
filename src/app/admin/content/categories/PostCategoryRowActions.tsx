"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { removePostCategory } from "./actions";
import type { PostCategoryRow } from "./types";
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
 * Per-category row actions. Categories are HARD-deleted (no soft-delete/active
 * column), so the confirm copy says "permanently deleted". The service refuses
 * (IN_USE) while live posts still reference one — the refusal text is surfaced
 * inside the dialog so the editor knows why the delete failed.
 */
export default function PostCategoryRowActions({
  row,
  onEdit,
}: {
  row: PostCategoryRow;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await removePostCategory({ id: row.id });
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${row.name}`}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete ${row.name}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{row.name}&rdquo; will be <span className="font-medium">permanently
              deleted</span> — this cannot be undone. If live posts still use it,
              the server refuses and the reason appears here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void run();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
