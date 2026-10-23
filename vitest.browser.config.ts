import { defineConfig } from "vitest/config";

/** Real-browser tests: a Next app that installs the packed library, driven by Chrome. `npm run test:browser`. */
export default defineConfig({
  test: { include: ["e2e/**/*.test.ts"], testTimeout: 60_000, hookTimeout: 360_000, fileParallelism: false },
});
