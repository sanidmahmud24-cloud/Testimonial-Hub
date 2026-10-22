// Node ESM resolver hook: maps the TypeScript path alias `@/*` to the
// project root, and stubs the `server-only` package (which throws when
// imported outside Next.js). Loaded with
//   node --import ./scripts/ts-paths.mjs scripts/foo.mts

import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";

const projectRoot = pathResolve(dirname(fileURLToPath(import.meta.url)), "..");

const SERVER_ONLY_STUB = pathToFileURL(
  pathResolve(projectRoot, "scripts/server-only-stub.mjs"),
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: SERVER_ONLY_STUB, shortCircuit: true, format: "module" };
  }
  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    const candidates = [
      pathResolve(projectRoot, rest),
      pathResolve(projectRoot, `${rest}.ts`),
      pathResolve(projectRoot, `${rest}.mts`),
      pathResolve(projectRoot, `${rest}/index.ts`),
    ];
    for (const candidate of candidates) {
      try {
        const url = pathToFileURL(candidate).href;
        return await nextResolve(url, context);
      } catch {
        // try next
      }
    }
  }
  return nextResolve(specifier, context);
}
