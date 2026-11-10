/**
 * PlaneLoader — the project's single loading face (owner spec, 2026-11-10):
 * an outline paper plane flying a smooth circular loop in the CENTRE of
 * the screen, in the style of the classic travel-site loader. No text, no
 * spinner. It shows exactly as long as the load takes — a long load loops
 * it longer, a short one cuts it short.
 *
 * Geometry rules (owner correction, 2026-11-10 — the first version swept
 * in from off-stage and out again, small and sideways, which read as
 * broken): the flight path is a CLOSED loop around the centre, so the
 * plane is on screen, centred and full-size for 100% of the loop, on a
 * phone and on a desktop alike. The motion path rides in the
 * animateMotion `path` attribute (no mpath reference — mobile Safari is
 * unreliable with mpath, which contributed to the glitch).
 *
 * The plane is drawn with `currentColor`, so it always flies in the ACTIVE
 * THEME's branding colour: wrap it in a `text-primary` context (the default
 * here) and it follows whatever primary the site admin configured — theme
 * preset or fully custom brand colour — on the public site, in the customer
 * portal and in the admin shell alike. Never hardcode a colour here.
 *
 * Under prefers-reduced-motion the flying group is hidden and a static
 * centred plane renders instead.
 */
export default function PlaneLoader({
  label = "Loading",
  fullScreen = false,
  className = "",
}: {
  /** Screen-reader announcement; nothing is shown visually. */
  label?: string;
  /** Cover the whole viewport (root-level loads) instead of the parent box. */
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? `fixed inset-0 z-[100] flex items-center justify-center bg-background text-primary ${className}`
          : `flex min-h-[40vh] w-full items-center justify-center text-primary ${className}`
      }
    >
      <span className="sr-only">{label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 240 200"
        className="h-auto w-[min(272px,68vw)]"
        fill="none"
      >
        {/* Flying plane (hidden for reduced-motion users). The loop is a
            circle around the stage centre (120,100), r=54; the plane
            glyph is ~72 units long, so plane + loop together span the
            middle of the stage and never leave it. rotate="auto" keeps
            the nose on the tangent, banking through the loop. */}
        <g className="motion-reduce:hidden">
          <g>
            <animateMotion
              dur="2.2s"
              repeatCount="indefinite"
              rotate="auto"
              path="M 66 100 A 54 54 0 1 1 174 100 A 54 54 0 1 1 66 100 Z"
            />
            <g transform="translate(-24,-24) scale(1.5)">
              <path
                d="M46 24 L5 5 L15 24 L5 43 Z"
                fill="currentColor"
                fillOpacity="0.12"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d="M46 24 L15 24"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M15 24 L21 35"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>

        {/* Static plane for prefers-reduced-motion. */}
        <g className="hidden motion-reduce:block" transform="translate(120,100)">
          <g transform="rotate(-18) scale(1.5) translate(-24,-24)">
            <path
              d="M46 24 L5 5 L15 24 L5 43 Z"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M46 24 L15 24"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M15 24 L21 35"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
