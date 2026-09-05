# TripMate v2 — UI Design System Spec

**Date:** 2026-09-05
**Status:** Approved (direction) — this document is the single source of truth for the UI.
**Audience:** Any designer or developer. Reading ONLY this document must be enough to redesign the entire UI (public site, landing pages, admin) or build any new component without asking questions.

Companion: `2026-09-05-tripmate-v2-design.md` (architecture). Architecture is fixed; visual design within THIS document's system may evolve.

---

## 1. Design Direction

**Positioning:** High-end travel agency for Bengali audience — Hajj/Umrah spiritual journeys + premium tours. Must feel: trustworthy, premium, calm, fast. NOT: playful-backpacker, corporate-banking-cold, or generic-SaaS.

**Three design voices under one system:**
1. **Public site** — editorial, spacious, imagery-led. Feels like a premium magazine, not a dashboard.
2. **Landing pages** — conversion-focused: high contrast, big type, urgency elements (countdown), single goal per page. Same tokens, louder usage.
3. **Admin panel** — dense, efficient, quiet. shadcn/ui defaults. Zero decoration that doesn't inform.

**One token system, three intensity levels.** Landing pages and admin never introduce new colors or fonts — they use the same tokens with different emphasis.

---

## 2. Design Tokens (single source: `globals.css` via Tailwind v4 `@theme`)

All tokens live in CSS variables (`:root` + `.dark`), consumed via Tailwind v4 semantic classes. NO hardcoded hex values in components — lint against `#[0-9a-f]{3,8}` in className strings.

### 2.1 Color

Semantic scale (light / dark), baseline palette — a designer may restyle VALUES but must keep semantic NAMES and contrast ratios:

| Token | Light baseline | Dark baseline | Usage |
|---|---|---|---|
| `--background` | warm white `#FAF9F7` | `#0C0F14` | page base |
| `--foreground` | `#1A1D24` | `#EDEEF2` | body text |
| `--primary` | deep teal `#0E5E5A` | `#2AA79F` | brand, CTAs, links |
| `--primary-foreground` | white | `#06231F` | text on primary |
| `--secondary` | sand `#F0EBE2` | `#1B2028` | section alternates, chips |
| `--accent` | gold `#C9A24B` | `#E3BE6A` | ratings, highlights, spiritual accent — SPARINGLY, DECORATIVE-ONLY |
| `--accent-text` | deep gold `hsl(40 45% 27%)` | `#E3BE6A` | any accent-colored TEXT — gold itself fails AA as text (2.3:1), so text always uses this token |
| `--success` / `--warning` / `--info` (+foregrounds) | green `hsl(142 72% 29%)` / amber `hsl(32 95% 38%)` / blue `hsl(217 91% 55%)` | lighter variants | status badges: confirmed/verified/approved, submitted/negotiating, in_review/quoted |
| `--muted` / `--muted-foreground` | `#EEECE8` / `#6B6F78` | `#171B22` / `#9BA1AC` | meta text, placeholders |
| `--destructive` | `#B3261E` | `#F2B8B5` | errors, destructive actions |
| `--card` / `--border` | `#FFFFFF` / `#E5E2DC` | `#12161D` / `#232935` | surfaces |

Rules:
- Primary CTA = only primary color. One primary CTA per viewport (public + landing).
- Accent gold reserved: ratings, award badges, Hajj/Umrah spiritual moments. Never for buttons. Gold is decorative-only (fills, icons, stars) — accent-colored TEXT always uses `--accent-text`.
- Contrast: all text ≥ WCAG AA (4.5:1 body, 3:1 large). Buttons AA on both themes. Input boundaries (`--input`) ≥ 3:1 against background (WCAG 1.4.11) — `--input` is darker than `--border` for this reason.
- Status colors (`success`/`warning`/`info`) exist ONLY as badges/chips with their paired foreground — never introduced ad hoc.
- Dark mode = full support, `prefers-color-scheme` + manual toggle in footer.

### 2.2 Typography

| Token | Family | Role |
|---|---|---|
| `--font-display` | Fraunces (or Playfair Display) — serif, optical sizing | H1–H3, hero, section titles |
| `--font-body` | Inter (or PT Sans upgrade) — sans | body, UI, forms |
| `--font-mono` | system stack (ui-monospace/SFMono/Menlo/Consolas) — NO webfont download | code, order numbers, txn ids |

- Load via `next/font` (self-hosted, swap). NEVER Google Fonts `<link>`.
- Scale (fluid, clamp-based): `text-xs 12` / `sm 14` / `base 16` / `lg 18` / `xl 20` / `2xl 24` / `3xl 30` / `4xl 36` / hero `clamp(2.5rem, 6vw, 4.5rem)`.
- Line-height: body 1.6, headings 1.15. Display letter-spacing slightly tight (-0.02em).
- Bengali (future i18n): body stack already includes `Noto Sans Bengali`/`Hind Siliguri` fallbacks (shipped with Plan 1) — Bangla glyphs render correctly the moment content needs them.

