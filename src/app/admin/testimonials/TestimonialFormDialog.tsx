"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Eye,
  Loader2,
  Plus,
  Star,
  Trash2,
  Video,
  Youtube,
} from "lucide-react";
import {
  createTestimonialAction,
  updateTestimonialAction,
} from "@/modules/content/testimonials-actions";
import type { TestimonialWithPackage } from "@/modules/content/testimonials-service";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from "@/modules/content/testimonials-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PackagePickerField from "@/components/admin/PackagePickerField";
import MediaPickerField from "@/components/admin/MediaPickerField";
import { cn } from "@/lib/utils";

type TestimonialFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testimonial?: TestimonialWithPackage | null;
  onSuccess?: () => void;
};

function TestimonialFormContent({
  testimonial,
  onClose,
  onSuccess,
}: {
  testimonial?: TestimonialWithPackage | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(testimonial?.name ?? "");
  const [tripLabel, setTripLabel] = useState(testimonial?.tripLabel ?? "");
  const [packageId, setPackageId] = useState<string | null>(testimonial?.packageId ?? null);
  const [packageName, setPackageName] = useState<string | null>(testimonial?.packageName ?? null);
  const [quote, setQuote] = useState(testimonial?.quote ?? "");
  const [rating, setRating] = useState(testimonial?.rating ?? 5);
  const [photoUrl, setPhotoUrl] = useState(testimonial?.photoUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(testimonial?.videoUrl ?? "");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    Array.isArray(testimonial?.galleryUrls) ? (testimonial?.galleryUrls as string[]) : [],
  );
  const [featured, setFeatured] = useState(testimonial?.featured ?? false);
  const [isPublished, setIsPublished] = useState(testimonial?.isPublished ?? true);
  const [sortOrder, setSortOrder] = useState(testimonial?.sortOrder ?? 0);

  const youtubeVideoId = extractYouTubeVideoId(videoUrl);
  const youtubeThumbnail = getYouTubeThumbnailUrl(videoUrl);

  const handleAddGalleryUrl = () => {
    setGalleryUrls((prev) => [...prev, ""]);
  };

  const handleUpdateGalleryUrl = (index: number, url: string) => {
    setGalleryUrls((prev) => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
  };

  const handleRemoveGalleryUrl = (index: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!quote.trim()) {
      setError("Testimonial quote is required.");
      return;
    }

    const cleanGallery = galleryUrls.map((u) => u.trim()).filter(Boolean);

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        tripLabel: tripLabel.trim() || undefined,
        packageId: packageId || null,
        quote: quote.trim(),
        rating,
        photoUrl: photoUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        galleryUrls: cleanGallery,
        featured,
        isPublished,
        sortOrder: Number(sortOrder) || 0,
      };

      const res = testimonial
        ? await updateTestimonialAction(testimonial.id, payload)
        : await createTestimonialAction(payload);

      if (res.ok) {
        onSuccess?.();
        onClose();
      } else {
        setError(res.error || "Failed to save testimonial");
      }
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {testimonial ? "Edit Testimonial" : "Add Traveler Story"}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Publish authentic reviews, pilgrim experiences, and photo/video memories from trips.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Name and Trip Label */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="author-name" className="text-xs font-medium">
              Traveler / Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="author-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Haji Mohammad Ali"
              className="h-10 text-xs rounded-lg"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trip-label" className="text-xs font-medium">
              Trip Label / Year
            </Label>
            <Input
              id="trip-label"
              value={tripLabel}
              onChange={(e) => setTripLabel(e.target.value)}
              placeholder="e.g. VIP Umrah Ramadan 2026"
              className="h-10 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Linked Catalog Package */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Link to Package from Catalog (Optional)
          </Label>
          <PackagePickerField
            value={packageId}
            onChange={(pkgId, pkg) => {
              setPackageId(pkgId);
              if (pkg) {
                setPackageName(pkg.title);
                if (!tripLabel) {
                  setTripLabel(pkg.title);
                }
              }
            }}
            selectedTitle={packageName ?? undefined}
            placeholder="Search package title from catalog..."
          />
          <p className="text-[11px] text-muted-foreground">
            Linking a package shows the trip badge and ties this review to the package page.
          </p>
        </div>

        {/* Star Rating Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Star Rating (1 to 5)</Label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={`${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "size-6 transition-colors",
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30 hover:text-amber-200",
                  )}
                />
              </button>
            ))}
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {rating} of 5 stars
            </span>
          </div>
        </div>

        {/* Quote */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="testimonial-quote" className="text-xs font-medium">
              Review Quote / Story <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {quote.length} / 2000 chars
            </span>
          </div>
          <Textarea
            id="testimonial-quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Share the customer's exact words about their travel experience, accommodations, team support..."
            className="text-xs min-h-[96px] leading-relaxed rounded-lg"
            required
          />
        </div>

        {/* Traveler Photo URL / Media Picker */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Traveler Photo (Portrait)</Label>
          <MediaPickerField
            value={photoUrl}
            onChange={(url) => setPhotoUrl(url)}
            placeholder="https://... or choose from media library"
          />
        </div>

        {/* YouTube Video URL with preview */}
        <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3.5">
          <div className="space-y-1">
            <Label htmlFor="video-url" className="text-xs font-medium flex items-center gap-1.5">
              <Youtube className="size-4 text-rose-500" />
              <span>YouTube Video Review Link (Optional)</span>
            </Label>
            <Input
              id="video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              className="h-10 text-xs font-mono rounded-lg"
            />
          </div>

          {videoUrl.trim() && (
            <div className="pt-2">
              {youtubeVideoId && youtubeThumbnail ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-black">
                    <Image
                      src={youtubeThumbnail}
                      alt="YouTube Preview"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="size-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Eye className="size-3.5 text-muted-foreground" />
                      Valid YouTube Video ID: {youtubeVideoId}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Will display as a playable video story on your marketing site.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Please provide a standard YouTube URL (youtube.com/watch?v=... or youtu.be/...).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Gallery Photos */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Trip Gallery Photos (Optional)</Label>
              <p className="text-[11px] text-muted-foreground">
                Add photos taken by this traveler during their trip.
              </p>
            </div>
            {galleryUrls.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddGalleryUrl}
                className="h-7 text-[11px] gap-1"
              >
                <Plus className="size-3" /> Add Photo
              </Button>
            )}
          </div>

          {galleryUrls.length > 0 && (
            <div className="space-y-2">
              {galleryUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <MediaPickerField
                      value={url}
                      onChange={(newUrl) => handleUpdateGalleryUrl(idx, newUrl)}
                      placeholder={`Gallery photo #${idx + 1}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveGalleryUrl(idx)}
                    className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toggles: Featured, Published & Sort Order */}
        <div className="grid gap-4 sm:grid-cols-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium cursor-pointer">Published</Label>
              <p className="text-[10px] text-muted-foreground">Visible on site</p>
            </div>
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
              aria-label="Toggle published"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium cursor-pointer">Featured</Label>
              <p className="text-[10px] text-muted-foreground">Priority display</p>
            </div>
            <Switch
              checked={featured}
              onCheckedChange={setFeatured}
              aria-label="Toggle featured"
            />
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <Label htmlFor="sort-order" className="text-xs font-medium">
              Sort Order
            </Label>
            <Input
              id="sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              className="h-8 text-xs font-mono tabular-nums rounded"
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/60 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-10 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="h-10 text-xs font-semibold px-5"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : testimonial ? (
              "Update Testimonial"
            ) : (
              "Publish Testimonial"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function TestimonialFormDialog({
  open,
  onOpenChange,
  testimonial,
  onSuccess,
}: TestimonialFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <TestimonialFormContent
          key={testimonial?.id ?? "new"}
          testimonial={testimonial}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  );
}
