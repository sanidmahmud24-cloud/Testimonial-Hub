import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Strip the throw at the bundler level so tests can import server-only
      // modules without the runtime guard firing.
      "server-only": path.resolve(__dirname, "tests/_shims/server-only.ts"),
    },
  },
});