### 2.3 Space, Radius, Elevation

- Spacing: 4px base grid; Tailwind default scale. Section padding: `py-16` mobile / `py-24` desktop. Container max-w `1400px`, gutters `px-4`/`lg:px-8`.
- Radius: `--radius: 12px` cards/images; buttons `8px`; pills full. Landing hero images may go `16px`.
- Shadows: 2 levels only — `--shadow-sm` (cards, subtle) and `--shadow-lg` (hover lift, modals). No glow/neon.
- Borders preferred over shadows for structure (calm, editorial).

### 2.4 Motion

- Durations: micro 150ms / standard 250ms / emphasis 400ms (literal ms values in classes). Easing: `--ease-out-quint` token (`cubic-bezier(0.22, 1, 0.36, 1)`) defined in `@theme` — always use the `ease-out-quint` utility, never hand-rolled beziers.
- Use React 19.2 View Transitions for route-level page changes (public site) — wired in Plan 3's route shell.
- Hover states: image scale 1.02 (300ms), card lift 2px + shadow-sm→lg, underline reveal on links. Nothing else moves on hover.
- Scroll reveals: fade+8px rise once, 400ms, stagger 60ms between siblings. Respect `prefers-reduced-motion` — ALL animation off.
- Landing countdown: number change = flip or fade 200ms. No bouncing.

### 2.5 Imagery

- Aspect standards: hero `21:9` desktop / `4:3` mobile; package card `4:3`; gallery `1:1` grid; blog card `3:2`.
- Treatment: authentic photography, light film-grade. Always `next/image` with explicit sizes. LCP image = priority, no blur placeholder on hero (blur = placeholder for below-fold only).
- Hajj/Umrah imagery: reverent — Kaaba/Masjid an-Nabawi shots allowed, no people's faces cropped weirdly. Text over sacred imagery ONLY behind a ≥40% dark scrim keeping AA contrast; hero templates default to non-sacred imagery when a headline sits directly on the image.

---

## 3. Public Site Components

Inventory (all in `components/site/`, built on `components/ui/` primitives):

| Component | Notes |
|---|---|
| `SiteHeader` | sticky, blur backdrop on scroll; logo, nav (Packages, Services, Blog, About, Contact CTA), mobile sheet. Shrinks height on scroll. |
| `SiteFooter` | 4-col: brand+social, quick links, support links, newsletter mini-form + theme toggle. Links driven by settings. |
| `HeroSection` | full-bleed image/video + display headline + sub + 1 primary CTA. Optional trust badges row (years, clients, rating). |
| `ServiceGrid` | 6 service cards — icon, name, one-line promise; click → listing or redirect (opens new tab, marked with external icon). |
| `PackageCard` | image, destination chip, title, duration+rating meta, price (৳, from-label), hover lift. Whole card = link. |
| `PackageFilters` | URL-state driven (server): search input, category select, price slider. Loading = optimistic + skeleton grid. |
| `PackageDetailLayout` | gallery, itinerary accordion (day-by-day), inclusions/exclusions 2-col check/cross lists, sticky booking sidebar (price, date picker, CTA) on desktop, bottom bar on mobile. |
| `InquiryForm` | listing `form_config`-driven dynamic fields; Zod; success = inline confirmation card. |
| `BlogCard` / `PostLayout` | standard; markdown body, prose-custom styles, TOC on wide screens. |
| `SectionHeading` | kicker (uppercase, tracking-wide, primary) + display title + optional lead. Reused everywhere — consistency anchor. |
| `TestimonialsSection` | quote + name + trip, quiet card row or embla slider (autoplay off). |
| `StatsBand` | 4 numbers band on secondary bg. |
| `CTASection` | closing band: headline + primary CTA + phone number (Bengali market: phone CTA mandatory). |
| `FaqAccordion` | reused on FAQ page + LP section. |
| `ContactSection` | form + agency info + map embed (settings-driven). |

**Page composition rules:** every public page = Header → Hero/Title band → content sections → CTASection → Footer. Alternating background (`background`/`secondary`) between sections. Max 2 font sizes change per scroll screen.

---

## 4. Landing Page Section Templates (design contract)

Each template = one render component, admin-configurable content, SAME component in builder preview and public page.

