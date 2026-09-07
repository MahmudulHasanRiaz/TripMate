import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration runs hit the local Postgres (max ~10 connections); parallel
    // forks across 10+ DB suites exhaust the pool and time out in beforeAll.
    // Serial files only when the DB is opted in; pure tests stay parallel.
    fileParallelism: process.env.RUN_DB_INTEGRATION !== "1",
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
});
