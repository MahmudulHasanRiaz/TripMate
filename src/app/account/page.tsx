import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  Package,
  Plane,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { getPortalDashboardData } from "@/modules/portal/service";
import { formatMoney } from "@/components/site/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProfileEditDialog } from "./_components/ProfileEditDialog";
import ChangePasswordCard from "./_components/ChangePasswordCard";
import type { OrderStatus } from "@/modules/bookings/validation";

export const metadata: Metadata = {
  title: "Customer Portal · TripMate",
};

export const instant = false;

const STATUS_TITLES: Record<OrderStatus, string> = {
  pending: "Pending Review",
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

export default async function AccountPage() {
  const session = await requireSession();
  const data = await getPortalDashboardData(session.user.id);
  const { stats, recentOrders, recentPayments, user } = data;

  const displayName = user?.name || session.user.name || session.user.email || "Traveller";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your bookings, track payment submissions, and view your travel itineraries.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            <Link href={"/account/documents" as Route}>
              <FileText className="size-3.5" aria-hidden="true" />
              My Documents
            </Link>
          </Button>
          <Button asChild size="sm" className="h-9 gap-1.5 text-xs">
            <Link href={"/packages" as Route}>
              <Package className="size-3.5" aria-hidden="true" />
              Browse Packages
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI / Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Bookings
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {stats.totalBookings}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.activeTrips} active / in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agreed Value
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {formatMoney(stats.totalQuoted)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across all booked trips
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verified Paid
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">
              {formatMoney(stats.totalPaid)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmed agency receipts
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Due
            </CardTitle>
            <div className={`flex size-8 items-center justify-center rounded-lg ${
              stats.outstandingBalance > 0
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            }`}>
              <AlertCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${
              stats.outstandingBalance > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground"
            }`}>
              {formatMoney(stats.outstandingBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.outstandingBalance > 0 ? "Pending payment settlement" : "Fully settled"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Bookings & Payments */}
        <div className="space-y-8 lg:col-span-2">
          {/* Recent Orders */}
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
                <CardDescription className="text-xs">
                  Your most recent travel orders and service requests
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                <Link href={"/account/orders" as Route}>
                  <span>View All</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {recentOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-10 text-center space-y-3">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <Plane className="size-5" />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You haven&apos;t placed any bookings yet. Check our latest Hajj, Umrah, and holiday tour packages.
                  </p>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link href={"/packages" as Route}>Explore Packages</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {order.orderNo}
                          </span>
                          <Badge
                            variant={STATUS_BADGE_VARIANTS[order.status]}
                            className="text-[10px] capitalize"
                          >
                            {STATUS_TITLES[order.status]}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-medium text-foreground">
                          {order.listingTitle || "Travel Service Inquiry"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Placed on{" "}
                          {new Date(order.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-muted-foreground block">
                            Amount
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {order.quotedPrice != null
                              ? formatMoney(order.quotedPrice, order.currency)
                              : "Pending quote"}
                          </span>
                        </div>
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                          <Link href={`/account/orders/${order.id}` as Route}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          {recentPayments.length > 0 ? (
            <Card className="border-border shadow-xs">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-base font-semibold">Payment History</CardTitle>
                <CardDescription className="text-xs">
                  Your submitted payments and verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="divide-y divide-border/60">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3 first:pt-0 last:pb-0 gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">
                            {payment.method}
                          </Badge>
                          <Badge
                            variant={
                              payment.status === "verified"
                                ? "success"
                                : payment.status === "rejected"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[10px] capitalize"
                          >
                            {payment.status}
                          </Badge>
                          {payment.trxId ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              Trx: {payment.trxId}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Submitted on{" "}
                          {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="font-mono text-sm font-bold text-foreground">
                        {formatMoney(payment.amount, payment.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right 1 Col: Profile Card & Support */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <CardTitle className="text-base font-semibold">Account Profile</CardTitle>
              <ProfileEditDialog
                initialName={user?.name || session.user.name || ""}
                initialPhone={user?.phone || null}
                email={user?.email || session.user.email || ""}
              />
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{displayName}</h3>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                </div>
              </div>

              <div className="space-y-2.5 rounded-xl bg-muted/40 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone / WhatsApp</span>
                  <span className="font-medium text-foreground">
                    {user?.phone || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Account Role</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {user?.role || "Customer"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="text-muted-foreground">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })
                      : "2026"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <ChangePasswordCard />

          {/* Concierge & Assistance */}
          <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent shadow-xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Headphones className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Dedicated Concierge Desk
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Have questions about your itinerary, visa stamping status, or require payment assistance? Our travel team is here to help.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Button asChild variant="outline" size="sm" className="h-9 w-full text-xs justify-center">
                  <Link href={"/account/documents" as Route}>
                    <FileText className="mr-2 size-3.5" />
                    Manage Travel Documents
                  </Link>
                </Button>
                <Button asChild size="sm" className="h-9 w-full text-xs justify-center">
                  <Link href={"/account/orders" as Route}>
                    <Receipt className="mr-2 size-3.5" />
                    View All Orders & Quotes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
