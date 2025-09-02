

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Logo from "../icons/Logo";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Loader2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";

type SocialLink = {
    id: string;
    platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube';
    url: string;
};

type FooterLink = {
    id: string;
    label: string;
    url: string;
}

const SocialIcon = ({ platform }: { platform: SocialLink['platform'] }) => {
    switch (platform) {
        case 'twitter': return <Twitter className="h-5 w-5" />;
        case 'facebook': return <Facebook className="h-5 w-5" />;
        case 'instagram': return <Instagram className="h-5 w-5" />;
        case 'linkedin': return <Linkedin className="h-5 w-5" />;
        case 'youtube': return <Youtube className="h-5 w-5" />;
        default: return null;
    }
};


export default function Footer() {
  const { settings, loading } = useAppContext();

  if (loading || !settings) {
      return (
          <footer className="bg-secondary text-secondary-foreground">
              <div className="container mx-auto px-4 py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
          </footer>
      )
  }

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Logo, Description, Socials */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2">
                {settings?.logo_url ? (
                    <Image src={settings.logo_url} alt={settings.site_title} width={32} height={32} className="h-8 w-8" />
                ) : (
                    <Logo className="h-8 w-8 text-primary" />
                )}
                <span className="font-bold font-headline text-xl">{settings?.site_title || "TripMate"}</span>
            </Link>
            <p className="text-sm text-muted-foreground">{settings?.footer_description}</p>
             {settings?.social_links?.length > 0 && (
                <div className="flex space-x-2">
                    {settings.social_links.map((link: SocialLink) => (
                        <Button key={link.id} variant="ghost" size="icon" asChild>
                            <Link href={link.url} target="_blank" rel="noopener noreferrer">
                                <SocialIcon platform={link.platform} />
                            </Link>
                        </Button>
                    ))}
                </div>
            )}
          </div>
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="font-headline font-semibold mb-4">{settings?.quick_links?.title}</h3>
            <ul className="space-y-2 text-sm">
               {settings?.quick_links?.links.map((link: FooterLink) => (
                 <li key={link.id}>
                    <Link href={link.url} className="text-muted-foreground hover:text-primary">
                        {link.label}
                    </Link>
                 </li>
               ))}
            </ul>
          </div>
          {/* Column 3: Support Links */}
          <div>
            <h3 className="font-headline font-semibold mb-4">{settings?.support_links?.title}</h3>
            <ul className="space-y-2 text-sm">
               {settings?.support_links?.links.map((link: FooterLink) => (
                 <li key={link.id}>
                    <Link href={link.url} className="text-muted-foreground hover:text-primary">
                        {link.label}
                    </Link>
                 </li>
               ))}
            </ul>
          </div>
          {/* Column 4: Map */}
          <div>
            <h3 className="font-headline font-semibold mb-4">Our Location</h3>
            {settings?.google_map_embed_code ? (
                 <div className="aspect-video w-full overflow-hidden rounded-md border shadow-md"
                    dangerouslySetInnerHTML={{ __html: settings.google_map_embed_code }}
                 />
            ) : (
                <p className="text-sm text-muted-foreground">Location map will be shown here.</p>
            )}
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {settings?.site_title || "TripMate"}. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
