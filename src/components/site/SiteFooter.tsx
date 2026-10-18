import Link from "next/link";
import type { Route } from "next";
import {
  Award,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Twitter,
  Youtube,
} from "lucide-react";

import Logo from "@/components/icons/Logo";
import type { SiteFooterColumn, SiteFooterSocial } from "@/lib/site-settings";

const DEFAULT_LINKS: { label: string; href: Route }[] = [
  { label: "VIP Umrah Packages", href: "/packages" as Route },
  { label: "Hajj 2026 Registration", href: "/packages" as Route },
  { label: "Fast-Track Visa Desk", href: "/visa" as Route },
  { label: "Travel Journal & Guides", href: "/blog" as Route },
  { label: "Pilgrim Customer Portal", href: "/account" as Route },
  { label: "About Our Agency", href: "/about-us" as Route },
];

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  linkedin: Linkedin,
};

type SiteFooterProps = {
  title: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  footerDescription?: string | null;
  footerColumns?: SiteFooterColumn[];
  footerSocials?: SiteFooterSocial[];
  copyright?: string | null;
};

export function SiteFooter({
  title,
  logoUrl,
  phone,
  email,
  address,
  footerDescription,
  footerColumns,
  footerSocials,
  copyright,
}: SiteFooterProps) {
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, "") : "";

  const columns =
    footerColumns && footerColumns.length > 0
      ? footerColumns
      : [
          {
            title: "Journeys & Services",
            links: DEFAULT_LINKS.slice(0, 3).map((l) => ({ label: l.label, href: l.href })),
          },
          {
            title: "Agency & Support",
            links: DEFAULT_LINKS.slice(3).map((l) => ({ label: l.label, href: l.href })),
          },
        ];

  const socials =
    footerSocials && footerSocials.length > 0
      ? footerSocials
      : [
          { network: "facebook", href: "https://facebook.com" },
          { network: "instagram", href: "https://instagram.com" },
          { network: "youtube", href: "https://youtube.com" },
        ];

  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur-md">
      {/* Upper Footer Grid */}
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:px-8">
        {/* Brand & Mission */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-primary">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-8 w-auto" />
              ) : (
                <Logo className="size-7" aria-hidden="true" />
              )}
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              {title}
            </span>
          </Link>
          <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {footerDescription ||
              "Bangladesh's premier luxury travel & pilgrimage agency. Approved by the Ministry of Hajj & Umrah, Saudi Arabia. Dedicated to seamless spiritual excellence."}
          </p>

          {/* Accreditation Badges */}
          <div className="pt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <Award className="size-3 text-primary" />
              IATA Accredited
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <ShieldCheck className="size-3 text-emerald-500" />
              Ministry Approved
            </span>
          </div>

          {/* Social Icons */}
          <ul className="flex items-center gap-1 pt-2">
            {socials.map((social) => {
              const Icon = SOCIAL_ICONS[social.network.toLowerCase()] ?? Globe;
              return (
                <li key={`${social.network}-${social.href}`}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.network}
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Link Columns */}
        {columns.map((column) => (
          <nav key={column.title} aria-label={`Footer — ${column.title}`}>
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">
              {column.title}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  {link.href.startsWith("/") && !link.href.startsWith("//") ? (
                    <Link
                      href={link.href as Route}
                      className="inline-block text-xs text-muted-foreground transition-colors hover:text-primary hover:translate-x-0.5 transform duration-150"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-muted-foreground transition-colors hover:text-primary hover:translate-x-0.5 transform duration-150"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Coordinates & WhatsApp Button */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">
            Dhaka &amp; Makkah Offices
          </h2>
          <ul className="space-y-3 text-xs text-muted-foreground">
            {address ? (
              <li className="flex items-start gap-2.5 leading-relaxed">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{address}</span>
              </li>
            ) : null}
            {phone ? (
              <li>
                <a
                  href={`tel:${cleanPhone}`}
                  className="flex items-center gap-2.5 text-foreground font-medium transition-colors hover:text-primary"
                >
                  <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span dir="ltr">{phone}</span>
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2.5 transition-colors hover:text-primary"
                >
                  <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{email}</span>
                </a>
              </li>
            ) : null}
          </ul>

          {cleanPhone && (
            <div className="pt-2">
              <a
                href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-4 shadow-sm transition-all"
              >
                <MessageCircle className="size-4" />
                <span>24/7 WhatsApp Hotline</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Legal Band */}
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-6 text-[11px] text-muted-foreground sm:flex-row lg:px-8">
          <p>{copyright || `© 2026 ${title}. All rights reserved.`}</p>
          <div className="flex items-center gap-4">
            <Link href={"/terms" as Route} className="hover:text-foreground transition-colors">
              Terms &amp; Policies
            </Link>
            <span>•</span>
            <Link href={"/privacy" as Route} className="hover:text-foreground transition-colors">
              Privacy Statement
            </Link>
            <span>•</span>
            <span dir="ltr">Dhaka · Makkah · Madinah</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
