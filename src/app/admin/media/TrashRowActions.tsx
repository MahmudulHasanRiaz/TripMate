"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { deleteFilePermanently, restoreFile } from "@/modules/media/actions";
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
 * Per-file trash actions (FU-13): Restore returns the file to the library
 * (its stored object was kept), Delete permanently removes the object and
 * the row after a confirm. Before FU-13 the trash rows were inert — the
 * only operation was emptying the whole trash at once.
 */
export default function TrashRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const relay = (res: { ok: boolean; error?: string }, fallback: string) =>
    res.error === "UNAUTHORIZED" ? "You don't have permission." : (res.error ?? fallback);

  const restore = async () => {
    setBusy("restore");
    setError(null);
    try {
      const res = await restoreFile({ id });
      if (!res.ok) {
        setError(relay(res, "Could not restore the file."));
        return;
      }
      toast({ title: "File restored", description: `"${name}" is back in the library.` });
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(null);
    }
  };

  const purge = async () => {
    setBusy("delete");
    setError(null);
    try {
      const res = await deleteFilePermanently({ id });
      if (!res.ok) {
        setError(relay(res, "Could not delete the file."));
        return;
      }
      toast({ title: "File deleted permanently", description: `"${name}" was removed from storage.` });
      router.refresh();
    } catch {
      setError("Something went wrong on the server.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 rounded-lg text-sm font-medium"
        disabled={busy !== null}
        onClick={() => void restore()}
      >
        {busy === "restore" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        )}
        Restore
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-lg text-sm font-medium text-destructive hover:text-destructive"
            disabled={busy !== null}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Delete this file permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              &ldquo;{name}&rdquo; will be removed from storage for good — this
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={busy !== null} className="h-10 rounded-lg text-sm font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy !== null}
              onClick={(e) => {
                e.preventDefault();
                void purge();
              }}
              className="h-10 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy === "delete" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && busy === null ? (
        <span role="alert" className="text-xs font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
