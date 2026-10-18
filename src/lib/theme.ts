/**
 * Theme bootstrapping shared between the pre-paint inline script (root layout)
 * and the ThemeToggle island. Keeping the key + script here gives one source of
 * truth for the localStorage contract.
 */
export const THEME_STORAGE_KEY = "tripmate-theme";

/**
 * Runs synchronously in the initial HTML, BEFORE first paint, so a returning
 * dark-mode visitor never sees a light flash (and vice-versa). Reads the saved
 * choice; falls back to the OS `prefers-color-scheme` when there is none. Wrapped
 * in try/catch because localStorage can throw (blocked third-party storage).
 *
 * `dangerouslySetInnerHTML` is intentionally NOT used: this string is injected
 * via `next/script` (strategy="beforeInteractive"), which is the lint-clean
 * documented way to inline a script in the root layout.
 */
export const themeInitScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}if(typeof window!=="undefined"){window.addEventListener("unhandledrejection",function(e){if(e&&e.reason&&(String(e.reason.message||e.reason).indexOf("Viewport size changed")!==-1||String(e.reason.message||e.reason).indexOf("Transition was aborted")!==-1)){e.preventDefault();}});}})();`;
