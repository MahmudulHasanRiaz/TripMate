"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import type { UserView, UserRole } from "@/modules/users/service";
import { updateUserRoleAction, toggleUserStatusAction } from "@/modules/users/actions";
import SetPasswordDialog from "./SetPasswordDialog";
import SectionHeader from "@/components/admin/SectionHeader";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: "Superadmin", value: "superadmin" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Customer", value: "customer" },
];

function roleBadge(role: UserRole) {
  switch (role) {
    case "superadmin":
      return (
        <Badge variant="default" className="bg-purple-600 text-white hover:bg-purple-700">
          <ShieldCheck className="mr-1 size-3" /> Superadmin
        </Badge>
      );
    case "admin":
      return (
        <Badge variant="default" className="bg-primary text-primary-foreground">
          <Shield className="mr-1 size-3" /> Admin
        </Badge>
      );
    case "staff":
      return (
        <Badge variant="secondary">
          <UserCheck className="mr-1 size-3" /> Staff
        </Badge>
      );
    case "customer":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Customer
        </Badge>
      );
  }
}

function initials(name: string, email: string) {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return (email.trim()[0] ?? "U").toUpperCase();
}

export default function UsersView({
  items,
  total,
  currentSearch,
  currentRole,
  currentStatus,
  currentPage,
  perPage,
  currentUser,
}: {
  items: UserView[];
  total: number;
  currentSearch: string;
  currentRole?: UserRole;
  currentStatus?: string;
  currentPage: number;
  perPage: number;
  currentUser: { id: string; role: UserRole };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState(currentSearch);

  // Role dialog state
  const [roleUser, setRoleUser] = useState<UserView | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("customer");
  const [roleLoading, setRoleLoading] = useState(false);

  // Status dialog state
  const [statusUser, setStatusUser] = useState<UserView | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Set-password dialog state (§2.4)
  const [passwordUser, setPasswordUser] = useState<UserView | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const updateFilters = (newParams: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    const s = newParams.search !== undefined ? newParams.search : search;
    const r = newParams.role !== undefined ? newParams.role : currentRole;
    const st = newParams.status !== undefined ? newParams.status : currentStatus;
    const p = newParams.page !== undefined ? newParams.page : 1;

    if (s.trim()) params.set("search", s.trim());
    if (r && r !== "all") params.set("role", r);
    if (st && st !== "all") params.set("status", st);
    if (p > 1) params.set("page", String(p));

    router.push(`/admin/users?${params.toString()}` as Route);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search, page: 1 });
  };

  const handleRoleChangeSubmit = async () => {
    if (!roleUser) return;
    setRoleLoading(true);
    try {
      const res = await updateUserRoleAction({
        userId: roleUser.id,
        role: selectedRole,
      });

      if (!res.ok) {
        toast({
          title: "Failed to update role",
          description: res.error || "An unexpected error occurred",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Role updated",
        description: `${roleUser.name || roleUser.email} is now a ${selectedRole}.`,
      });
      setRoleUser(null);
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to communicate with server",
        variant: "destructive",
      });
    } finally {
      setRoleLoading(false);
    }
  };

  const handleToggleStatusSubmit = async () => {
    if (!statusUser) return;
    setStatusLoading(true);
    try {
      const newStatus = statusUser.status === "active" ? "suspended" : "active";
      const res = await toggleUserStatusAction({
        userId: statusUser.id,
        status: newStatus,
      });

      if (!res.ok) {
        toast({
          title: "Failed to update status",
          description: res.error || "An unexpected error occurred",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Status updated",
        description: `${statusUser.name || statusUser.email} is now ${newStatus}.`,
      });
      setStatusUser(null);
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Failed to communicate with server",
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-start gap-3">
            <SectionHeader
              title="Users & Customers"
              description="Manage user accounts, roles, and access status across staff, admins, and portal customers."
              icon={Users}
              accent="var(--c-cyan)"
            />
            <Badge variant="secondary" className="mt-1 text-xs font-semibold tabular-nums">{total} Total</Badge>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-9 h-10 text-sm rounded-lg border-border"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <Select
            value={currentRole ?? "all"}
            onValueChange={(val) => updateFilters({ role: val, page: 1 })}
          >
            <SelectTrigger className="w-[150px] h-10 text-sm rounded-lg border-border">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">All Roles</SelectItem>
              <SelectItem value="superadmin" className="text-sm">Superadmin</SelectItem>
              <SelectItem value="admin" className="text-sm">Admin</SelectItem>
              <SelectItem value="staff" className="text-sm">Staff</SelectItem>
              <SelectItem value="customer" className="text-sm">Customer</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={currentStatus ?? "all"}
            onValueChange={(val) => updateFilters({ status: val, page: 1 })}
          >
            <SelectTrigger className="w-[150px] h-10 text-sm rounded-lg border-border">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">All Status</SelectItem>
              <SelectItem value="active" className="text-sm">Active</SelectItem>
              <SelectItem value="suspended" className="text-sm">Suspended</SelectItem>
            </SelectContent>
          </Select>

          {(currentSearch || currentRole || currentStatus) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                router.push("/admin/users" as Route);
              }}
              className="h-10 px-3.5 rounded-lg text-sm font-medium shadow-xs"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</TableHead>
              <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</TableHead>
              <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</TableHead>
              <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="h-11 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</TableHead>
              <TableHead className="h-11 w-[80px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Users className="size-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-foreground">No users found</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try adjusting your search query, role filter, or account status.
                      </p>
                    </div>
                    {(currentSearch || currentRole || currentStatus) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          router.push("/admin/users" as Route);
                        }}
                        className="mt-2 h-9 rounded-lg text-sm"
                      >
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((user) => {
                const isSelf = user.id === currentUser.id;
                return (
                  <TableRow key={user.id} className="min-h-[52px] border-b border-border transition-colors hover:bg-muted/30">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {initials(user.name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <span>{user.name.trim() || "Nameless User"}</span>
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      <div className="text-sm font-mono tabular-nums text-foreground">
                        {user.phone ? (
                          <span>{user.phone}</span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">{roleBadge(user.role)}</TableCell>

                    <TableCell className="py-3.5">
                      {user.status === "active" ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2 py-0.5"
                        >
                          <CheckCircle2 className="mr-1 size-3" /> Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-medium px-2 py-0.5"
                        >
                          <UserX className="mr-1 size-3" /> Suspended
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5 text-sm text-muted-foreground tabular-nums">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-md">
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-sm">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRole(user.role);
                              setRoleUser(user);
                            }}
                          >
                            <Shield className="mr-2 size-4" />
                            Change Role
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => setPasswordUser(user)}>
                            <KeyRound className="mr-2 size-4" />
                            Set password
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            disabled={isSelf}
                            onClick={() => setStatusUser(user)}
                            className={user.status === "active" ? "text-destructive focus:text-destructive" : ""}
                          >
                            {user.status === "active" ? (
                              <>
                                <UserX className="mr-2 size-4" />
                                Suspend Account
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 size-4" />
                                Activate Account
                              </>
                            )}
                          </DropdownMenuItem>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * perPage + 1} to{" "}
            {Math.min(currentPage * perPage, total)} of {total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => updateFilters({ page: currentPage - 1 })}
            >
              <ChevronLeft className="mr-1 size-4" /> Previous
            </Button>
            <span className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => updateFilters({ page: currentPage + 1 })}
            >
              Next <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Role Change Dialog */}
      <Dialog open={!!roleUser} onOpenChange={(open) => !open && setRoleUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Change User Role</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Assign a new role to{" "}
              <strong className="font-semibold text-foreground">
                {roleUser?.name || roleUser?.email}
              </strong>
              . Superadmins have full system access; Admins manage catalog, finance, and operations; Staff handle leads and bookings; Customers only access the client portal.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <label className="text-[13px] font-medium text-foreground">Select Role</label>
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as UserRole)}
            >
              <SelectTrigger className="h-10 text-sm rounded-lg border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleUser(null)}
              disabled={roleLoading}
              className="h-10 px-4 rounded-lg text-sm font-medium"
            >
              Cancel
            </Button>
            <Button onClick={handleRoleChangeSubmit} disabled={roleLoading} className="h-10 px-4 rounded-lg text-sm font-semibold shadow-xs">
              {roleLoading ? "Saving..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / Activate Dialog */}
      <Dialog open={!!statusUser} onOpenChange={(open) => !open && setStatusUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="size-5 text-amber-500" />
              {statusUser?.status === "active" ? "Suspend Account" : "Activate Account"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {statusUser?.status === "active" ? (
                <>
                  Are you sure you want to suspend{" "}
                  <strong className="font-semibold text-foreground">
                    {statusUser?.name || statusUser?.email}
                  </strong>
                  ? Suspended users will be blocked from logging into the portal or admin shell.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate{" "}
                  <strong className="font-semibold text-foreground">
                    {statusUser?.name || statusUser?.email}
                  </strong>
                  ? They will regain access to their account.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusUser(null)}
              disabled={statusLoading}
              className="h-10 px-4 rounded-lg text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              variant={statusUser?.status === "active" ? "destructive" : "default"}
              onClick={handleToggleStatusSubmit}
              disabled={statusLoading}
              className="h-10 px-4 rounded-lg text-sm font-semibold shadow-xs"
            >
              {statusLoading
                ? "Processing..."
                : statusUser?.status === "active"
                ? "Suspend Account"
                : "Activate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SetPasswordDialog
        user={passwordUser}
        open={!!passwordUser}
        onOpenChange={(open) => !open && setPasswordUser(null)}
      />
    </div>
  );
}
