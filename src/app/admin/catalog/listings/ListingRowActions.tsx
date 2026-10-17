"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Trash2 } from "lucide-react";
import type { ListingStatus } from "@/modules/catalog/validation";
import { setListingStatus, trashListing } from "./actions";
import { Button } from "@/components/ui/button";
import SeoConfigDrawer from "@/components/admin/SeoConfigDrawer";
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

export default function ListingRowActions({
  listingId,
  status,
  title,
  slug = "",
  initialSeo,
}: {
  listingId: string;
  status: ListingStatus;
  title: string;
  slug?: string;
  initialSeo?: { title?: string | null; description?: string | null } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"publish" | "trash" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);

  const isPublished = status === "published";
  const targetStatus: ListingStatus = isPublished ? "draft" : "published";

  const run = async (kind: "publish" | "trash") => {
    setBusy(kind);
    setError(null);
    try {
      const res =
        kind === "publish"
          ? await setListingStatus({ id: listingId, status: targetStatus })
          : await trashListing({ id: listingId });
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
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant={isPublished ? "outline" : "default"}
        size="sm"
        disabled={busy !== null}
        onClick={() => void run("publish")}
        className="h-8 px-3 rounded-md text-xs font-medium"
      >
        {busy === "publish" && <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />}
        {isPublished ? "Unpublish" : "Publish"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={busy !== null}
        aria-label={`Configure SEO for ${title}`}
        title="SEO Configuration"
        onClick={() => setSeoOpen(true)}
        className="size-8 rounded-md"
      >
        <Globe className="size-4" />
      </Button>

      <SeoConfigDrawer
        entityType="listing"
        entityId={listingId}
        entityTitle={title}
        entitySlug={slug}
        initialSeo={initialSeo}
        open={seoOpen}
        onOpenChange={setSeoOpen}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={busy !== null}
            aria-label={`Trash ${title}`}
            className="size-8 rounded-md text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Trash this listing?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              &ldquo;{title}&rdquo; will be hidden everywhere. You can re-create a
              listing with the same slug later — it will get a suffix if the old
              slug is still in the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 px-4 rounded-lg text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy === "trash"}
              onClick={(e) => {
                e.preventDefault();
                void run("trash");
              }}
              className="h-10 px-4 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs"
            >
              {busy === "trash" && <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />}
              Trash listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
