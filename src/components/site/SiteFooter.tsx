import Link from "next/link";
import type { Route } from "next";
import { Facebook, Globe, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";

import Logo from "@/components/icons/Logo";
import type { SiteFooterColumn, SiteFooterSocial } from "@/lib/site-settings";

/**
 * Professional agency footer (§2.11): fully CMS-driven.
 * Columns, links, socials and copyright come from settings.site; sensible
 * defaults render when the agency has not configured them yet. Phone is
 * optional — it renders only when set.
 */
const DEFAULT_LINKS: { label: string; href: Route }[] = [
  { label: "Packages", href: "/packages" as Route },
  { label: "Visa Services", href: "/visa" as Route },
  { label: "Blog", href: "/blog" as Route },
  { label: "Customer Portal", href: "/account" as Route },
  { label: "About", href: "/about-us" as Route },
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
  const columns =
    footerColumns && footerColumns.length > 0
      ? footerColumns
      : [{ title: "Explore", links: DEFAULT_LINKS.map((l) => ({ label: l.label, href: l.href })) }];

  const socials =
    footerSocials && footerSocials.length > 0
      ? footerSocials
      : [
          { network: "facebook", href: "https://facebook.com" },
          { network: "instagram", href: "https://instagram.com" },
          { network: "youtube", href: "https://youtube.com" },
        ];

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        {/* Brand */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-primary">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-7 w-auto" />
              ) : (
                <Logo className="size-6" aria-hidden="true" />
              )}
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              {title}
            </span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {footerDescription ||
              "Hajj, Umrah, tours, flights and visa — one trusted agency for every journey."}
          </p>
          <ul className="flex items-center gap-1">
            {socials.map((social) => {
              const Icon = SOCIAL_ICONS[social.network.toLowerCase()] ?? Globe;
              return (
                <li key={`${social.network}-${social.href}`}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.network}
                    className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Configured link columns */}
        {columns.slice(0, 2).map((column) => (
          <nav key={column.title} aria-label={`Footer — ${column.title}`}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {column.title}
            </h2>
            <ul className="mt-4 space-y-1">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  {link.href.startsWith("/") && !link.href.startsWith("//") ? (
                    <Link
                      href={link.href as Route}
                      className="flex min-h-11 items-center rounded-md text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center rounded-md text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Contact — phone only when configured */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Contact
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {phone ? (
              <li>
                <a
                  href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                  className="flex min-h-11 items-start gap-2 text-foreground/85 transition-colors hover:text-foreground"
                >
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span dir="ltr">{phone}</span>
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a
                  href={`mailto:${email}`}
                  className="flex min-h-11 items-start gap-2 text-foreground/85 transition-colors hover:text-foreground"
                >
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {email}
                </a>
              </li>
            ) : null}
            {address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {address}
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row lg:px-8">
          <p>{copyright || `© ${title}. All rights reserved.`}</p>
          <p dir="ltr">Made with care in Bangladesh.</p>
        </div>
      </div>
    </footer>
  );
}
