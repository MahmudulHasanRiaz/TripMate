/**
 * Keyboard / screen-reader bypass to the main content landmark. Rendered as
 * the very first element of the (public) layout (and the root not-found), so
 * the first Tab from the address bar reaches it before any nav link. Visually
 * hidden until it receives keyboard focus, per WCAG 2.4.1.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary-foreground"
    >
      Skip to content
    </a>
  );
}
