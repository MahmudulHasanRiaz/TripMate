import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Guards for the Portainer / Docker deployment surface:
//   1. docker-compose.portainer.yml must render with ONLY the documented
//      required variables, start both services (no profiles — a stack deploy
//      runs `docker compose up -d` without --profile), and pass through every
//      optional runtime variable the app reads.
//   2. docker-compose.yml must keep the app behind the "app" profile so
//      `docker compose up -d` stays "local dev Postgres only".
//   3. The docker build context must ship scripts/migrate-lib.mjs — the
//      runner image COPYs it and auto-migrate.mjs imports it; when
//      .dockerignore excludes it, the image build fails at that COPY.
//
// `docker compose config` is fully client-side (no daemon), so these run
// anywhere the CLI is installed; machines without it skip the suite.

function dockerComposeAvailable(): boolean {
  try {
    execFileSync("docker", ["compose", "version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const repoRoot = resolve(process.cwd());
const scratchDir = mkdtempSync(join(tmpdir(), "tripmate-compose-"));
const emptyEnvFile = join(scratchDir, "empty.env");
writeFileSync(emptyEnvFile, "");

// `docker compose config` interpolates process.env IN ADDITION to the env file.
// CI exports DATABASE_URL, APP_URL and AUTH_SECRET for its migrate/seed/build
// steps; leaking them here hides what the compose file actually does (it makes
// "DATABASE_URL stays empty" and "missing vars fail fast" unobservable). Strip
// every variable either compose file interpolates, then apply the test's own
// overrides — the test owns its environment, never the caller's shell.
const COMPOSE_INTERPOLATED_VARS = new Set(
  ["docker-compose.yml", "docker-compose.portainer.yml"].flatMap((file) =>
    [...readFileSync(join(repoRoot, file), "utf8").matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map(
      (match) => match[1],
    ),
  ),
);

function isolatedEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of COMPOSE_INTERPOLATED_VARS) delete env[key];
  return { ...env, ...overrides };
}

afterAll(() => {
  rmSync(scratchDir, { recursive: true, force: true });
});

interface ComposeRun {
  ok: boolean;
  stdout: string;
  stderr: string;
}

/** Render a compose file with an EMPTY env file (no repo .env leakage). */
function composeConfig(file: string, env: Record<string, string> = {}): ComposeRun {
  try {
    const stdout = execFileSync(
      "docker",
      ["compose", "--env-file", emptyEnvFile, "-f", join(repoRoot, file), "config"],
      { cwd: repoRoot, encoding: "utf8", env: isolatedEnv(env) },
    );
    return { ok: true, stdout, stderr: "" };
  } catch (error) {
    const e = error as { stdout?: string | Buffer; stderr?: string | Buffer };
    return {
      ok: false,
      stdout: String(e.stdout ?? ""),
      stderr: String(e.stderr ?? ""),
    };
  }
}

const REQUIRED_ENV = {
  AUTH_SECRET: "compose-test-secret-000000000000000000",
  APP_URL: "http://tripmate.test:3000",
};

describe.skipIf(!dockerComposeAvailable())("docker-compose.portainer.yml", () => {
  it("renders with only AUTH_SECRET + APP_URL and starts both services", () => {
    const run = composeConfig("docker-compose.portainer.yml", REQUIRED_ENV);
    expect(run.stderr + run.stdout).toBeTruthy();
    expect(run.ok, run.stderr).toBe(true);

    expect(run.stdout).toMatch(/^  postgres:/m);
    expect(run.stdout).toMatch(/^  app:/m);
    // A profile on any service would keep a Portainer stack deploy (which runs
    // without --profile) from starting it.
    expect(run.stdout).not.toMatch(/profiles:/);
    // Postgres data + uploaded media must survive redeploys.
    expect(run.stdout).toMatch(/tripmate_pgdata/);
    expect(run.stdout).toMatch(/tripmate_uploads/);
    // Internal-database wiring: DATABASE_URL stays EMPTY (derived at boot from
    // the POSTGRES_* passthrough) and both services get the same variables.
    expect(run.stdout).toMatch(/DATABASE_URL: ""/);
    expect(run.stdout).toMatch(/POSTGRES_DB: tripmate/);
    expect(run.stdout).toMatch(/POSTGRES_USER: postgres/);
  });

  it("never publishes Postgres to the host — deploys cannot be blocked by port conflicts", () => {
    const run = composeConfig("docker-compose.portainer.yml", REQUIRED_ENV);
    expect(run.ok, run.stderr).toBe(true);
    // Only the app takes a host port. A published Postgres port once let an
    // old stack's leftover container block every redeploy at the network step.
    expect(run.stdout).not.toMatch(/published: "543[0-9]"/);
    expect(run.stdout).toMatch(/published: "3000"/);
  });

  it("wires APP_PORT and DB credentials as independent variables in ONE place", () => {
    const run = composeConfig("docker-compose.portainer.yml", {
      ...REQUIRED_ENV,
      APP_PORT: "8080",
      POSTGRES_DB: "tripmate-custom",
      POSTGRES_PASSWORD: "p@ss:word",
      POSTGRES_USER: "owner",
    });
    expect(run.ok, run.stderr).toBe(true);

    // App port: free to assign.
    expect(run.stdout).toMatch(/published: "8080"/);
    expect(run.stdout).toMatch(/target: 3000/);
    // DB credentials: same values reach the postgres service AND the app
    // container (the app derives its URL from them at boot).
    for (const expected of [
      /POSTGRES_DB: "?tripmate-custom"?/,
      /POSTGRES_PASSWORD: "?p@ss:word"?/,
      /POSTGRES_USER: "?owner"?/,
    ]) {
      const matches = run.stdout.match(new RegExp(expected.source, "g")) ?? [];
      expect(matches.length, `${expected} must reach BOTH services`).toBeGreaterThanOrEqual(2);
    }
  });

  it("passes every optional runtime variable through to the app container", () => {
    const run = composeConfig("docker-compose.portainer.yml", REQUIRED_ENV);
    expect(run.ok, run.stderr).toBe(true);

    for (const key of [
      "DATABASE_URL",
      "DATABASE_URL_MIGRATE",
      "SKIP_DB_MIGRATE",
      "APP_URL",
      "AUTH_SECRET",
      "STORAGE_DRIVER",
      "STORAGE_LOCAL_DIR",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
      "R2_PUBLIC_URL",
      "META_PIXEL_ID",
      "META_CAPI_ACCESS_TOKEN",
      "META_CAPI_TEST_CODE",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]) {
      expect(run.stdout, `${key} missing from rendered stack config`).toContain(`${key}:`);
    }
  });

  it("fails fast, naming the variable, when AUTH_SECRET or APP_URL is missing", () => {
    const missingBoth = composeConfig("docker-compose.portainer.yml");
    expect(missingBoth.ok).toBe(false);
    // Compose versions differ here: some report every missing required
    // variable, others stop at the first (APP_URL is declared first). Require
    // that the failure names one of them; the cases below prove each variable
    // is named when it alone is missing.
    expect(missingBoth.stderr).toMatch(/(APP_URL|AUTH_SECRET) is required/);

    const missingAppUrl = composeConfig("docker-compose.portainer.yml", {
      AUTH_SECRET: REQUIRED_ENV.AUTH_SECRET,
    });
    expect(missingAppUrl.ok).toBe(false);
    expect(missingAppUrl.stderr).toMatch(/APP_URL is required/);

    const missingSecret = composeConfig("docker-compose.portainer.yml", {
      APP_URL: REQUIRED_ENV.APP_URL,
    });
    expect(missingSecret.ok).toBe(false);
    expect(missingSecret.stderr).toMatch(/AUTH_SECRET is required/);
  });
});

describe.skipIf(!dockerComposeAvailable())("docker-compose.yml (local dev)", () => {
  it("renders without any environment and keeps app behind the app profile", () => {
    const run = composeConfig("docker-compose.yml");
    expect(run.ok, run.stderr).toBe(true);

    // Fresh clone, no .env: `docker compose up -d` must still start Postgres.
    expect(run.stdout).toMatch(/^  postgres:/m);
  });

  it("activates the app service only with --profile app", () => {
    const inactive = composeConfig("docker-compose.yml");
    expect(inactive.ok, inactive.stderr).toBe(true);
    expect(inactive.stdout).not.toMatch(/^  app:/m);

    let active: ComposeRun;
    try {
      const stdout = execFileSync(
        "docker",
        [
          "compose",
          "--env-file",
          emptyEnvFile,
          "--profile",
          "app",
          "-f",
          join(repoRoot, "docker-compose.yml"),
          "config",
        ],
        { cwd: repoRoot, encoding: "utf8", env: isolatedEnv() },
      );
      active = { ok: true, stdout, stderr: "" };
    } catch (error) {
      const e = error as { stdout?: string | Buffer; stderr?: string | Buffer };
      active = { ok: false, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
    }
    expect(active.ok, active.stderr).toBe(true);
    expect(active.stdout).toMatch(/^  app:/m);
    // The R2 build arg must render empty when unset (not break the render).
    expect(active.stdout).toMatch(/R2_PUBLIC_URL/);
  });
});

describe("portainer/portainer-stack.json", () => {
  const template = JSON.parse(
    readFileSync(join(repoRoot, "portainer/portainer-stack.json"), "utf8"),
  ) as {
    version: string;
    name: string;
    description: string;
    repository: { url: string; stackfile: string };
    env: Array<{ name: string; label: string; default: string }>;
  };
  const composeText = readFileSync(join(repoRoot, "docker-compose.portainer.yml"), "utf8");

  it("points at the Portainer stack file (not the profiled dev compose)", () => {
    expect(template.version).toBe("2");
    expect(template.name).toBe("tripmate");
    expect(template.repository.url).toBe("https://github.com/MahmudulHasanRiaz/TripMate");
    expect(template.repository.stackfile).toBe("docker-compose.portainer.yml");
  });

  it("labels every variable with a name, label and default", () => {
    expect(template.env.length).toBeGreaterThan(10);
    const names = new Set<string>();
    for (const entry of template.env) {
      expect(entry.name).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(entry.label.length, `${entry.name} label`).toBeGreaterThan(3);
      expect(entry.default, `${entry.name} default`).toBeTypeOf("string");
      expect(names.has(entry.name), `duplicate env entry ${entry.name}`).toBe(false);
      names.add(entry.name);
    }
  });

  it("stays in sync with every ${...} variable the compose file interpolates", () => {
    // Env-sync rule: a new compose variable must land in this template (and in
    // .env.example) in the same commit — otherwise the Portainer form silently
    // omits it and the stack renders with an empty/default value.
    const composeVars = new Set(
      [...composeText.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]),
    );
    const templateVars = new Set(template.env.map((e) => e.name));

    const missingFromTemplate = [...composeVars].filter((v) => !templateVars.has(v));
    const unusedInCompose = [...templateVars].filter((v) => !composeVars.has(v));
    expect(missingFromTemplate, "compose vars missing from portainer-stack.json").toEqual([]);
    expect(unusedInCompose, "template vars not read by the compose file").toEqual([]);
  });
});

describe("docker build context", () => {
  const dockerignore = readFileSync(join(repoRoot, ".dockerignore"), "utf8");
  const dockerfile = readFileSync(join(repoRoot, "Dockerfile"), "utf8");

  it("ships scripts/migrate-lib.mjs into the builder stage", () => {
    // The runner stage does `COPY --from=builder /app/scripts/migrate-lib.mjs`
    // and auto-migrate.mjs imports it — if .dockerignore's `scripts/*`
    // exclusion is not re-opened for it, the image build fails at that COPY.
    expect(dockerignore).toMatch(/^!scripts\/migrate-lib\.mjs$/m);
    expect(dockerfile).toMatch(/COPY --from=builder[^\n]*scripts\/migrate-lib\.mjs/);
  });

  it("ships scripts/auto-migrate.mjs into the builder stage", () => {
    expect(dockerignore).toMatch(/^!scripts\/auto-migrate\.mjs$/m);
    expect(dockerfile).toMatch(/COPY --from=builder[^\n]*scripts\/auto-migrate\.mjs/);
  });

  it("ships scripts/derive-db-url.mjs and runs it in the boot CMD", () => {
    expect(dockerignore).toMatch(/^!scripts\/derive-db-url\.mjs$/m);
    expect(dockerfile).toMatch(/COPY --from=builder[^\n]*scripts\/derive-db-url\.mjs/);
    // The CMD must derive DATABASE_URL before auto-migration and the server.
    expect(dockerfile).toMatch(/derive-db-url\.mjs/);
    expect(dockerfile).toMatch(/auto-migrate\.mjs && exec node server\.js/);
  });
});
