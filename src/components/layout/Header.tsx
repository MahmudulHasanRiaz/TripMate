

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, LayoutDashboard } from "lucide-react";
import Logo from "../icons/Logo";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import { useAppContext } from "@/context/AppContext";
import { Page } from "@/lib/data";
import { useState, useEffect } from "react";
import { getSupabaseClient_client } from "@/lib/supabase";
import Image from "next/image";


const defaultNavLinks = [
  { href: "/", label: "Home" },
  { href: "/packages", label: "Packages" },
  { href: "/blog", label: "Blog" },
];

export default function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { settings, setContactFormOpen, isSetupComplete } = useAppContext();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [navLinks, setNavLinks] = useState(defaultNavLinks);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSetupComplete) {
        setNavLinks(defaultNavLinks);
        return;
    }

    const fetchPages = async () => {
      try {
        const supabase = getSupabaseClient_client();
        const { data, error } = await supabase
          .from("pages")
          .select('slug,title,menu_order')
          .eq("show_in_menu", true)
          .eq("status", "published")
          .order('menu_order');
        
        if (error) throw error;

        const fetchedPages = data.map((page: any) => ({
            href: `/${page.slug}`,
            label: page.title,
            order: page.menu_order ?? 99
        }));
        
        const allLinks = [...defaultNavLinks];
        fetchedPages.forEach(page => {
             if (page.order < allLinks.length) {
                allLinks.splice(page.order, 0, { href: page.href, label: page.label });
            } else {
                allLinks.push({ href: page.href, label: page.label });
            }
        });
         
        const uniqueLinks = allLinks.filter((link, index, self) =>
            index === self.findIndex((l) => (
                l.href === link.href
            ))
        );
        
        setNavLinks(uniqueLinks);
        
      } catch (error) {
        console.error("Failed to fetch dynamic pages for menu:", error);
        setNavLinks(defaultNavLinks);
      }
    };

    fetchPages();
  }, [isSetupComplete]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
                <Image src={settings.logo_url} alt={settings?.site_title || "TripMate"} width={32} height={32} className="h-8 w-8" />
            ) : (
                <Logo className="h-8 w-8 text-primary" />
            )}
            <span className="font-bold font-headline text-xl">{settings?.site_title || 'TripMate'}</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-primary",
                pathname === link.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
            <button
              onClick={() => setContactFormOpen(true)}
              className="transition-colors hover:text-primary text-muted-foreground"
            >
              Contact
            </button>
        </nav>

        <div className="hidden md:flex items-center justify-end space-x-4">
          {loading ? (
             <div className="h-8 w-20 bg-muted rounded-md animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" asChild>
                   <Link href={isAdmin ? "/admin" : "/dashboard"}>
                        <User className="h-5 w-5" />
                        <span className="sr-only">Dashboard</span>
                   </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={logout}>
                   <LogOut className="mr-2 h-4 w-4" />
                   Logout
                </Button>
            </div>
          ) : (
            <div className="space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
                <SheetHeader className="p-6 pb-0">
                   <SheetTitle>
                     <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                        {settings?.logo_url ? (
                            <Image src={settings.logo_url} alt={settings.site_title || "TripMate"} width={32} height={32} className="h-8 w-8" />
                        ) : (
                            <Logo className="h-8 w-8 text-primary" />
                        )}
                        <span className="font-bold font-headline text-xl">{settings?.site_title || 'TripMate'}</span>
                    </Link>
                   </SheetTitle>
                </SheetHeader>
              <div className="flex flex-col p-6">
                <nav className="flex flex-col space-y-4 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "text-lg",
                        pathname === link.href ? "text-primary font-semibold" : "text-muted-foreground"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                   <button
                    onClick={() => {
                        setContactFormOpen(true);
                        setIsMobileMenuOpen(false);
                    }}
                    className="text-lg text-muted-foreground text-left"
                   >
                    Contact
                  </button>
                </nav>
                <div className="mt-8 pt-4 border-t border-border flex flex-col space-y-2">
                    {loading ? <div className="h-10 w-full bg-muted rounded-md animate-pulse" /> : user ? (
                       <>
                          <Button asChild onClick={() => setIsMobileMenuOpen(false)}><Link href={isAdmin ? "/admin" : "/dashboard"}>Dashboard</Link></Button>
                          <Button variant="outline" onClick={() => {
                              logout();
                              setIsMobileMenuOpen(false);
                          }}>Logout</Button>
                       </>
                    ) : (
                        <>
                            <Button variant="outline" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/login">Login</Link></Button>
                            <Button asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/signup">Sign Up</Link></Button>
                        </>
                    )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
