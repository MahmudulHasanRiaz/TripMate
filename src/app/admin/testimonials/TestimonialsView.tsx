"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  Edit,
  Filter,
  Image as ImageIcon,
  Loader2,
  MessageSquareQuote,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type { TestimonialWithPackage } from "@/modules/content/testimonials-service";
import {
  deleteTestimonialAction,
  toggleTestimonialFeaturedAction,
  toggleTestimonialPublishedAction,
} from "@/modules/content/testimonials-actions";
import TestimonialFormDialog from "./TestimonialFormDialog";
import SectionHeader from "@/components/admin/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "published" | "unpublished" | "featured";

interface TestimonialsViewProps {
  items: TestimonialWithPackage[];
  total: number;
  initialSearch?: string;
  initialFilter?: FilterTab;
}

export default function TestimonialsView({
  items,
  total,
  initialSearch = "",
  initialFilter = "all",
}: TestimonialsViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<FilterTab>(initialFilter);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TestimonialWithPackage | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<TestimonialWithPackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Quick action pending ID tracker
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Client-side filtering
  const filteredItems = items.filter((item) => {
    // Filter status
    if (filter === "published" && !item.isPublished) return false;
    if (filter === "unpublished" && item.isPublished) return false;
    if (filter === "featured" && !item.featured) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchTrip = item.tripLabel?.toLowerCase().includes(q) ?? false;
      const matchPackage = item.packageName?.toLowerCase().includes(q) ?? false;
      const matchQuote = item.quote.toLowerCase().includes(q);
      if (!matchName && !matchTrip && !matchPackage && !matchQuote) return false;
    }

    return true;
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: TestimonialWithPackage) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleTogglePublished = async (item: TestimonialWithPackage) => {
    setTogglingId(item.id);
    const res = await toggleTestimonialPublishedAction(item.id, !item.isPublished);
    setTogglingId(null);
    if (res.ok) {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleToggleFeatured = async (item: TestimonialWithPackage) => {
    setTogglingId(item.id);
    const res = await toggleTestimonialFeaturedAction(item.id, !item.featured);
    setTogglingId(null);
    if (res.ok) {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteTestimonialAction(deleteTarget.id);
    setIsDeleting(false);
    if (res.ok) {
      setDeleteTarget(null);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setDeleteError(res.error || "Failed to delete testimonial");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <SectionHeader
            title="Testimonials"
            description="Manage and publish traveler reviews, trip stories, and video experiences across the site."
            icon={MessageSquareQuote}
            accent="var(--c-pink)"
          />
          <Badge variant="outline" className="mt-1 tabular-nums font-medium text-xs">
            {total} total
          </Badge>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-10 gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
        >
          <Plus className="size-4" />
          Add Testimonial
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, trip, or keyword..."
            className="h-10 pl-9 pr-9 text-sm rounded-lg border-border"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/40">
          {(
            [
              { id: "all", label: "All" },
              { id: "published", label: "Published" },
              { id: "unpublished", label: "Drafts" },
              { id: "featured", label: "Featured" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filter === tab.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card / Content */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            {search || filter !== "all" ? (
              <Filter className="size-6" />
            ) : (
              <MessageSquareQuote className="size-6" />
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {search || filter !== "all" ? "No matching testimonials" : "No testimonials yet"}
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
            {search || filter !== "all"
              ? "We couldn't find any testimonials matching your filters. Try resetting or adjusting your search."
              : "Start collecting and showcasing genuine reviews and experiences from your travelers."}
          </p>
          <div className="mt-6">
            {search || filter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="h-9 rounded-lg"
              >
                Clear Filters
              </Button>
            ) : (
              <Button onClick={handleOpenCreate} className="h-10 rounded-lg gap-2">
                <Plus className="size-4" />
                Add First Testimonial
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">
                    Traveler
                  </th>
                  <th scope="col" className="py-3.5 px-3">
                    Trip / Package
                  </th>
                  <th scope="col" className="py-3.5 px-3">
                    Rating
                  </th>
                  <th scope="col" className="py-3.5 px-3 max-w-xs">
                    Review Quote
                  </th>
                  <th scope="col" className="py-3.5 px-3">
                    Status
                  </th>
                  <th scope="col" className="py-3.5 px-3 text-center">
                    Featured
                  </th>
                  <th scope="col" className="py-3.5 px-3 text-center tabular-nums">
                    Sort
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isCurrentToggling = togglingId === item.id;
                  const galleryCount = Array.isArray(item.galleryUrls)
                    ? item.galleryUrls.length
                    : 0;

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-muted/30 min-h-[56px]"
                    >
                      {/* Traveler info + photo */}
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center font-medium text-xs text-muted-foreground">
                            {item.photoUrl ? (
                              <Image
                                src={item.photoUrl}
                                alt={item.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <span>
                                {item.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{item.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.videoUrl && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                                  <Video className="size-3" /> Video
                                </span>
                              )}
                              {galleryCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-500">
                                  <ImageIcon className="size-3" /> {galleryCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trip / Package */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          {item.tripLabel ? (
                            <div className="font-medium text-foreground text-xs">
                              {item.tripLabel}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">—</span>
                          )}
                          {item.packageName && (
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-normal truncate max-w-[180px] inline-block"
                              title={item.packageName}
                            >
                              {item.packageName}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-0.5" title={`${item.rating} of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "size-3.5",
                                star <= item.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30",
                              )}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Quote snippet */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                          &ldquo;{item.quote}&rdquo;
                        </p>
                      </td>

                      {/* Published Toggle */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.isPublished}
                            disabled={isCurrentToggling}
                            onCheckedChange={() => handleTogglePublished(item)}
                            aria-label={`Toggle published for ${item.name}`}
                          />
                          <span
                            className={cn(
                              "text-xs font-medium",
                              item.isPublished ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                            )}
                          >
                            {item.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                      </td>

                      {/* Featured button */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(item)}
                          disabled={isCurrentToggling}
                          className={cn(
                            "inline-flex items-center justify-center size-8 rounded-lg transition-colors",
                            item.featured
                              ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                              : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted",
                          )}
                          title={item.featured ? "Featured testimonial" : "Mark as featured"}
                        >
                          <Sparkles
                            className={cn(
                              "size-4",
                              item.featured && "fill-amber-400 text-amber-400",
                            )}
                          />
                        </button>
                      </td>

                      {/* Sort order */}
                      <td className="py-3.5 px-3 text-center font-mono text-xs tabular-nums text-muted-foreground">
                        {item.sortOrder}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Edit testimonial"
                          >
                            <Edit className="size-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(item)}
                                className="cursor-pointer"
                              >
                                <Edit className="size-4 mr-2" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleFeatured(item)}
                                className="cursor-pointer"
                              >
                                <Sparkles className="size-4 mr-2" />
                                {item.featured ? "Unmark Featured" : "Mark Featured"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleTogglePublished(item)}
                                className="cursor-pointer"
                              >
                                <Check className="size-4 mr-2" />
                                {item.isPublished ? "Unpublish" : "Publish"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(item)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Dialog for Create / Edit */}
      <TestimonialFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testimonial={editingItem}
        onSuccess={() => {
          setDialogOpen(false);
          startTransition(() => {
            router.refresh();
          });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Testimonial</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the testimonial from &ldquo;{deleteTarget?.name}&rdquo;?
              This action cannot be undone and it will be removed from your public website.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              {deleteError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="h-10 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="h-10 rounded-lg gap-2"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete Testimonial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
