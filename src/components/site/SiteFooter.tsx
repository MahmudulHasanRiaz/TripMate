import Link from "next/link";
import type { Route } from "next";
import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";
import { WhatsAppIcon } from "./brand-icons";
import { BrandLogo } from "./BrandLogo";

import Logo from "@/components/icons/Logo";
import { AccreditationsShowcase } from "./AccreditationsShowcase";
import type {
  SiteAccreditation,
  SiteFooterColumn,
  SiteFooterSocial,
} from "@/lib/site-settings";

const DEFAULT_LINKS: { label: string; href: Route }[] = [
  // Category-filtered landings (FU-32): these labels promise Umrah/Hajj
  // lists, so they carry the ?cat= filter instead of the bare index.
  { label: "VIP Umrah Packages", href: "/packages?cat=umrah" as Route },
  { label: "Hajj 2026 Registration", href: "/packages?cat=hajj" as Route },
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
  /** Optional light/white lockup for dark mode (Follow-up 11). */
  logoDarkUrl?: string;
  /** Brand lockup mode (settings) — same contract as the header. */
  logoDisplay?: "icon-name" | "logo-only";
  /** Accreditation badges (settings) — real organization logos, rendered
   *  as the footer strip. Empty = no strip (never fake claims). */
  accreditations?: SiteAccreditation[];
  /** Credentials-section heading/description (settings, Follow-up 17). */
  accreditationHeading?: string;
  accreditationDescription?: string;
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
  logoDarkUrl,
  logoDisplay,
  accreditations,
  accreditationHeading,
  accreditationDescription,
  phone,
  email,
  address,
  footerDescription,
  footerColumns,
  footerSocials,
  copyright,
}: SiteFooterProps) {
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, "") : "";
  const logoOnly = logoDisplay === "logo-only" && Boolean(logoUrl);

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

  // FU-28: configured socials ONLY. The old fallback linked the icons to
  // the platforms' homepages (facebook.com / instagram.com / youtube.com)
  // whenever an admin had not configured real profiles — dead-end links
  // dressed as the business's own pages. Unconfigured = no icons
  // (blank-is-invisible), never a generic substitute.
  const socials = footerSocials ?? [];

  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur-md">
      {/* Credentials section — settings-driven trust block (Follow-up 09 §5;
          band Follow-up 15; premium section Follow-up 17; mobile swipe
          carousel + compact cards Follow-up 20, rendered by
          AccreditationsShowcase). Each credential renders the way its kind
          reads best: a REAL organization logo on a uniform plate (64px
          mobile / 88px up) when one is configured, otherwise the same
          plate carrying a consistent shield mark (a licence is information,
          not a logo — never dressed up as one). An optional agency-supplied
          details/verification link renders as a plain "View details" link;
          the section NEVER auto-claims a "verified" status. Heading and
          description are settings text; nothing renders when the agency
          configured no accreditations. */}
      {accreditations && accreditations.length > 0 ? (
        <div className="border-b border-border/70 bg-muted/40">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:py-12 lg:px-8">
            <p className="text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">
              Licensed &amp; Accredited
            </p>
            <h2 className="mt-3 text-center font-display text-[28px] font-bold leading-tight tracking-tight text-foreground">
              {accreditationHeading || "Trusted & Accredited"}
            </h2>
            {accreditationDescription ? (
              <p className="mx-auto mt-2.5 max-w-2xl text-center text-[15px] leading-relaxed text-muted-foreground">
                {accreditationDescription}
              </p>
            ) : null}
            <AccreditationsShowcase badges={accreditations} />
          </div>
        </div>
      ) : null}

      {/* Upper Footer Grid */}
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:px-8">
        {/* Brand & Mission */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            {logoOnly ? (
              <BrandLogo
                logoUrl={logoUrl}
                logoDarkUrl={logoDarkUrl}
                title={title}
                className="h-10 w-auto max-w-[230px] object-contain"
              />
            ) : (
              <>
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
              </>
            )}
          </Link>
          <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {footerDescription ||
              "Bangladesh's premier luxury travel & pilgrimage agency. Approved by the Ministry of Hajj & Umrah, Saudi Arabia. Dedicated to seamless spiritual excellence."}
          </p>

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
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-10 px-4 shadow-sm transition-all"
              >
                <WhatsAppIcon className="size-4" />
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
          {/* Developer credit — deliberately HARDCODED (owner order,
              FU-26): unlike the copyright line above it is NOT a setting
              and cannot be edited or removed from the admin. */}
          <p className="inline-flex items-center gap-1.5">
            Built with
            <a
              href="https://commercians.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold tracking-wide text-foreground/80 transition-colors hover:text-primary"
            >
              COMMERCIANS
            </a>
          </p>
          <div className="flex items-center gap-4">
            <Link href={"/terms-of-service" as Route} className="hover:text-foreground transition-colors">
              Terms &amp; Policies
            </Link>
            <span>•</span>
            <Link href={"/privacy-policy" as Route} className="hover:text-foreground transition-colors">
              Privacy Statement
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
