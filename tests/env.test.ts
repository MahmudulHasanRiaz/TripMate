import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("parses a valid environment", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      APP_URL: "http://localhost:3000",
      NODE_ENV: "development",
    });
    expect(env.DATABASE_URL).toBe("postgresql://u:p@localhost:5432/db");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("throws listing every missing variable", () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL/);
    expect(() => parseEnv({})).toThrowError(/APP_URL/);
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "mysql://localhost/db",
        APP_URL: "http://localhost:3000",
      }),
    ).toThrowError();
  });

  it("defaults NODE_ENV to development", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      APP_URL: "http://localhost:3000",
    });
    expect(env.NODE_ENV).toBe("development");
  });
});
