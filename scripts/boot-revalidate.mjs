// Boot-time cache convergence client (FU-31) — run ONCE per container start
// by scripts/boot.sh, after the standalone server is up.
//
//   1. Wait for GET /api/health to answer 200 (app + DB ready).
//   2. POST /api/internal/boot-revalidate with the boot token so the app
//      expires the cache generation its Docker build baked from the
//      baseline seed + build env (APP_URL=http://localhost:3000). The next
//      public request then re-renders from the RUNTIME database/env —
//      no manual admin Settings save after a deploy (see
//      src/lib/boot-revalidate.ts for the full rationale).
//
// TOKEN: HMAC-SHA256(AUTH_SECRET, "tripmate:boot-revalidate:v1") — a
// purpose-bound derivative, re-implemented here in plain .mjs because the
// boot scripts cannot import the app's TypeScript. It MUST match
// src/lib/boot-revalidate.ts; tests/boot-revalidate.test.ts pins the two
// implementations together. The raw AUTH_SECRET never leaves the container,
// and neither value is ever logged.
//
// Failure contract: exit 0 only when the route confirmed revalidation.
// Any failure exits 1 — scripts/boot.sh logs a loud warning and keeps
// serving (the fallback is the pre-FU-31 behaviour: baked entries expire
// naturally or on the next admin settings save). This script must never
// crash the boot sequence beyond that warning, and boot.sh guarantees it.
//
// Tuning (defaults are the production values; tests shrink them):
//   BOOT_REVALIDATE_BASE_URL            default http://127.0.0.1:${PORT||3000}
//   BOOT_REVALIDATE_HEALTH_TIMEOUT_MS   default 120000
//   BOOT_REVALIDATE_HEALTH_INTERVAL_MS  default 1000
//   BOOT_REVALIDATE_ATTEMPTS            default 5
//   BOOT_REVALIDATE_ATTEMPT_DELAY_MS    default 2000
//   BOOT_REVALIDATE_REQUEST_TIMEOUT_MS  default 30000
import { createHmac } from "node:crypto";

const TOKEN_PURPOSE = "tripmate:boot-revalidate:v1";
const TOKEN_HEADER = "x-boot-revalidate-token";
const REVALIDATE_PATH = "/api/internal/boot-revalidate";
const HEALTH_PATH = "/api/health";

const intEnv = (name, fallback) => {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

const base = (
  process.env.BOOT_REVALIDATE_BASE_URL || `http://127.0.0.1:${process.env.PORT || "3000"}`
).replace(/\/+$/, "");
const healthTimeoutMs = intEnv("BOOT_REVALIDATE_HEALTH_TIMEOUT_MS", 120_000);
const healthIntervalMs = intEnv("BOOT_REVALIDATE_HEALTH_INTERVAL_MS", 1_000);
const attempts = intEnv("BOOT_REVALIDATE_ATTEMPTS", 5);
const attemptDelayMs = intEnv("BOOT_REVALIDATE_ATTEMPT_DELAY_MS", 2_000);
const requestTimeoutMs = intEnv("BOOT_REVALIDATE_REQUEST_TIMEOUT_MS", 30_000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealth(deadline) {
  for (;;) {
    try {
      const res = await fetch(`${base}${HEALTH_PATH}`, {
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (res.status === 200) return true;
    } catch {
      // Server not accepting connections yet — keep polling until deadline.
    }
    if (Date.now() >= deadline) return false;
    await sleep(healthIntervalMs);
  }
}

async function main() {
  const secret = (process.env.AUTH_SECRET ?? "").trim();
  if (!secret || secret.length < 32) {
    console.error(
      "[boot-revalidate] AUTH_SECRET is missing or shorter than 32 chars — cannot derive the boot token; skipping cache convergence.",
    );
    process.exit(1);
  }
  const token = createHmac("sha256", secret).update(TOKEN_PURPOSE).digest("hex");

  console.log(`[boot-revalidate] waiting for ${base}${HEALTH_PATH} …`);
  const healthy = await waitForHealth(Date.now() + healthTimeoutMs);
  if (!healthy) {
    console.error(
      `[boot-revalidate] app did not report healthy within ${healthTimeoutMs}ms — cache convergence skipped.`,
    );
    process.exit(1);
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(`${base}${REVALIDATE_PATH}`, {
        method: "POST",
        headers: { [TOKEN_HEADER]: token },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (res.status === 200) {
        const body = await res.json().catch(() => null);
        const tags = Array.isArray(body?.revalidated) ? body.revalidated.length : 0;
        console.log(
          `[boot-revalidate] build-baked cache expired (${tags} tags) — public pages now render from the runtime database/env.`,
        );
        process.exit(0);
      }
      console.error(
        `[boot-revalidate] attempt ${attempt}/${attempts}: route answered HTTP ${res.status}.`,
      );
    } catch (err) {
      console.error(
        `[boot-revalidate] attempt ${attempt}/${attempts}: request failed (${err?.name ?? "Error"}).`,
      );
    }
    if (attempt < attempts) await sleep(attemptDelayMs);
  }

  console.error(`[boot-revalidate] cache convergence failed after ${attempts} attempts.`);
  process.exit(1);
}

await main();
