import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, ExternalLink, Package, ShoppingBag } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { myOrders } from "@/modules/portal/service";
import type { OrderStatus } from "@/modules/bookings/validation";
import { formatMoney } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "My Orders · TripMate",
};

export const instant = false;

type SearchParams = {
  page?: string;
};

const STATUS_TITLES: Record<OrderStatus, string> = {
  pending: "Pending Review",
  in_review: "In Review",
  quoted: "Quote Ready",
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

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const page = /^\d+$/.test(sp.page ?? "") ? Math.max(1, Number(sp.page)) : 1;

  const paginated = await myOrders(session.user.id, { page, perPage: 10 });
  const totalPages = Math.max(1, Math.ceil(paginated.total / 10));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track your package bookings, review quotes, and manage payment submissions.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-9 text-xs gap-1.5 self-start sm:self-auto">
          <Link href="/packages">
            <Package className="size-3.5" aria-hidden="true" />
            Explore Packages
          </Link>
        </Button>
      </div>

      {paginated.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <ShoppingBag className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">No bookings found</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              You haven&apos;t placed any package bookings or service inquiries yet. Browse our packages to start your journey.
            </p>
          </div>
          <Button asChild className="min-h-11 bg-primary text-primary-foreground">
            <Link href="/packages">Browse Packages</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.items.map((order) => (
            <Card key={order.id} className="shadow-xs hover:border-foreground/30 transition-colors">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {order.orderNo}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {order.type}
                    </Badge>
                    <Badge
                      variant={STATUS_BADGE_VARIANTS[order.status]}
                      className="capitalize text-[10px]"
                    >
                      {STATUS_TITLES[order.status]}
                    </Badge>
                  </div>

                  <h3 className="text-base font-semibold text-foreground">
                    {order.listingTitle || "Service Inquiry"}
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Placed on{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border/50 sm:border-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Agreed Quote
                    </p>
                    <p className="font-mono text-base font-bold text-foreground">
                      {order.quotedPrice != null
                        ? formatMoney(order.quotedPrice, order.currency)
                        : "Quote pending"}
                    </p>
                  </div>

                  <Button asChild size="sm" className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground">
                    <Link href={`/account/orders/${order.id}` as Route}>
                      View Details
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <div>
            Showing page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/account/orders?page=${page - 1}` as Route}>
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Previous
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="h-8 gap-1 text-xs"
            >
              <Link href={`/account/orders?page=${page + 1}` as Route}>
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
