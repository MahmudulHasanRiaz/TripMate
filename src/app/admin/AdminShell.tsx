"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import {
  Activity,
  Banknote,
  BookCopy,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  MailOpen,
  Megaphone,
  Package,
  Receipt,
  Settings,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Toaster } from "@/components/ui/toaster";

import { signOutAction } from "@/lib/auth-actions";
import type { AdminMenuItem } from "@/lib/admin-menu";
import type { UserRole } from "@/modules/users/permissions";
import Logo from "@/components/icons/Logo";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * String icon name -> lucide component. ADMIN_MENU stores the name (plain
 * data, serializable, no component in the server-side module); this client
 * lookup is the single place that resolves a name to a renderable icon.
 */
const MENU_ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  mail: Mail,
  "file-spreadsheet": FileSpreadsheet,
  "book-copy": BookCopy,
  banknote: Banknote,
  receipt: Receipt,
  package: Package,
  "file-text": FileText,
  megaphone: Megaphone,
  image: ImageIcon,
  users: Users,
  activity: Activity,
  settings: Settings,
  "mail-open": MailOpen,
  "trash-2": Trash2,
};

type AdminUser = {
  name: string;
  email: string;
  role: UserRole;
};

export default function AdminShell({
  menu,
  user,
  children,
}: {
  menu: AdminMenuItem[];
  user: AdminUser;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarBrand />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav menu={menu} />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-3">
            <HeaderUserMenu user={user} />
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Brand lockup pinned to the top of the rail. */
function SidebarBrand() {
  return (
    <Link href="/admin" className="flex items-center gap-2 px-2 py-1">
      <Logo className="size-6 text-primary" aria-hidden="true" />
      <span className="font-display text-lg font-semibold tracking-tight">
        TripMate
      </span>
    </Link>
  );
}

/**
 * The visible nav list. The menu arrived already permission-filtered from the
 * server layout — this component renders what it is given and performs no
 * role logic. Mobile: tapping an item closes the Sheet so navigation feels
 * immediate instead of leaving the drawer covering the destination.
 */
function SidebarNav({ menu }: { menu: AdminMenuItem[] }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const go = () => setOpenMobile(false);

  // Group items by section per spec §50 while preserving group order
  const groups: { name: string; items: AdminMenuItem[] }[] = [];
  for (const item of menu) {
    const groupName = item.group || "General";
    let grp = groups.find((g) => g.name === groupName);
    if (!grp) {
      grp = { name: groupName, items: [] };
      groups.push(grp);
    }
    grp.items.push(item);
  }

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.name} className="py-1">
          <SidebarGroupLabel className="px-2 text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/60">
            {group.name}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = MENU_ICONS[item.icon] ?? LayoutDashboard;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        active &&
                          "bg-sidebar-primary font-medium text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                      )}
                    >
                      <Link href={item.href as Route} onClick={go}>
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function roleLabel(role: UserRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
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
  return (email.trim()[0] ?? "A").toUpperCase();
}

/** Account chip + dropdown (name, role, view site, sign out). */
function HeaderUserMenu({ user }: { user: AdminUser }) {
  const label = roleLabel(user.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-full p-1 pr-2 outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {initials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block max-w-40 truncate text-sm font-medium leading-tight">
              {user.name.trim() || user.email}
            </span>
            <span className="block text-xs text-muted-foreground">{label}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold">
            {user.name.trim() || user.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="px-2 pb-1">
          <Badge variant="secondary" className="capitalize">
            {label}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            View site
            <ExternalLink className="ms-auto size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </DropdownMenuItem>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
