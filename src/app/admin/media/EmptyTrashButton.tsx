"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { emptyTrashAction } from "@/modules/media/actions";
import { useToast } from "@/hooks/use-toast";
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
 * "Empty trash" (admin media page, trash view): AlertDialog confirm →
 * emptyTrashAction → toast with the freed count. Files whose stored object
 * could not be deleted (driver failure) are kept in the trash — the toast
 * says so instead of silently dropping them.
 */
export default function EmptyTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emptyTrash = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await emptyTrashAction({});
      if (!res.ok) {
        setError(
          res.error === "UNAUTHORIZED"
            ? "You don't have permission."
            : (res.error ?? "Could not empty the trash."),
        );
        return;
      }
      const { deleted, failed } = res.data;
      toast({
        title: "Trash emptied",
        description:
          failed > 0
            ? `Freed ${deleted} ${deleted === 1 ? "file" : "files"} — ${failed} could not be deleted and stay in the trash.`
            : `Freed ${deleted} ${deleted === 1 ? "file" : "files"}.`,
      });
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {/* Hit-slop wrapper: 36px visual button, 48px pointer target. */}
        <span className="inline-flex -m-1.5 p-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-destructive hover:text-destructive"
            disabled={count === 0 || busy}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Empty trash
          </Button>
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Permanently delete {count} {count === 1 ? "file" : "files"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Every trashed file is removed from storage for good — this cannot be
            undone. Files that fail to delete stay in the trash.
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
              void emptyTrash();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
