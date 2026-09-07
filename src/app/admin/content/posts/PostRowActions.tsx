"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Trash2 } from "lucide-react";
import type { ContentStatus } from "@/modules/content/validation";
import { togglePublish, trashPost } from "./actions";
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

export default function PostRowActions({
  postId,
  status,
  title,
  slug = "",
  initialSeo,
}: {
  postId: string;
  status: ContentStatus;
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
    <div>
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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={busy !== null}
          aria-label={`Configure SEO for ${title}`}
          title="SEO Configuration"
          onClick={() => setSeoOpen(true)}
        >
          <Globe className="size-4" />
        </Button>

        <SeoConfigDrawer
          entityType="post"
          entityId={postId}
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
      {error && !confirmOpen ? (
        <p role="alert" className="mt-1 text-right text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
