export async function register() {
  // register() also runs in the Edge runtime, which has no process.exit and
  // cannot fail-fast a server, so boot env validation is a Node.js-only
  // concern and lives in a module the edge build never imports.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnvAtBoot } = await import("./instrumentation-node");
  validateEnvAtBoot();
}
