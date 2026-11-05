import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// FU-31 — boot-time cache convergence. Three layers are pinned here:
//   1. the token helper (src/lib/boot-revalidate.ts),
//   2. the internal route's auth behaviour (no/invalid token → 404 and
//      NOTHING is revalidated; valid token → every boot tag expired
//      immediately),
//   3. the boot client script (scripts/boot-revalidate.mjs) against a stub
//      server — including the cross-implementation contract that the .mjs
//      HMAC derivation and the TypeScript helper produce the SAME token.

const { SECRET } = vi.hoisted(() => ({
  // Assembled from fragments: a credential-shaped literal here is mangled
  // by secret-redaction tooling, which would silently corrupt the fixture.
  SECRET: ["fu31", "fixture", "auth", "value", "0123456789", "abcdef0123"].join("-"),
}));

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    APP_URL: "http://localhost:3000",
    AUTH_SECRET: SECRET,
    NODE_ENV: "test",
  }),
}));

import { revalidateTag } from "next/cache";
import { POST } from "@/app/api/internal/boot-revalidate/route";
import {
  BOOT_REVALIDATE_HEADER,
  BOOT_REVALIDATE_TAGS,
  bootRevalidateToken,
  isBootRevalidateTokenValid,
} from "@/lib/boot-revalidate";

const revalidateTagMock = revalidateTag as unknown as Mock;

describe("boot revalidate token helper", () => {
  it("derives the documented HMAC-SHA256 purpose token", () => {
    const independent = createHmac("sha256", SECRET)
      .update("tripmate:boot-revalidate:v1")
      .digest("hex");
    expect(bootRevalidateToken(SECRET)).toBe(independent);
    expect(bootRevalidateToken(SECRET)).toBe(bootRevalidateToken(SECRET));
  });

  it("accepts only the exact token for the exact secret", () => {
    const token = bootRevalidateToken(SECRET);
    expect(isBootRevalidateTokenValid(token, SECRET)).toBe(true);
    expect(isBootRevalidateTokenValid(bootRevalidateToken("a-different-secret-32-chars-min!!"), SECRET)).toBe(false);
    expect(isBootRevalidateTokenValid(token, "a-different-secret-32-chars-min!!")).toBe(false);
    expect(isBootRevalidateTokenValid(SECRET, SECRET)).toBe(false); // raw secret is NOT the token
    expect(isBootRevalidateTokenValid(token.slice(0, -1), SECRET)).toBe(false);
    expect(isBootRevalidateTokenValid(`${token}0`, SECRET)).toBe(false);
  });

  it("rejects missing tokens without throwing", () => {
    expect(isBootRevalidateTokenValid(null, SECRET)).toBe(false);
    expect(isBootRevalidateTokenValid(undefined, SECRET)).toBe(false);
    expect(isBootRevalidateTokenValid("", SECRET)).toBe(false);
  });
});

