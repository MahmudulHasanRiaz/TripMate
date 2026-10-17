import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { databaseUrlFromParts } from "../scripts/migrate-lib.mjs";

// The internal-database deploy path: docker-compose / Portainer set
// POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB once; the image CMD derives
// DATABASE_URL from them before auto-migration (scripts/derive-db-url.mjs).
// These tests pin the encoding contract (special characters must round-trip
// through the driver-side decodeURIComponent) and the script's branch logic.

const ROOT = path.resolve(import.meta.dirname, "..");

const run = (env: Record<string, string>) =>
  spawnSync(process.execPath, ["scripts/derive-db-url.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      // Never let an ambient .env / shell override the fixture under test.
      DATABASE_URL: "",
      POSTGRES_USER: "",
      POSTGRES_PASSWORD: "",
      POSTGRES_DB: "",
      POSTGRES_HOST: "",
      ...env,
    },
    encoding: "utf8",
    timeout: 15_000,
  });

describe("databaseUrlFromParts", () => {
  it("derives the compose-internal URL from db name alone (defaults user/password/host/port)", () => {
    expect(databaseUrlFromParts({ database: "tripmate" })).toBe(
      "postgresql://postgres:postgres@postgres:5432/tripmate",
    );
  });

  it("uses all provided parts", () => {
    expect(
      databaseUrlFromParts({
        user: "admin",
        password: "secret",
        database: "tripmate-prod",
        host: "db.internal",
        port: 6543,
      }),
    ).toBe("postgresql://admin:secret@db.internal:6543/tripmate-prod");
  });

  it("round-trips passwords containing @ : # % / through URL decoding", () => {
    const password = "p@ss:#word%1/a b";
    const url = databaseUrlFromParts({ password, database: "tripmate" });
    expect(url).toBeTruthy();

    // Exactly what the driver does (postgres.js parseUrl → decodeURIComponent).
    const parsed = new URL(url as string);
    expect(decodeURIComponent(parsed.password)).toBe(password);
    expect(decodeURIComponent(parsed.username)).toBe("postgres");
    expect(decodeURIComponent(parsed.pathname.slice(1))).toBe("tripmate");
    // The raw password must never appear verbatim in the URL's authority.
    expect(url).not.toContain("@ss");
  });

  it("returns null when no database name is given", () => {
    expect(databaseUrlFromParts({})).toBeNull();
    expect(databaseUrlFromParts({ database: "" })).toBeNull();
    expect(databaseUrlFromParts({ database: "   " })).toBeNull();
  });
});

describe("derive-db-url script", () => {
  it("prints NOTHING when DATABASE_URL is already set (external database untouched)", () => {
    const res = run({
      DATABASE_URL: "postgresql://user:pw@external.example.com:5432/db",
      POSTGRES_DB: "ignored",
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toBe("");
    expect(res.stderr).toBe("");
  });

  it("derives from POSTGRES_* when DATABASE_URL is empty", () => {
    const res = run({
      POSTGRES_DB: "tripmate-custom",
      POSTGRES_PASSWORD: "p@ss:#word%1",
      POSTGRES_USER: "owner",
    });
    expect(res.status).toBe(0);
    expect(res.stdout).not.toBe("");

    const parsed = new URL(res.stdout);
    expect(parsed.hostname).toBe("postgres");
    expect(parsed.port).toBe("5432");
    expect(decodeURIComponent(parsed.username)).toBe("owner");
    expect(decodeURIComponent(parsed.password)).toBe("p@ss:#word%1");
    expect(decodeURIComponent(parsed.pathname.slice(1))).toBe("tripmate-custom");

    // The notice is emitted on stderr (never captured into the URL) and must
    // not leak the password.
    expect(res.stderr).toContain("derive-db-url");
    expect(res.stderr).not.toContain("p@ss");
  });

  it("prints nothing when neither DATABASE_URL nor POSTGRES_DB is set (migrator fails fast itself)", () => {
    const res = run({});
    expect(res.status).toBe(0);
    expect(res.stdout).toBe("");
  });

  it("honors POSTGRES_HOST when the database lives elsewhere on the network", () => {
    const res = run({ POSTGRES_DB: "tripmate", POSTGRES_HOST: "192.168.1.9" });
    expect(res.status).toBe(0);
    expect(new URL(res.stdout).hostname).toBe("192.168.1.9");
  });
});
