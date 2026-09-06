/**
 * Safe client-side extraction of Meta Pixel cookies (_fbp and _fbc).
 * Pure and guarded against SSR / non-browser environments.
 */
export function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined" || !document.cookie) {
    return {};
  }

  const cookies = document.cookie.split(";");
  let fbp: string | undefined;
  let fbc: string | undefined;

  for (const raw of cookies) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("_fbp=")) {
      fbp = decodeURIComponent(trimmed.slice(5).trim());
    } else if (trimmed.startsWith("_fbc=")) {
      fbc = decodeURIComponent(trimmed.slice(5).trim());
    }
  }

  const result: { fbp?: string; fbc?: string } = {};
  if (fbp) result.fbp = fbp;
  if (fbc) result.fbc = fbc;
  return result;
}
