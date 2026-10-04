import { defineConfig } from "vitest/config";

/* Tests run against a real Postgres database (TEST_DATABASE_URL), so the
   row-level security checks exercise the same engine as production. */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
