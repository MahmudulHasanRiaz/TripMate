"use client";

import { useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import {
  Activity,
  Banknote,
  BookCopy,
  BookOpen,
  Briefcase,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  MailOpen,
  Megaphone,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Star,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Toaster } from "@/components/ui/toaster";

import { signOutAction } from "@/lib/auth-actions";
import type { AdminMenuItem } from "@/lib/admin-menu";
import type { UserRole } from "@/modules/users/permissions";
import Logo from "@/components/icons/Logo";
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
  "book-open": BookOpen,
  briefcase: Briefcase,
  banknote: Banknote,
  receipt: Receipt,
  package: Package,
  "file-text": FileText,
  "message-square": MessageSquare,
  star: Star,
  megaphone: Megaphone,
  image: ImageIcon,
  users: Users,
  activity: Activity,
  settings: Settings,
  "mail-open": MailOpen,
  "trash-2": Trash2,
};

/**
 * One accent color per nav group — the artifact reference's color-coded rail.
 * The value lands on each menu button as a `--k` custom property; admin.css
 * uses it for the icon color, the active tint and the active inset ring.
 * Groups not listed fall back to the theme primary.
 */
const GROUP_ACCENTS: Record<string, string> = {
  Overview: "var(--c-blue)",
  Sales: "var(--c-green)",
  Customers: "var(--c-cyan)",
  Products: "var(--c-violet)",
  Content: "var(--c-pink)",
  Finance: "var(--c-amber)",
  Settings: "var(--c-orange)",
};

type AdminUser = {
  name: string;
  email: string;
  role: UserRole;
};

export default function AdminShell({
  menu,
  user,
  brand,
  children,
}: {
  menu: AdminMenuItem[];
  user: AdminUser;
  brand: { title: string; logoUrl: string };
  children: React.ReactNode;
}) {
  // Mirror the admin scope onto <body> so Radix portals (dialogs, sheets,
  // dropdowns, toasts) — which mount outside the .admin-root wrapper — also
  // resolve the admin tokens and skins.
  useEffect(() => {
    document.body.setAttribute("data-admin", "");
    return () => document.body.removeAttribute("data-admin");
  }, []);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarBrand title={brand.title} logoUrl={brand.logoUrl} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav menu={menu} />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-3">
            <HeaderUserMenu user={user} />
          </div>
        </header>
        <div className="w-full max-w-[1600px] flex-1 px-4 py-5 md:px-6 md:py-6 min-[1400px]:px-8">
          {children}
        </div>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Brand lockup pinned to the top of the rail — settings-driven: the site
 *  title + logo configured in Admin → Settings → Brand, never hardcoded. */
function SidebarBrand({ title, logoUrl }: { title: string; logoUrl: string }) {
  return (
    <Link href="/admin" className="flex items-center gap-2 px-2 py-1">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-6 rounded-md object-contain" />
      ) : (
        <Logo className="size-6 text-primary" aria-hidden="true" />
      )}
      <span className="font-display text-lg font-semibold tracking-tight truncate">
        {title}
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
                      style={
                        {
                          "--k": GROUP_ACCENTS[group.name],
                        } as CSSProperties
                      }
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
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-medium text-white">
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
