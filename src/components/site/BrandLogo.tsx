/* eslint-disable @next/next/no-img-element -- brand lockups are admin-uploaded
   files of unknown dimensions; a plain img with object-contain is deliberate. */
import { cn } from "@/lib/utils";

/**
 * Brand lockup image with dark-mode handling (Follow-up 11).
 *
 * - When a dedicated dark-mode logo is configured, the two variants swap
 *   under the `.dark` class (class-based dark variant, see globals.css).
 * - Otherwise the light logo gets a small white plate in dark mode, so a
 *   dark-text lockup never disappears into a dark header or footer.
 *
 * Canonical render sizes live at the call sites: header ≈36px tall,
 * footer ≈40px, admin sidebar ≈32px — sized for a wide lockup of
 * roughly 4:1–6:1 (see the guidance in Settings → Brand).
 */
export function BrandLogo({
  logoUrl,
  logoDarkUrl,
  title,
  className,
}: {
  logoUrl: string;
  logoDarkUrl?: string;
  title: string;
  className?: string;
}) {
  if (logoDarkUrl) {
    return (
      <>
        <img src={logoUrl} alt={title} className={cn(className, "dark:hidden")} />
        <img src={logoDarkUrl} alt={title} className={cn(className, "hidden dark:block")} />
      </>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={title}
      className={cn(className, "dark:rounded-lg dark:bg-white dark:px-1.5 dark:py-1")}
    />
  );
}
