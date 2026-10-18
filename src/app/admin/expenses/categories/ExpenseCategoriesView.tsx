"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  FolderTree,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { ExpenseCategory } from "@/modules/expenses/service";
import type { ExpenseKind } from "@/modules/expenses/validation";
import {
  setExpenseCategoryActiveAction,
  softDeleteExpenseCategoryAction,
  upsertExpenseCategoryAction,
} from "@/modules/expenses/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ExpenseCategoriesViewProps = {
  categories: ExpenseCategory[];
};

const CATEGORY_KINDS: { kind: ExpenseKind; label: string; desc: string }[] = [
  { kind: "operational", label: "Operational Cost", desc: "Overhead expenses like rent, salaries, utilities, ads" },
  { kind: "cost_of_sales", label: "Cost of Sales (Direct)", desc: "Direct order fulfillment costs like flights, hotels, visa fees" },
  { kind: "other", label: "Other Expense", desc: "Miscellaneous non-operational outflows" },
];

export default function ExpenseCategoriesView({
  categories: initialCategories,
}: ExpenseCategoriesViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ExpenseKind>("operational");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);

  // Notices
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const openAddDialog = () => {
    setEditingId(null);
    setName("");
    setKind("operational");
    setDescription("");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (c: ExpenseCategory) => {
    setEditingId(c.id);
    setName(c.name);
    setKind(c.kind);
    setDescription(c.description || "");
    setIsActive(c.isActive);
    setDialogOpen(true);
  };

  const handleToggleActive = (id: string, active: boolean) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: active } : c)),
    );

    startTransition(async () => {
      try {
        const res = await setExpenseCategoryActiveAction({ id, isActive: active });
        if (res.ok) {
          setSuccessNotice(`Category ${active ? "activated" : "deactivated"}.`);
          router.refresh();
        } else {
          if (res.code === "IN_USE") {
            setErrorMessage("Cannot deactivate this category because it is currently referenced by expenses.");
          } else {
            setErrorMessage(res.error || "Failed to update category status.");
          }
          router.refresh();
        }
      } catch {
        setErrorMessage("An unexpected error occurred.");
        router.refresh();
      }
    });
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Category name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await upsertExpenseCategoryAction({
          id: editingId || undefined,
          name: name.trim(),
          kind,
          description: description.trim() || undefined,
          isActive,
        });

        if (res.ok) {
          setDialogOpen(false);
          setSuccessNotice(`Category "${name}" saved.`);
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to save category.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while saving category.");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await softDeleteExpenseCategoryAction({ id: deleteTarget.id });
        if (res.ok) {
          setSuccessNotice(`Category "${deleteTarget.name}" deactivated.`);
          setDeleteTarget(null);
          router.refresh();
        } else {
          if (res.code === "IN_USE") {
            setErrorMessage(`Cannot delete category "${deleteTarget.name}" because it is currently in use by recorded expenses.`);
          } else {
            setErrorMessage(res.error || "Failed to delete category.");
          }
          setDeleteTarget(null);
        }
      } catch {
        setErrorMessage("An unexpected error occurred while deleting category.");
        setDeleteTarget(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Expense Classification Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Categories define P&L grouping between operational overheads and direct tour package costs.
          </p>
        </div>
        <Button onClick={openAddDialog} className="h-10 text-sm font-semibold gap-2 rounded-lg bg-primary text-primary-foreground">
          <Plus className="size-4" aria-hidden="true" />
          Add Category
        </Button>
      </div>

      {/* Global Notices */}
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center justify-between rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-semibold underline ml-2 hover:opacity-80 text-sm"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {successNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-xl border border-success/40 bg-success/10 p-3.5 text-sm text-success"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="font-semibold underline ml-2 hover:opacity-80 text-sm"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Categories Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <FolderTree className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No expense categories found</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Define classifications for operational overheads and package fulfillment costs.
            </p>
            <Button
              onClick={openAddDialog}
              className="mt-5 h-10 gap-2 rounded-lg text-sm font-semibold"
            >
              <Plus className="size-4" /> Add Category
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/80">
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5 pl-6">Category Name</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Kind / Type</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Description</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Status</TableHead>
                <TableHead className="w-[120px] text-right text-[13px] font-semibold text-muted-foreground py-3.5 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {categories.map((c) => (
                <TableRow key={c.id} className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3.5 pl-6 font-semibold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <FolderTree className="size-4 text-muted-foreground" aria-hidden="true" />
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant="outline" className="text-xs uppercase font-mono font-medium">
                      {c.kind.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 text-sm text-muted-foreground max-w-sm truncate">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        id={`cat-switch-${c.id}`}
                        checked={c.isActive}
                        onCheckedChange={(checked) => handleToggleActive(c.id, checked)}
                        disabled={isPending}
                      />
                      <Label htmlFor={`cat-switch-${c.id}`} className="text-xs font-medium cursor-pointer">
                        {c.isActive ? "Active" : "Inactive"}
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(c)}
                        className="size-8 text-muted-foreground hover:text-foreground rounded-lg"
                        aria-label="Edit category"
                      >
                        <Edit2 className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(c)}
                        className="size-8 text-muted-foreground hover:text-destructive rounded-lg"
                        aria-label="Delete category"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingId ? "Edit Expense Category" : "Add Expense Category"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Define the financial reporting classification for this expense category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-foreground">Category Name *</Label>
              <Input
                placeholder="e.g. Travel & Tickets or Meta Ads"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm rounded-lg border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-foreground">Category Kind *</Label>
              <Select value={kind} onValueChange={(val) => setKind(val as ExpenseKind)}>
                <SelectTrigger className="h-10 text-sm rounded-lg border-border">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((k) => (
                    <SelectItem key={k.kind} value={k.kind} className="text-sm">
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_KINDS.find((k) => k.kind === kind)?.desc}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-foreground">Description (optional)</Label>
              <Textarea
                placeholder="Types of expenses to file under this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-sm rounded-lg border-border resize-none"
              />
            </div>

            <div className="flex items-center gap-2.5 border-t border-border pt-3">
              <Switch
                id="dialog-cat-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="dialog-cat-active" className="text-sm font-medium cursor-pointer">
                Active (available for new expense submissions)
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-10 rounded-lg text-sm font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  "Save Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Deactivate AlertDialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-destructive">
              Deactivate Category &quot;{deleteTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Categories in use cannot be removed if existing expenses reference them. Deactivating prevents staff from selecting it on new submissions while preserving historical reports.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={isPending} className="h-10 rounded-lg text-sm font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="h-10 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Processing..." : "Deactivate Category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
