#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("Usage: npm run new-module <kebab-case-name>");
  process.exit(1);
}

const dir = join("src", "modules", name);
mkdirSync(dir, { recursive: true });

const files = {
  "schema.ts": `// Drizzle tables for the ${name} module.\nexport {};\n`,
  "service.ts": `// All DB queries for the ${name} module. Server-only.\nimport "server-only";\n`,
  "actions.ts": `// 'use server' mutations for the ${name} module. Guard every action.\n`,
  "validation.ts": `import { z } from "zod";\n\n// Zod schemas for the ${name} module.\n`,
};

for (const [file, content] of Object.entries(files)) {
  writeFileSync(join(dir, file), content);
}

console.log(`Module skeleton created: src/modules/${name}`);
console.log("Remember to export its schema from src/db/schema.ts.");