describe("POST /api/internal/boot-revalidate", () => {
  beforeEach(() => {
    revalidateTagMock.mockReset();
  });

  const post = (headers: Record<string, string> = {}) =>
    POST(
      new Request("http://localhost/api/internal/boot-revalidate", {
        method: "POST",
        headers,
      }),
    );

  it("answers 404 and revalidates nothing without a token", async () => {
    const res = await post();
    expect(res.status).toBe(404);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("answers 404 and revalidates nothing for a wrong token", async () => {
    const res = await post({ [BOOT_REVALIDATE_HEADER]: "0".repeat(64) });
    expect(res.status).toBe(404);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a token derived from a different secret", async () => {
    const foreign = bootRevalidateToken("a-different-secret-32-chars-min!!");
    const res = await post({ [BOOT_REVALIDATE_HEADER]: foreign });
    expect(res.status).toBe(404);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("expires every boot tag immediately for the valid token", async () => {
    const res = await post({
      [BOOT_REVALIDATE_HEADER]: bootRevalidateToken(SECRET),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      revalidated: [...BOOT_REVALIDATE_TAGS],
    });
    expect(revalidateTagMock).toHaveBeenCalledTimes(BOOT_REVALIDATE_TAGS.length);
    for (const tag of BOOT_REVALIDATE_TAGS) {
      expect(revalidateTagMock).toHaveBeenCalledWith(tag, { expire: 0 });
    }
  });
});

// --- the boot client script, spawned against a stub server -----------------

const ROOT = path.resolve(import.meta.dirname, "..");

type Stub = {
  baseUrl: string;
  posts: Array<{ token: string | undefined }>;
  healthHits: number;
  close: () => Promise<void>;
};

async function startStub(opts: {
  postStatus: number;
  healthFailuresBeforeOk?: number;
}): Promise<Stub> {
  const stub: Stub = {
    baseUrl: "",
    posts: [],
    healthHits: 0,
    close: async () => {},
  };
  let healthFailures = opts.healthFailuresBeforeOk ?? 0;
  const server = createServer((req, res) => {
    if (req.url === "/api/health") {
      stub.healthHits += 1;
      if (healthFailures > 0) {
        healthFailures -= 1;
        res.writeHead(503).end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
      return;
    }
    if (req.url === "/api/internal/boot-revalidate" && req.method === "POST") {
      stub.posts.push({ token: req.headers[BOOT_REVALIDATE_HEADER] as string | undefined });
      res
        .writeHead(opts.postStatus, { "content-type": "application/json" })
        .end(JSON.stringify({ ok: opts.postStatus === 200, revalidated: [...BOOT_REVALIDATE_TAGS] }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  stub.baseUrl = `http://127.0.0.1:${port}`;
  stub.close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  return stub;
}

function runScript(env: Record<string, string>): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/boot-revalidate.mjs"], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH ?? "",
        NODE_ENV: "test",
        BOOT_REVALIDATE_ATTEMPTS: "3",
        BOOT_REVALIDATE_ATTEMPT_DELAY_MS: "50",
        BOOT_REVALIDATE_HEALTH_INTERVAL_MS: "50",
        BOOT_REVALIDATE_HEALTH_TIMEOUT_MS: "10000",
        BOOT_REVALIDATE_REQUEST_TIMEOUT_MS: "3000",
        ...env,
      },
    });
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
    child.stderr.on("data", (d: Buffer) => (out += d.toString("utf8")));
    child.on("error", reject);
    child.on("close", (code: number | null) => resolve({ code, out }));
  });
}

describe("scripts/boot-revalidate.mjs", () => {
  it("waits for health, then posts the SAME token the TS helper derives", async () => {
    const stub = await startStub({ postStatus: 200, healthFailuresBeforeOk: 2 });
    try {
      const res = await runScript({
        AUTH_SECRET: SECRET,
        BOOT_REVALIDATE_BASE_URL: stub.baseUrl,
      });
      expect(res.code).toBe(0);
      expect(stub.healthHits).toBeGreaterThanOrEqual(3); // 2 failures + the OK
      expect(stub.posts).toHaveLength(1);
      expect(stub.posts[0].token).toBe(bootRevalidateToken(SECRET));
      expect(stub.posts[0].token).not.toBe(SECRET); // raw secret never travels
      expect(res.out).not.toContain(SECRET);
    } finally {
      await stub.close();
    }
  }, 30_000);

  it("exits 1 when the route refuses (non-200)", async () => {
    const stub = await startStub({ postStatus: 404 });
    try {
      const res = await runScript({
        AUTH_SECRET: SECRET,
        BOOT_REVALIDATE_BASE_URL: stub.baseUrl,
      });
      expect(res.code).toBe(1);
      expect(stub.posts.length).toBeGreaterThanOrEqual(3); // retried per BOOT_REVALIDATE_ATTEMPTS
      expect(res.out).toContain("cache convergence failed");
    } finally {
      await stub.close();
    }
  }, 30_000);

  it("exits 1 without calling the route when AUTH_SECRET is missing", async () => {
    const stub = await startStub({ postStatus: 200 });
    try {
      const res = await runScript({ BOOT_REVALIDATE_BASE_URL: stub.baseUrl });
      expect(res.code).toBe(1);
      expect(res.out).toContain("AUTH_SECRET");
      expect(stub.posts).toHaveLength(0);
    } finally {
      await stub.close();
    }
  }, 30_000);
});
