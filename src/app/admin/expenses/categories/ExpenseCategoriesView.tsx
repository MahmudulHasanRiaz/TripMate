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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Expense Classification Categories</h2>
          <p className="text-xs text-muted-foreground">
            Categories define P&L grouping between operational overheads and direct tour package costs.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground">
          <Plus className="size-3.5" aria-hidden="true" />
          Add Category
        </Button>
      </div>

      {/* Global Notices */}
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {successNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 p-3 text-xs text-success"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="font-semibold underline ml-2 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Categories Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold">Category Name</TableHead>
              <TableHead className="text-xs font-semibold">Kind / Type</TableHead>
              <TableHead className="text-xs font-semibold">Description</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="w-[120px] text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                  No expense categories found. Click &quot;Add Category&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id} className="text-xs hover:bg-muted/30">
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <FolderTree className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {c.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {c.kind.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-sm truncate">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`cat-switch-${c.id}`}
                        checked={c.isActive}
                        onCheckedChange={(checked) => handleToggleActive(c.id, checked)}
                        disabled={isPending}
                      />
                      <Label htmlFor={`cat-switch-${c.id}`} className="text-[11px] cursor-pointer">
                        {c.isActive ? "Active" : "Inactive"}
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(c)}
                        className="size-8 text-muted-foreground hover:text-foreground"
                        aria-label="Edit category"
                      >
                        <Edit2 className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(c)}
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete category"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingId ? "Edit Expense Category" : "Add Expense Category"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the financial reporting classification for this expense category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category Name *</Label>
              <Input
                placeholder="e.g. Travel & Tickets or Meta Ads"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category Kind *</Label>
              <Select value={kind} onValueChange={(val) => setKind(val as ExpenseKind)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KINDS.map((k) => (
                    <SelectItem key={k.kind} value={k.kind} className="text-xs">
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {CATEGORY_KINDS.find((k) => k.kind === kind)?.desc}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (optional)</Label>
              <Textarea
                placeholder="Types of expenses to file under this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Switch
                id="dialog-cat-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="dialog-cat-active" className="text-xs font-medium cursor-pointer">
                Active (available for new expense submissions)
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden="true" />
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
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Categories in use cannot be removed if existing expenses reference them. Deactivating prevents staff from selecting it on new submissions while preserving historical reports.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} className="h-9 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Processing..." : "Deactivate Category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
