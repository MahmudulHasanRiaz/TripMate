/**
 * PlaneLoader — the project's single loading face (owner spec, 2026-11-10):
 * an outline paper plane flying a smooth curved path on a ~2.4s loop, in
 * the style of the classic travel-site loader. No text, no spinner.
 *
 * The plane is drawn with `currentColor`, so it always flies in the ACTIVE
 * THEME's branding colour: wrap it in a `text-primary` context (the default
 * here) and it follows whatever primary the site admin configured — theme
 * preset or fully custom brand colour — on the public site, in the customer
 * portal and in the admin shell alike. Never hardcode a colour here.
 *
 * Motion: SMIL animateMotion along an invisible swoop path with
 * rotate="auto" so the plane banks into the curve. Under
 * prefers-reduced-motion the flying group is hidden and a static centred
 * plane renders instead.
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
        viewBox="0 0 340 210"
        className="h-auto w-[min(340px,72vw)]"
        fill="none"
      >
        <defs>
          {/* Swoop: enter low-left, climb, dip through the middle, rise out
              top-right — one smooth pass, looped. */}
          <path
            id="plane-loader-path"
            d="M -40 158 C 55 66, 118 196, 182 108 C 232 40, 306 84, 384 52"
          />
        </defs>

        {/* Flying plane (hidden for reduced-motion users). */}
        <g className="motion-reduce:hidden">
          <g>
            <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
              <mpath href="#plane-loader-path" />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.86;1"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <g transform="translate(-24,-24) scale(1.35)">
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
        <g className="hidden motion-reduce:block" transform="translate(146,81)">
          <g transform="rotate(-18 24 24)">
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
