# Plan — preset rename + package detail polish + modern gallery (branch public-ui-v1)

User ask (translated):
1. Rename the "flightblu" color template to something else.
2. Make the package detail page UI 100% dynamic — friendlier, more polish.
3. Add a unique/modern idea to the gallery image section.
4. Review branch, merge to main, push if ready.

## Task 1 — Preset rename: `flightblu` → `azure`, name "Flight Blu" → "Azure Horizon"
- `src/modules/settings/theme.ts`
  - `ThemeTemplateKey` union: replace `"flightblu"` with `"azure"`
  - Template object key `azure:`, `id: "azure"`, `name: "Azure Horizon"` (colors unchanged — brand palette stays)
  - `DEFAULT_THEME_SETTINGS.template = "azure"`
  - `buildThemeCssVariables` fallback → `"azure"`
  - Export `resolveThemeTemplateKey()`: maps legacy `"flightblu"` → `"azure"` so DB rows saved with the old key keep the identical brand look.
- `src/modules/settings/theme-service.ts`: resolve legacy key in `getThemeSettings` (unknown-key fallback unchanged).
- `src/modules/settings/site-settings-actions.ts`: zod enum swaps key; legacy `"flightblu"` literal transformed to `"azure"` (cached old admin JS keeps working).
- `src/components/admin/ThemeCustomizer.tsx`: no change (renders from THEME_TEMPLATES keys).
- `tests/theme-templates.test.ts`: update key/name assertions.
- No colors change → contrast tests still pass.

## Task 2 — Package detail: 100% dynamic + polish
- `catalog-data.ts`: add `isFeatured` to `PackageDetailData` projection (unrendered schema field → dynamic hero badge).
- `PackageHero.tsx`: Featured badge; "+N photos" pill anchors to `#package-gallery`; base height floor for gradient/no-cover cases.
- `page.tsx`: gallery section anchor id + scroll margin; "You may also like" gets eyebrow eyebrow treatment.
- `PackageContent.tsx`: shared richer section headings (accent bar/kicker + counts), summary lede, itinerary timeline rail (dot markers), inclusion/exclusion cards + counts. All sections remain conditional on data (dynamic).
- `PackageSidebar.tsx`: minor consistency polish only (no behavior change).

## Task 3 — Gallery: unique + modern (shared component, 3 consumers)
- Rewrite `src/components/site/Gallery.tsx`, keep props API (`images`, `className`).
- Grid → adaptive mosaic: pattern changes by image count (1/2/3/4/5+), featured first tile, dense flow; count > 6 → cap visible tiles with "+N more" overlay tile.
- Lightbox → photo theater: larger stage, thumbnail filmstrip (auto-scroll active thumb), counter, captions, arrow keys, wrapped prev/next.

## Task 4 — Verify, merge, push
- `npx vitest run tests/theme-templates.test.ts` (+ full test suite if fast)
- `npx tsc --noEmit`, eslint on changed files, `next build` if env allows
- Self-review diff against design-review rubric; token-only colors
- Commit on `public-ui-v1`, merge to `main` (follow repo's merge style), push both.
