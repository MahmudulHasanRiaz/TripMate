# Admin v3 Redesign — Design Spec

Date: 2026-10-18
Status: Approved (user confirmed phased plan, admin-only Geist fonts, artifact density, colorful palette)

## Goal

Bring the design language of the Cloud-Artifact reference mockup
(`/Volumes/Netac SSD 512GB/downloads/TripMate Admin (interactive)-html/`) into the
production admin panel: more organized, compact, premium, modern and meaningfully
colorful — **without removing or degrading any functionality, option, field,
dialog or action**. Behavior-preserving restyle; every server action unchanged.

## Reference (learned design language)

Source files read: `assets/*.css` (28 KB, full token + component system) and
`App.dc.html` + `assets/*.js` (view structure, nav groups, sample data).

### Tokens (light / dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | `#F4F4F1` | `#0F1110` | app background |
| surface | `#FFFFFF` | `#171A19` | cards, sidebar, top bar |
| line | `#E8E8E4` | `#272B2A` | borders |
| ink | `#17171A` | `#F1F1EE` | primary text |
| muted | `#6B6B74` | `#9B9CA3` | secondary text |
| accent | `#0E6B5C` | `#4CC2A8` | primary (already our brand family) |
| accent-soft | `#E4F2EE` | `#143229` | active nav bg |
| hover | `#F0F0EC` | `#1E2221` | row/nav hover |

Colorful set (section accents, KPI tints, pills): `green #16A34A`, `blue #3B82F6`,
`amber #F59E0B`, `red #EF4444`, `violet #8B5CF6`, `cyan #06B6D4`, `pink #EC4899`,
`orange #F97316`. Pills: ok/pr/pe/rd/vi/cy/ca (tinted bg + same-hue text via
`color-mix`, light-dark aware).

### Typography

- Geist (400/500/600) + Geist Mono (numerals, `tabular-nums`) + Hind Siliguri /
  Noto Sans Bengali fallback. **Admin routes only** (loaded in admin layout).
- Base 13.5px, line-height 1.45; h1 20px; micro table headers 10.5px uppercase
  `letter-spacing .07em`.

### Density

208px sidebar; 32px desktop controls (buttons/inputs) with 40px+ bump on coarse
pointers; 36px table rows; card radius 10px dense; control radius 7px; compact
section gaps (10–14px).

### Component vocabulary (target)

Colored grouped sidebar (per-section accent + active glow inset ring), KPI cards
(icon chip top-right, per-card accent `--k`, 9→0% gradient tint, hover lift),
cards with subtle dual shadow `0 1px 2px rgba(16,24,20,.04), 0 12px 28px -18px
rgba(16,24,20,.14)` and accent square before section titles, dense tables
(uppercase micro headers, hover row tint, tinted money columns: Cost orange /
Revenue green), tabs (active = primary fill), chips, status pills with dot,
switches 32×18, sticky settings nav, skeleton shimmer, empty states, toast (ink
bg + green left border), entrance stagger (`rise`, 55ms), press ripple,
`prefers-reduced-motion` kills all of it. Background: two very subtle radial
glows (cyan 10%, violet 11%) top corners.

## Decisions (user-confirmed)

1. **Phased execution** — 3 phases, each: implement → user review in dev server
   → commit. No functionality loss allowed at any phase.
2. **Fonts**: Geist + Geist Mono inside admin only. Public site keeps
   Inter + Fraunces untouched.
3. **Density**: artifact density exactly (compact controls, 13.5px base), with
   coarse-pointer 40px bump.
4. **Palette**: admin gets the artifact palette as its own fixed scope. The
   public brand theme + customizer is unaffected (verified: brand theme CSS is
   injected only in `src/app/(public)/layout.tsx`).
5. Keep our nav groups and every menu item/permission as-is; adopt only the
   visual organization (grouped, colored, dense).

## Scoping strategy (critical)

Public and admin share `globals.css` tokens and some `components/ui/*` files.
Verified usage (exact-import grep):

- Admin-only UI files (safe to edit directly): `sidebar.tsx`, `toaster.tsx`,
  `tabs.tsx`, `card.tsx` (0 public imports), `table.tsx`, `dropdown-menu.tsx`,
  `avatar.tsx`.
- Shared with public (edit via **admin-scoped overrides only**): `button.tsx`
  (3 public files), `badge.tsx` (2), `dialog.tsx` (3), inputs/select/switch/
  textarea/skeleton (public forms).

Mechanism:

- New `src/app/admin/admin.css`, imported by `src/app/admin/layout.tsx`:
  - token overrides scoped to `.admin-root` (wrapper div in admin layout) and
    `body[data-admin]` (set via `useEffect` in AdminShell so Radix portals —
    dialogs/sheets/toasts mounted on `document.body` — inherit admin tokens);
  - `.dark` variants for the same scopes;
  - density overrides for `:where(button, input, select, textarea)` and `tr[data-row]`;
  - "component skin" overrides for shared components (button/badge/dialog/input)
    using class selectors (`.admin-root .bg-primary {...}` etc.) with one extra
    specificity level so the public is untouched;
  - motion keyframes (rise/shimmer/pulse/ripple), reduced-motion guards.
- Admin layout adds Geist variable classes + `.admin-root` wrapper.
- `AdminShell.tsx` restyled directly (admin-only file): colored grouped nav,
  active treatment, user card pinned bottom of rail.

## Phase plan

### Phase 1 — Foundation (this phase)

- `admin.css` (tokens light+dark, density, shared-component skin, motion).
- Geist fonts in admin layout; `.admin-root` wrapper + `body[data-admin]` effect.
- `components/ui/sidebar.tsx` restyle (grouped labels, item states, rail width).
- `AdminShell.tsx`: colored nav (data-driven accent per group/item), user card.
- `card.tsx` (admin-only) premium shadow/radius; `tabs.tsx` active fill.
- Result: every admin page instantly on the new visual system.
- Verify: typecheck, lint, dev-server walk (dashboard/orders/leads/settings,
  light+dark, desktop+mobile width), contrast spot-check, functional smoke.

### Phase 2 — Hero screens

Dashboard (KPI cards w/ per-card accent + icon chip, trend/bars restyle, section
headers), Leads (board + list), Orders (board + list + detail), Quotations,
Payments, Services, Expenses. Each keeps every action/filter/column.

### Phase 3 — Consistency sweep

Catalog (5 sections), Content, Media, Landing pages + builder, Settings (tabs +
sticky nav), Tracking, Users, Testimonials, Help, Email templates, Reset.

## Guardrails

- No route, menu item, permission, button, field, dialog, column or action is
  removed; server actions and data flow untouched.
- Public site unaffected (verify after each phase: public home + visa + booking
  pages render identically).
- a11y: visible `:focus-visible` retained, contrast ≥ 4.5:1 for text pairs in
  both themes (spot-check with the artifact's calibrated pairs), 40px touch
  targets on coarse pointers, `prefers-reduced-motion` respected.
- Dark mode parity for every new token.

## Verification per phase

1. `npm run typecheck` + `npm run lint` clean.
2. Dev-server E2E walkthrough of touched screens (light+dark, desktop+mobile).
3. Functional smoke: create/edit/delete on one representative flow per area.
4. Public site spot-check (home, visa, booking form) unchanged.
5. Commit per phase with a scope summary.
