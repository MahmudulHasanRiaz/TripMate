"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  ExternalLink,
  MoreVertical,
  Phone,
  MessageCircle,
} from "lucide-react";
import type { OrderListItem } from "@/modules/bookings/service";
import {
  ORDER_STATUSES,
  isLegalOrderTransition,
  type OrderStatus,
} from "@/modules/bookings/validation";
import { updateOrderStatusAction } from "@/modules/bookings/actions";
import { formatMoney, telLink, whatsappLink } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type OrdersBoardProps = {
  initialItems: OrderListItem[];
  counts: Record<OrderStatus, number>;
};

const STATUS_TITLES: Record<OrderStatus, string> = {
  pending: "Pending Inquiries",
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

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - new Date(date).getTime());
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function OrdersBoard({ initialItems, counts }: OrdersBoardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<OrderListItem[]>(initialItems);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Group items by status
  const itemsByStatus: Record<OrderStatus, OrderListItem[]> = {
    pending: [],
    in_review: [],
    quoted: [],
    confirmed: [],
    completed: [],
    cancelled: [],
  };

  for (const item of items) {
    if (itemsByStatus[item.status]) {
      itemsByStatus[item.status].push(item);
    }
  }

  const handleStatusChange = (orderId: string, targetStatus: OrderStatus) => {
    setErrorMessage(null);
    const order = items.find((o) => o.id === orderId);
    if (!order) return;

    if (!isLegalOrderTransition(order.status, targetStatus)) {
      setErrorMessage(`Cannot move order from "${order.status}" to "${targetStatus}"`);
      return;
    }

    let snapshot: OrderListItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.map((item) =>
        item.id === orderId ? { ...item, status: targetStatus } : item,
      );
    });

    startTransition(async () => {
      try {
        const res = await updateOrderStatusAction({ id: orderId, status: targetStatus });
        if (res.ok) {
          router.refresh();
        } else {
          setItems(snapshot);
          setErrorMessage(res.error || "Failed to update order status.");
        }
      } catch {
        setItems(snapshot);
        setErrorMessage("An unexpected error occurred while moving order.");
      }
    });
  };

  const onDragStart = (id: string) => {
    setDraggedId(id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (targetStatus: OrderStatus) => {
    if (draggedId) {
      handleStatusChange(draggedId, targetStatus);
      setDraggedId(null);
    }
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

      <div className="flex flex-col md:flex-row md:overflow-x-auto gap-4 pb-6 pt-1">
        {ORDER_STATUSES.map((status) => {
          const columnItems = itemsByStatus[status] || [];
          const count = counts[status] ?? columnItems.length;

          return (
            <div
              key={status}
              data-testid={`board-column-${status}`}
              onDragOver={onDragOver}
              onDrop={() => onDrop(status)}
              className="flex w-full md:w-80 shrink-0 flex-col rounded-xl border border-border bg-secondary/20 p-3"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={STATUS_BADGE_VARIANTS[status]}
                    className="size-2.5 rounded-full p-0"
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {STATUS_TITLES[status]}
                  </span>
                </div>
                <span className="flex size-5 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-muted-foreground shadow-xs">
                  {count}
                </span>
              </div>

              {/* Column Card List */}
              <div className="flex-1 space-y-3 min-h-[200px]">
                {columnItems.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
                    No orders in this stage
                  </div>
                ) : (
                  columnItems.map((order) => {
                    const legalTargets = ORDER_STATUSES.filter((target) =>
                      isLegalOrderTransition(order.status, target),
                    );
                    const telHref = order.customerPhone ? telLink(order.customerPhone) : null;
                    const waHref = order.customerPhone ? whatsappLink(order.customerPhone) : null;

                    return (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={() => onDragStart(order.id)}
                        className="group relative flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-grab active:cursor-grabbing"
                      >
                        <div>
                          {/* Top row: OrderNo + Badge + Overflow menu */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/orders/${order.id}` as Route}
                                className="font-mono text-xs font-bold text-foreground hover:text-primary transition-colors"
                              >
                                {order.orderNo}
                              </Link>
                              <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">
                                {order.type}
                              </Badge>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Order actions"
                                  className="size-8 -mr-2 -mt-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                  <MoreVertical className="size-4" aria-hidden="true" />
                                  <span className="sr-only">Order actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/orders/${order.id}` as Route}>
                                    <ExternalLink className="mr-2 size-3.5" aria-hidden="true" />
                                    View Order Detail
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
                                      <DropdownMenuSubContent className="w-44">
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
                          </div>

                          {/* Customer Name */}
                          <p className="mt-2 text-sm font-semibold text-foreground line-clamp-1">
                            {order.customerName || "Anonymous Customer"}
                          </p>

                          {/* Listing title */}
                          {order.listingTitle ? (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                              {order.listingTitle}
                            </p>
                          ) : null}

                          {/* Price */}
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-semibold text-foreground">
                              {order.quotedPrice != null
                                ? formatMoney(order.quotedPrice, order.currency)
                                : "Not quoted"}
                            </span>
                          </div>

                          {/* Phone & Contact Buttons */}
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono truncate">
                              <Phone className="size-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{order.customerPhone || "No phone"}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {telHref ? (
                                <a
                                  href={telHref}
                                  title="Call phone"
                                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Phone className="size-3" aria-hidden="true" />
                                </a>
                              ) : null}
                              {waHref ? (
                                <a
                                  href={waHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Chat WhatsApp"
                                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                  <MessageCircle className="size-3" aria-hidden="true" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Card footer: timestamp */}
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="size-3" aria-hidden="true" />
                          <span>{formatRelativeTime(order.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
