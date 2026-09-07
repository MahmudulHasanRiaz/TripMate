import Link from "next/link";
import type { Route } from "next";
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";

import Logo from "@/components/icons/Logo";

/**
 * Footer quick links mirror the header nav for now (settings-driven later).
 * Like the header, About targets the seeded about-us page under /p/{slug} —
 * that is the canonical URL for the static page set (Task 12).
 */
const QUICK_LINKS: { label: string; href: Route }[] = [
  { label: "Packages", href: "/packages" as Route },
  { label: "Visa Services", href: "/visa" as Route },
  { label: "Blog", href: "/blog" as Route },
  { label: "Customer Portal", href: "/account" as Route },
  { label: "About", href: "/p/about-us" as Route },
];

/** Placeholder socials — real profile URLs arrive with a settings drive. */
const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com", Icon: Facebook },
  { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
];

type SiteFooterProps = {
  title: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
};

/**
 * Server-rendered footer: brand + quick links + settings-driven contact info +
 * an inert newsletter placeholder (form logic is Plan 6). No client JS here —
 * the theme toggle lives only in the header island, so this footer stays
 * noscript-safe and server streams it without a hydration island.
 */
export function SiteFooter({ title, logoUrl, phone, email, address }: SiteFooterProps) {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
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
            Hajj, Umrah, tours, flights and visa — one trusted agency for the
            Bengali traveller.
          </p>
          <ul className="flex items-center gap-1">
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Icon className="size-5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Explore */}
        <nav aria-label="Footer">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Explore
          </h2>
          <ul className="mt-4 space-y-1">
            {QUICK_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-11 items-center rounded-md text-sm text-foreground/80 transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
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

        {/* Newsletter subscription */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Stay in touch
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            New packages and travel guidance, a few times a month.
          </p>
          <div className="mt-3 flex gap-2">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              disabled
              className="h-11 shrink-0 cursor-not-allowed rounded-md bg-primary/60 px-4 text-sm font-semibold text-primary-foreground"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row lg:px-8">
          <p>© {title}. All rights reserved.</p>
          <p dir="ltr">Made with care in Bangladesh.</p>
        </div>
      </div>
    </footer>
  );
}
