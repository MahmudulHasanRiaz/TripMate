import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const VALID_SECRET = "a".repeat(32);

describe("parseEnv", () => {
  it("parses a valid environment", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: VALID_SECRET,
      NODE_ENV: "development",
    });
    expect(env.DATABASE_URL).toBe("postgresql://u:p@localhost:5432/db");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.AUTH_SECRET).toBe(VALID_SECRET);
  });

  it("throws listing every missing variable", () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL/);
    expect(() => parseEnv({})).toThrowError(/APP_URL/);
    expect(() => parseEnv({})).toThrowError(/AUTH_SECRET/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mysql://localhost/db",
        APP_URL: "http://localhost:3000",
        AUTH_SECRET: VALID_SECRET,
      }),
    ).toThrowError();
  });

  it("defaults NODE_ENV to development", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      APP_URL: "http://localhost:3000",
      AUTH_SECRET: VALID_SECRET,
    });
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects a short AUTH_SECRET", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "postgresql://u:p@localhost:5432/db",
        APP_URL: "http://localhost:3000",
        AUTH_SECRET: "short",
      }),
    ).toThrowError(/AUTH_SECRET must be at least 32 chars/);
  });
});
