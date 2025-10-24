

"use client"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import Logo from "@/components/icons/Logo"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  BookCopy,
  Users,
  FileText,
  LogOut,
  Settings,
  Image as ImageIconLucide,
  ChevronDown,
  Mail,
  User as UserIcon,
  ShieldAlert,
  Loader2,
  File,
  Home,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useAuth, User } from "@/hooks/use-auth.tsx"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import UserProfileModal from "@/components/admin/UserProfileModal";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { getSupabaseClient_client } from "@/lib/supabase";


const menuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { 
    label: "Packages", 
    icon: Package,
    subItems: [
        { href: "/admin/packages/all", label: "All Packages" },
        { href: "/admin/packages/destinations", label: "Destinations" },
        { href: "/admin/packages/types", label: "Types" },
    ]
  },
  { href: "/admin/bookings", label: "Bookings", icon: BookCopy },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  {
    label: "Pages",
    icon: File,
    subItems: [
        { href: "/admin/pages/all", label: "All Pages"},
        { href: "/admin/pages/new", label: "Add New"},
        { href: "/admin/pages/home", label: "Home Page", icon: Home},
        { href: "/admin/pages/static", label: "Static Pages"},
    ]
  },
  {
    label: "Users",
    icon: Users,
    subItems: [
      { href: "/admin/users/all", label: "All Users" },
      { href: "/admin/users/admins", label: "Admins" },
      { href: "/admin/users/staff", label: "Staff" },
      { href: "/admin/users/customers", label: "Customers" },
    ]
  },
  { 
    label: "Blog", 
    icon: FileText,
    subItems: [
        { href: "/admin/blog/posts", label: "All Posts" },
        { href: "/admin/blog/categories", label: "Categories" },
    ]
  },
  { href: "/admin/media", label: "Media", icon: ImageIconLucide },
]

function AdminAccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive text-destructive-foreground rounded-full p-3 w-fit">
                    <ShieldAlert className="h-8 w-8" />
                </div>
                <CardTitle className="mt-4">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                   You do not have the necessary permissions to view this page. This area is restricted to administrators.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    If you believe this is an error, please contact a site super administrator to grant you access.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/">Return to Homepage</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  )
}

function AdminLoadingScreen() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter();
  const { user, setUser, loading, logout } = useAuth();
  const { settings } = useAppContext();
  const { toast } = useToast();
  const [openState, setOpenState] = useState({
    packages: false,
    users: false,
    blog: false,
    pages: false,
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  
  if (!user) {
    // Middleware should prevent this, but as a fallback.
    return <AdminLoadingScreen />;
  }

  const isAuthorized = user.role === "admin" || user.role === "superadmin" || user.role === "staff";

  if (!isAuthorized) {
    return <AdminAccessDenied />;
  }

  const handleOpenChange = (key: keyof typeof openState) => (isOpen: boolean) => {
    setOpenState(prev => ({...prev, [key]: isOpen }));
  }

  const getOpenStatus = (label: string): boolean => {
      const key = label.toLowerCase() as keyof typeof openState;
      return openState[key];
  }
  
  const getOpenChangeHandler = (label: string) => {
      const key = label.toLowerCase() as keyof typeof openState;
      if(key in openState) {
          return handleOpenChange(key);
      }
      return () => {};
  }
  
  const getIsActive = (label: string) => {
      const key = label.toLowerCase();
      return pathname.startsWith(`/admin/${key}`);
  }

  const handleSaveProfile = async (updatedUser: User) => {
     try {
        const supabase = getSupabaseClient_client();
        if (!supabase) return;
        const { id, password, ...dataToSave } = updatedUser;
        const { error } = await supabase.from('users').update(dataToSave).eq('id', id);
        
        if (error) throw error;
        
        // Update the user state in the context to reflect changes immediately
        setUser(currentUser => currentUser ? { ...currentUser, ...dataToSave } : null);

        setIsProfileModalOpen(false);

        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated."
        });
    } catch (error: any) {
        console.error("Error saving profile:", error);
        toast({ title: "Error", description: `Failed to save your profile: ${error.message}`, variant: "destructive" });
    }
  }

  const handleLogout = () => {
    setOpenMobile(false);
    logout();
  }

  return (
    <>
    <SidebarProvider openMobile={openMobile} onOpenMobileChange={setOpenMobile}>
      <Sidebar>
        <SidebarHeader>
           <div className="flex items-center gap-2 p-2">
            {settings?.logo_url ? (
                <Image src={settings.logo_url} alt={settings.site_title || "TripMate"} width={32} height={32} className="h-8 w-8" />
            ) : (
                <Logo className="size-8 text-sidebar-primary" />
            )}
            <span className="text-xl font-headline font-semibold text-sidebar-foreground">
              {settings ? settings.site_title : "TripMate"}
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.label || item.href}>
                {item.subItems ? (
                  <Collapsible 
                      defaultOpen={getIsActive(item.label)}
                      onOpenChange={getOpenChangeHandler(item.label)}
                  >
                    <CollapsibleTrigger asChild>
                       <SidebarMenuButton
                        className="justify-between"
                        isActive={getIsActive(item.label)}
                        tooltip={item.label}
                      >
                         <div className="flex items-center gap-2">
                            <item.icon />
                            <span>{item.label}</span>
                         </div>
                         <ChevronDown className={cn("size-4 transition-transform", getOpenStatus(item.label) && "rotate-180")} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                          {item.subItems.map(subItem => (
                              <SidebarMenuSubItem key={subItem.href}>
                                  <SidebarMenuSubButton asChild isActive={pathname === subItem.href} onClick={() => setOpenMobile(false)}>
                                      <Link href={subItem.href}>
                                          {subItem.icon && <subItem.icon className="mr-2 h-4 w-4"/>}
                                          <span>{subItem.label}</span>
                                      </Link>
                                  </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                          ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Link href={item.href!}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/admin/settings"} tooltip="Settings" onClick={() => setOpenMobile(false)}>
                <Link href="/admin/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 gap-2 px-2">
                   <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photo_url || undefined} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                     <span className="text-sm font-medium">{user.name}</span>
                     <span className="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                   <UserIcon className="mr-2 h-4 w-4" />
                   <span>My Profile</span>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                   <Link href="/" target="_blank" rel="noopener noreferrer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>View Site</span>
                   </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                   <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
    {user && (
        <UserProfileModal 
            user={user}
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onSave={handleSaveProfile}
            isEditingSelf={true}
        />
      )}
    </>
  )
}
