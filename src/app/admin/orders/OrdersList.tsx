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
  in_review: "In Review",
  quoted: "Quoted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "secondary" | "info" | "default" | "warning" | "success" | "destructive"
> = {
  pending: "secondary",
  in_review: "info",
  quoted: "info",
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

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px] text-xs font-semibold">Order #</TableHead>
              <TableHead className="text-xs font-semibold">Type</TableHead>
              <TableHead className="text-xs font-semibold">Customer</TableHead>
              <TableHead className="text-xs font-semibold">Listing / Service</TableHead>
              <TableHead className="text-xs font-semibold">Quoted Price</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Date</TableHead>
              <TableHead className="w-[60px] text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                  No orders found matching the filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              items.map((order) => {
                const legalTargets = ORDER_STATUSES.filter((target) =>
                  isLegalOrderTransition(order.status, target),
                );

                return (
                  <TableRow key={order.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="font-mono font-bold">
                      <Link
                        href={`/admin/orders/${order.id}` as Route}
                        className="hover:text-primary transition-colors"
                      >
                        {order.orderNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {order.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{order.customerName}</div>
                      {order.customerPhone ? (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {order.customerPhone}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {order.listingTitle || "General Inquiry"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {order.quotedPrice != null
                        ? formatMoney(order.quotedPrice, order.currency)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANTS[order.status]} className="capitalize">
                        {STATUS_TITLES[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Order actions"
                            className="size-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="size-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
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
                                      className="capitalize text-xs"
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
            Showing <span className="font-semibold text-foreground">{items.length}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/admin/orders?${makePageParams(-1)}` as Route}>
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Previous
              </Link>
            </Button>
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="h-8 gap-1 text-xs"
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
