import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // allows `describe`, `it`, `expect` without imports
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    environment: "node", // or 'jsdom' if you test browser code
    coverage: {
      provider: "v8", // for coverage reporting
      reporter: ["text", "lcov"],
    },

    include: ["src/tests/**/*.test.ts", "src/tests/**/*.spec.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    setupFiles: ["src/tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": "/src", // optional, if you use TS path aliases
    },
  },
});
