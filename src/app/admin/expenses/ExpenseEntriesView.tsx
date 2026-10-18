"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  Receipt,
  Search,
  XCircle,
} from "lucide-react";
import type { ExpenseCategory, ExpenseEntry } from "@/modules/expenses/service";
import type { ExpenseStatus } from "@/modules/expenses/validation";
import { todayIso } from "@/modules/expenses/validation";
import {
  approveExpenseAction,
  rejectExpenseAction,
  submitExpenseAction,
} from "@/modules/expenses/actions";
import { formatMoney } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type ExpenseEntriesViewProps = {
  items: ExpenseEntry[];
  total: number;
  page: number;
  totalPages: number;
  categories: ExpenseCategory[];
  canApprove: boolean;
  initialFilters: {
    status: string;
    categoryId: string;
    from: string;
    to: string;
    search: string;
  };
};

export default function ExpenseEntriesView({
  items,
  total,
  page,
  totalPages,
  categories,
  canApprove,
  initialFilters,
}: ExpenseEntriesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [statusFilter, setStatusFilter] = useState(initialFilters.status);
  const [categoryFilter, setCategoryFilter] = useState(initialFilters.categoryId);
  const [fromDate, setFromDate] = useState(initialFilters.from);
  const [toDate, setToDate] = useState(initialFilters.to);
  const [search, setSearch] = useState(initialFilters.search);

  // Submit modal state
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState(categories[0]?.id || "");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(todayIso());
  const [formDescription, setFormDescription] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");
  const [formOrderId, setFormOrderId] = useState("");

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<ExpenseEntry | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Notices
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const applyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter && categoryFilter !== "all") params.set("categoryId", categoryFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (search.trim()) params.set("search", search.trim());
    const qs = params.toString();
    router.push((qs ? `${pathname}?${qs}` : pathname) as Route);
  };

  const makePageParams = (delta: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(Math.min(totalPages, Math.max(1, page + delta))));
    return params.toString();
  };

  // Submit expense entry
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = Number(formAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage("Enter a valid expense amount.");
      return;
    }
    if (!formDescription.trim()) {
      setErrorMessage("Description is required.");
      return;
    }
    if (!formDate || formDate > todayIso()) {
      setErrorMessage("Date cannot be in the future.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          categoryId: formCategoryId,
          amount,
          date: formDate,
          description: formDescription.trim(),
          vendor: formVendor.trim() || undefined,
          receiptUrl: formReceiptUrl.trim() || undefined,
          orderId: formOrderId.trim() || undefined,
        };

        const res = await submitExpenseAction(payload);
        if (res.ok) {
          setSubmitDialogOpen(false);
          setFormAmount("");
          setFormDescription("");
          setFormVendor("");
          setFormReceiptUrl("");
          setFormOrderId("");
          setSuccessNotice("Expense entry submitted and pending approval.");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to submit expense.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while submitting expense.");
      }
    });
  };

  // Approve expense
  const handleApprove = (id: string) => {
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await approveExpenseAction({ id });
        if (res.ok) {
          setSuccessNotice("Expense approved and added to financial P&L records.");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to approve expense.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while approving expense.");
      }
    });
  };

  // Reject expense
  const handleReject = () => {
    if (!rejectTarget) return;
    setErrorMessage(null);
    setSuccessNotice(null);

    startTransition(async () => {
      try {
        const res = await rejectExpenseAction({
          id: rejectTarget.id,
          note: rejectNote.trim() || undefined,
        });
        if (res.ok) {
          setSuccessNotice("Expense rejected.");
          setRejectTarget(null);
          setRejectNote("");
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to reject expense.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while rejecting expense.");
      }
    });
  };

  const getStatusBadgeVariant = (status: ExpenseStatus) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "pending":
      default:
        return "warning";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar with Record Expense Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Operational & Direct Costs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff expense logs awaiting approval and realized financial outflows.
          </p>
        </div>
        <Button
          onClick={() => setSubmitDialogOpen(true)}
          className="h-10 text-sm font-semibold gap-2 rounded-lg bg-primary text-primary-foreground"
        >
          <Plus className="size-4" aria-hidden="true" />
          Record Expense
        </Button>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="w-full sm:w-48">
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-sm rounded-lg border-border">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">All statuses</SelectItem>
              <SelectItem value="pending" className="text-sm">Pending Review</SelectItem>
              <SelectItem value="approved" className="text-sm">Approved</SelectItem>
              <SelectItem value="rejected" className="text-sm">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 text-sm rounded-lg border-border">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-sm">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-40">
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 text-sm font-mono tabular-nums rounded-lg border-border"
          />
        </div>

        <div className="w-full sm:w-40">
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">To Date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 text-sm font-mono tabular-nums rounded-lg border-border"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <Label className="text-[13px] font-medium text-foreground mb-1.5 block">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Vendor or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm rounded-lg border-border"
            />
          </div>
        </div>

        <Button type="submit" variant="secondary" className="h-10 text-sm font-semibold rounded-lg gap-1.5 px-4">
          <Filter className="size-4" aria-hidden="true" />
          Filter
        </Button>
      </form>

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

      {/* Entries Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No expense entries found</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {search || statusFilter !== "all" || categoryFilter !== "all" || fromDate || toDate
                ? "No expense records match the applied filters. Try adjusting your search criteria."
                : "No operational or direct expenses recorded yet. Submit your first expense entry."}
            </p>
            {search || statusFilter !== "all" || categoryFilter !== "all" || fromDate || toDate ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setFromDate("");
                  setToDate("");
                  setSearch("");
                  router.push(pathname as Route);
                }}
                className="mt-5 h-9 rounded-lg text-sm font-semibold"
              >
                Reset Filters
              </Button>
            ) : (
              <Button
                onClick={() => setSubmitDialogOpen(true)}
                className="mt-5 h-10 gap-2 rounded-lg text-sm font-semibold"
              >
                <Plus className="size-4" /> Record Expense
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/80">
                <TableHead className="w-[110px] text-[13px] font-semibold text-muted-foreground py-3.5 pl-6">Date</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Category</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Description & Vendor</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Amount</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Linked Order</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Submitted By</TableHead>
                <TableHead className="text-[13px] font-semibold text-muted-foreground py-3.5">Status</TableHead>
                {canApprove ? (
                  <TableHead className="w-[160px] text-right text-[13px] font-semibold text-muted-foreground py-3.5 pr-6">Actions</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {items.map((entry) => (
                <TableRow key={entry.id} className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3.5 pl-6 font-mono text-sm tabular-nums text-muted-foreground">
                    {entry.date}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="font-semibold text-foreground">{entry.categoryName}</div>
                    <Badge variant="outline" className="text-xs uppercase font-mono mt-1">
                      {entry.categoryKind.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="text-foreground font-medium">{entry.description}</div>
                    {entry.vendor ? (
                      <div className="text-xs text-muted-foreground mt-0.5">Vendor: {entry.vendor}</div>
                    ) : null}
                    {entry.receiptUrl ? (
                      <a
                        href={entry.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" />
                        Receipt Document
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-3.5 font-mono font-semibold tabular-nums text-foreground">
                    {formatMoney(entry.amount, entry.currency)}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {entry.orderId ? (
                      <Link
                        href={`/admin/orders/${entry.orderId}` as Route}
                        className="font-mono font-semibold tabular-nums text-primary hover:underline"
                      >
                        {entry.orderNo || "Order"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 text-muted-foreground text-sm">
                    {entry.createdByName || "Staff"}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={getStatusBadgeVariant(entry.status)} className="capitalize text-xs font-medium">
                      {entry.status}
                    </Badge>
                  </TableCell>
                  {canApprove ? (
                    <TableCell className="py-3.5 pr-6 text-right">
                      {entry.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(entry.id)}
                            disabled={isPending}
                            className="h-8 px-2.5 text-xs font-semibold text-success border-success/30 hover:bg-success/10 hover:text-success rounded-lg"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectTarget(entry);
                              setRejectNote("");
                            }}
                            disabled={isPending}
                            className="h-8 px-2.5 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs font-medium">
                          {entry.status === "approved" ? "Approved" : "Rejected"}
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <div>
            Showing <span className="font-semibold tabular-nums text-foreground">{items.length}</span> of{" "}
            <span className="font-semibold tabular-nums text-foreground">{total}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="h-9 gap-1 text-sm rounded-lg font-medium"
            >
              <Link href={`/admin/expenses?${makePageParams(-1)}` as Route}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </Link>
            </Button>
            <span className="text-sm tabular-nums font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/admin/expenses?${makePageParams(1)}` as Route}>
                Next
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Record Expense Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Record New Expense</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Submit an operational or order-linked cost for financial approval.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitExpense} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-category" className="text-[13px] font-medium text-foreground">Expense Category *</Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger id="expense-category" className="h-10 text-sm rounded-lg border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">
                      {c.name} ({c.kind.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expense-amount" className="text-[13px] font-medium text-foreground">Amount (BDT) *</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="h-10 text-sm font-mono tabular-nums rounded-lg border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-date" className="text-[13px] font-medium text-foreground">Business Date *</Label>
                <Input
                  id="expense-date"
                  type="date"
                  max={todayIso()}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-10 text-sm font-mono tabular-nums rounded-lg border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-description" className="text-[13px] font-medium text-foreground">Description *</Label>
              <Input
                id="expense-description"
                placeholder="What was purchased or paid for..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="h-10 text-sm rounded-lg border-border"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expense-vendor" className="text-[13px] font-medium text-foreground">Vendor / Payee (optional)</Label>
                <Input
                  id="expense-vendor"
                  placeholder="Airline, Hotel, Supplier..."
                  value={formVendor}
                  onChange={(e) => setFormVendor(e.target.value)}
                  className="h-10 text-sm rounded-lg border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-order-id" className="text-[13px] font-medium text-foreground">Linked Order ID (optional)</Label>
                <Input
                  id="expense-order-id"
                  placeholder="Order UUID if direct cost"
                  value={formOrderId}
                  onChange={(e) => setFormOrderId(e.target.value)}
                  className="h-10 text-sm font-mono rounded-lg border-border"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-receipt-url" className="text-[13px] font-medium text-foreground">Receipt Document URL (optional)</Label>
              <Input
                id="expense-receipt-url"
                placeholder="https://..."
                value={formReceiptUrl}
                onChange={(e) => setFormReceiptUrl(e.target.value)}
                className="h-10 text-sm rounded-lg border-border"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitDialogOpen(false)}
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
                    Submitting...
                  </>
                ) : (
                  "Submit Expense"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject AlertDialog */}
      <AlertDialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
              <XCircle className="size-4" aria-hidden="true" />
              Reject Expense Entry
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to reject this expense of {rejectTarget ? formatMoney(rejectTarget.amount, rejectTarget.currency) : ""}? It will not count towards company P&L reports.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="expense-reject-note" className="text-[13px] font-medium text-foreground">
              Internal Note (optional)
            </Label>
            <Textarea
              id="expense-reject-note"
              placeholder="Reason for rejection..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
              className="text-sm rounded-lg border-border resize-none"
            />
          </div>

          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={isPending} className="h-10 rounded-lg text-sm font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending}
              className="h-10 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Rejecting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