| Template | Content config | Design rules |
|---|---|---|
| `hero` | image/video, eyebrow, headline, sub, CTA | ≥70vh, headline display-xl, single CTA, optional trust row |
| `benefits` | 3–6 items (icon, title, text) | icon in primary-tinted circle, grid 3-col |
| `package-showcase` | listing ids | renders PackageCard grid (catalog embed) |
| `gallery` | image list | 1:1 masonry-lite, lightbox island |
| `testimonials` | items | as public TestimonialsSection |
| `faq` | q/a list | as FaqAccordion |
| `countdown` | target date, label | big mono numerals, gold accent, urgency |
| `sticky-cta` | text, phone, button | mobile bottom bar + desktop bottom-right pill; appears after 40% scroll |
| `whatsapp-cta` | phone, prefilled message | wa.me deep-link button — primary Bengali-market conversion channel; may pair with sticky-cta |
| `form` | form_config, heading, side image | 2-col desktop (pitch + form), form card elevated; public buttons ≥ 44px height (h-11) |
| `thank-you-redirect` | url, delay | full-screen confirmation then redirect |

Landing page = NO site header/footer. Optional minimal footer (logo + contact). Goal: one action per page, zero navigation escape.

---

## 5. Admin Panel Design

- Base: shadcn/ui defaults, current components reused. The sidebar shell is rebuilt in Plan 2 from shadcn's sidebar primitive, restyled by tokens only (the old Firebase-era implementation is deleted with that code).
- Density: table rows 44–52px, page padding `p-6`, section gaps `gap-6`.
- Patterns (mandatory, all admin modules identical):
  - **List page** = filter bar + table (row actions dropdown) + pagination. Bulk-select where relevant.
  - **Detail page** = 2-col: main info (left, 2/3) + status/actions card (right, 1/3 sticky).
  - **Status badges** = consistent semantic set: neutral gray (pending/new), blue (in_review/quoted), green (confirmed/verified/approved), red (cancelled/rejected/lost), amber (submitted/negotiating).
  - **Kanban board** (leads, orders): columns by status, card = name/phone/value/age, drag = status action (server action, optimistic).
  - **Forms** = react-hook-form + shadcn Form; dirty-state guard on leave; destructive = AlertDialog confirm with typed confirmation for danger zone only.
  - **Empty states** = icon + one-line + primary action button. No naked empty tables.
- Dashboard: KPI cards (4-up) → P&L chart + category expense bars → queues (pending payments, unassigned leads).
- Loading: skeletons everywhere server data lands; optimistic UI for kanban/status actions.
- All admin strings English. `font-body` only in admin (no display serif) — work, not magazine.

---

## 6. Customer Portal Design

- Quieter than public: card-based order list, status timeline (vertical, dots + dates), payment receipt upload dropzone, documents grid with file-type icons.
- Reuses admin primitives (tables, badges, dialogs) with `site` header/footer wrapper.

---

## 7. Accessibility (non-negotiable)

- Semantic HTML landmarks; skip-to-content link (Plan 3's public shell task owns it; the global `:focus-visible` ring ships with Plan 1's token layer).
- All interactive: visible focus ring (2px primary offset 2px), keyboard complete (forms, kanban has move-to-status menu, lightbox esc/arrows).
- Color never sole information carrier (status = color + label).
- Alt text enforced in media library (upload form requires alt).
- Touch targets ≥ 44px. Live regions for form success/errors.
- `prefers-reduced-motion` honored globally.

---

## 8. Performance Budget (design's part)

- Above-fold: 2 webfont families max — display 2 weights + body 2 weights, pinned in `next/font` (mono is a system stack, not a webfont); hero image ≤ 200KB (avif/webp via next/image).
- No layout shift: all media has aspect-ratio boxes; font-display swap + size-adjust fallbacks.
- Client JS per public page target < 90KB gzipped islands (forms, gallery, mobile nav only).
- Icons: lucide-react, tree-shaken, no icon fonts.

---

## 9. Redesign Protocol (for future designers)

1. Change ONLY token VALUES (`:root`/`.dark` color vars, radius, shadows, motion easing, font families) — never token NAMES. Full token groups: colors (incl. success/warning/info and accent-text), radius, shadows, easing, fonts. The entire site restyles — this is the intentional redesign lever.
2. Component structure/semantics (this doc §3–6 inventories + rules) stays unless the architecture spec changes.
3. Any new component must: use existing tokens, pass a11y §7, fit a listed page context, and get documented here (inventory row) in the same PR.
4. New section template for LP builder = new row in §4 table + render component + admin picker entry.
5. Verify both themes + mobile 375px + reduced-motion + AA contrast on all text pairs (4.5:1 body, 3:1 large/UI boundaries) before merge.

---

## 10. Out of Scope (design)

- Bengali/Arabic RTL layouts (i18n phase later — tokens ready, layouts not).
- Marketing illustrations/brand mascot (photography-first; add later if brand team wants).
- Email template visual design (react-email plain-branded baseline; restyle independently anytime — email HTML is isolated).
