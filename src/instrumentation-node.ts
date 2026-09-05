import { getEnv } from "@/lib/env";

export function validateEnvAtBoot(): void {
  try {
    getEnv();
  } catch (error) {
    // Next.js rewrites the `.message` of any error thrown from register()
    // ("An error occurred while loading instrumentation hook: ..."). zod's
    // ZodError.message is a getter-only accessor, so that rewrite throws and
    // hides the real failure. Surface a plain Error with the full cause chain.
    const detail =
      error instanceof Error && error.message ? error.message : String(error);
    const wrapped = new Error(
      `Environment validation failed at boot:\n${detail}`,
      { cause: error },
    );
    console.error(wrapped);
    // Exit non-zero so a missing/invalid env fails the server at boot instead
    // of starting and 500ing every request (a liveness probe would otherwise
    // keep a dead deploy "healthy").
    process.exit(1);
  }
}
