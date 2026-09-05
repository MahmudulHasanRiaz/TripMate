import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768
const mediaQuery = () => `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// useSyncExternalStore is the hydration-safe way to track a media query:
// the server and first client render both use getServerSnapshot (false), and
// once hydrated React subscribes and re-renders if the real viewport is
// narrow — no setState-in-effect, no hydration mismatch.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(mediaQuery())
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(mediaQuery()).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
