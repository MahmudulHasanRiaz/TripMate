export async function register() {
  const { getEnv } = await import("@/lib/env");
  try {
    getEnv();
  } catch (error) {
    // Next.js rewrites the `.message` of any error thrown from register()
    // ("An error occurred while loading instrumentation hook: ..."). zod's
    // ZodError.message is a getter-only accessor, so that rewrite throws and
    // hides the real failure. Surface a plain Error carrying the issue text.
    const detail =
      error instanceof Error && error.message ? error.message : String(error);
    throw new Error(`Environment validation failed at boot:\n${detail}`, {
      cause: error,
    });
  }
}
