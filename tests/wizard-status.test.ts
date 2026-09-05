import { describe, it, expect, vi } from "vitest";

// wizard.ts is a server module (server-only marker + server deps); stub the
// marker so detectStepStatus (pure) imports cleanly under vitest's node env.
vi.mock("server-only", () => ({}));

import { detectStepStatus } from "@/modules/settings/wizard";

describe("detectStepStatus", () => {
  const baseEnv = {} as Record<string, string | undefined>;

  it("storage configured when driver local", () => {
    const s = detectStepStatus({ ...baseEnv, STORAGE_DRIVER: "local" }, { storage: { driver: "local" } }, 0);
    expect(s.storage.configured).toBe(true);
    expect(s.storage.driver).toBe("local");
  });

  it("storage not configured when driver r2 but creds missing", () => {
    const s = detectStepStatus({ ...baseEnv, STORAGE_DRIVER: "r2" }, { storage: { driver: "r2" } }, 0);
    expect(s.storage.configured).toBe(false);
    expect(s.storage.r2Ready).toBe(false);
  });

  it("storage configured when r2 + full creds", () => {
    const env = { STORAGE_DRIVER: "r2", R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "b", R2_SECRET_ACCESS_KEY: "c", R2_BUCKET_NAME: "d", R2_PUBLIC_URL: "https://x" };
    const s = detectStepStatus(env, { storage: { driver: "r2" } }, 0);
    expect(s.storage.configured).toBe(true);
    expect(s.storage.r2Ready).toBe(true);
  });

  it("smtp configured when host set", () => {
    expect(detectStepStatus({ SMTP_HOST: "s.x" }, {}, 0).smtp.configured).toBe(true);
    expect(detectStepStatus({}, {}, 0).smtp.configured).toBe(false);
  });

  it("meta configured with pixel, skipped flag from settings", () => {
    const s = detectStepStatus({ META_PIXEL_ID: "123" }, { meta: { skipped: true } }, 0);
    expect(s.meta.configured).toBe(true);
    expect(s.meta.skipped).toBe(true);
  });

  it("superadmin configured iff userCount > 0", () => {
    expect(detectStepStatus({}, {}, 1).superadmin.configured).toBe(true);
    expect(detectStepStatus({}, {}, 0).superadmin.configured).toBe(false);
  });
});
