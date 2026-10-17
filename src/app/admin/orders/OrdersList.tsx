"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  PackageOpen,
  RotateCcw,
} from "lucide-react";
import type { OrderListItem } from "@/modules/bookings/service";
import {
  ORDER_STATUSES,
  isLegalOrderTransition,
  type OrderStatus,
} from "@/modules/bookings/validation";
import { updateOrderStatusAction } from "@/modules/bookings/actions";
import { formatMoney } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OrdersListProps = {
  items: OrderListItem[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_TITLES: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "secondary" | "info" | "default" | "warning" | "success" | "destructive"
> = {
  pending: "secondary",
  confirmed: "success",
  completed: "default",
  cancelled: "destructive",
};

export default function OrdersList({
  items,
  total,
  page,
  totalPages,
}: OrdersListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const makePageParams = (delta: number) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextPage = Math.min(totalPages, Math.max(1, page + delta));
    params.set("page", String(nextPage));
    return params.toString();
  };

  const handleStatusChange = (orderId: string, targetStatus: OrderStatus) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await updateOrderStatusAction({ id: orderId, status: targetStatus });
        if (res.ok) {
          router.refresh();
        } else {
          setErrorMessage(res.error || "Failed to update order status.");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while moving order.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="font-semibold underline ml-2 hover:opacity-80 text-xs"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b border-border">
              <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 pl-6">
                Order #
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-3">
                Type
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-3">
                Customer
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-3">
                Listing / Service
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-3">
                Quoted Price
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-3">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-3">
                Date
              </TableHead>
              <TableHead className="w-[70px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <PackageOpen className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">No orders found</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    No orders match your filter criteria. Try adjusting your search query or reset filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/admin/orders" as Route)}
                    className="mt-4 h-9 rounded-lg text-xs gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    Reset Filters
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => {
                const legalTargets = ORDER_STATUSES.filter((target) =>
                  isLegalOrderTransition(order.status, target),
                );

                return (
                  <TableRow
                    key={order.id}
                    className="min-h-[52px] text-sm hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono font-semibold py-3.5 pl-6">
                      <Link
                        href={`/admin/orders/${order.id}` as Route}
                        className="text-foreground hover:text-primary transition-colors inline-block"
                      >
                        {order.orderNo}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      <Badge variant="outline" className="text-[11px] uppercase font-semibold">
                        {order.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      <div className="font-medium text-foreground">{order.customerName}</div>
                      {order.customerPhone ? (
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {order.customerPhone}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-3.5 px-3 max-w-[220px] truncate text-muted-foreground">
                      {order.listingTitle || "General Inquiry"}
                    </TableCell>
                    <TableCell className="py-3.5 px-3 font-semibold font-mono tabular-nums text-foreground">
                      {order.quotedPrice != null
                        ? formatMoney(order.quotedPrice, order.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3.5 px-3">
                      <Badge variant={STATUS_BADGE_VARIANTS[order.status]} className="capitalize text-xs">
                        {STATUS_TITLES[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 px-3 text-muted-foreground tabular-nums text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="py-3.5 pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Order actions"
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/orders/${order.id}` as Route}>
                              <ExternalLink className="mr-2 size-3.5" aria-hidden="true" />
                              View Details
                            </Link>
                          </DropdownMenuItem>

                          {legalTargets.length > 0 ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-xs">
                                  <ArrowRight className="mr-2 size-3.5" aria-hidden="true" />
                                  Move to Status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-40">
                                  {legalTargets.map((target) => (
                                    <DropdownMenuItem
                                      key={target}
                                      onClick={() => handleStatusChange(order.id, target)}
                                      className="capitalize text-xs cursor-pointer"
                                    >
                                      {STATUS_TITLES[target]}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground tabular-nums">{items.length}</span> of{" "}
            <span className="font-semibold text-foreground tabular-nums">{total}</span> orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="h-9 gap-1 text-xs rounded-lg"
            >
              <Link href={`/admin/orders?${makePageParams(-1)}` as Route}>
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Previous
              </Link>
            </Button>
            <span className="text-xs tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="h-9 gap-1 text-xs rounded-lg"
            >
              <Link href={`/admin/orders?${makePageParams(1)}` as Route}>
                Next
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
