import "server-only";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Keys the app is allowed to write into .env. Everything else is boot-frozen
 * and never writable from application code. The boot-frozen set includes
 * DATABASE_URL, APP_URL, NODE_ENV and AUTH_SECRET:
 *  - Keeping DATABASE_URL/APP_URL unwritable is what stops the setup wizard (or
 *    a compromised session) from redirecting the app's own connection string.
 *  - AUTH_SECRET is read once by better-auth at boot (src/lib/auth.ts). A
 *    mid-run rewrite would only take effect after a restart and would
 *    invalidate every live session in between, so it is unwritable too — the
 *    operator sets it in .env before the first boot.
 */
export const ENV_WRITABLE_KEYS = [
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",
  "STORAGE_DRIVER",
  "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME", "R2_PUBLIC_URL",
  "META_PIXEL_ID", "META_CAPI_ACCESS_TOKEN", "META_CAPI_TEST_CODE",
] as const;

const ENV_PATH = resolve(process.cwd(), ".env");

/** Parse dotenv text into a key→value map. Comments and blank lines are ignored. */
export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}

/**
 * Serialize the next .env text: existing keys in `updates` are replaced in
 * place (their comments/ordering survive), untouched lines pass through, and
 * brand-new keys are appended at the end.
 */
export function serializeEnvFile(
  current: string,
  updates: Record<string, string>,
): string {
  const lines = current.split(/\r?\n/);
  const updated = new Set(Object.keys(updates));
  const replaced = lines.map((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && updated.has(m[1])) {
      updated.delete(m[1]);
      return `${m[1]}=${quote(updates[m[1]])}`;
    }
    return line;
  });
  for (const key of updated) replaced.push(`${key}=${quote(updates[key])}`);
  return replaced.join("\n");
}

/** Quote a value whenever unquoted text would be ambiguous to dotenv parsers. */
function quote(value: string): string {
  return /[\s#"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

/**
 * Atomically apply `values` to the .env file (whitelist-only), then hot-reload
 * process.env so call-time readers (SMTP, R2 — built in later tasks) pick the
 * new values up immediately. Boot-frozen keys (DATABASE_URL/APP_URL/AUTH_SECRET)
 * are not in ENV_WRITABLE_KEYS, so `getEnv()`'s cache can never be moved by a
 * call here — a write attempt throws before touching the file.
 */
export function writeEnvValues(
  values: Record<string, string>,
  targetPath: string = ENV_PATH,
): void {
  for (const key of Object.keys(values)) {
    if (!(ENV_WRITABLE_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Key ${key} is not writable via the app`);
    }
  }
  const current = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const next = serializeEnvFile(current, values);
  const tmp = `${targetPath}.tmp`;
  writeFileSync(tmp, next, "utf8");
  renameSync(tmp, targetPath);
  for (const [k, v] of Object.entries(values)) process.env[k] = v;
}

/**
 * True when the app can write to .env in this directory. Probe stays fully
 * synchronous: when the file is absent it is created (wx → fails if a race
 * created it first); otherwise a `.env.probe` → `.env.probe2` rename round-trip
 * proves directory writability, and both artifacts are removed in this call.
 */
export function isEnvWritable(): boolean {
  try {
    if (!existsSync(ENV_PATH)) {
      writeFileSync(ENV_PATH, "# written by setup wizard\n", { flag: "wx" });
      return true;
    }
    const probe = `${ENV_PATH}.probe`;
    writeFileSync(probe, "");
    renameSync(probe, `${ENV_PATH}.probe2`);
    rmSync(`${ENV_PATH}.probe2`, { force: true });
    return true;
  } catch {
    return false;
  }
}
