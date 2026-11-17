import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@mateo/explain',
    // Used by `pnpm --filter @mateo/explain test:coverage`. Coverage settings of a project
    // are ignored when the tests run from the repo root.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/testing/**'],
      // Explain mode decides what users are told about a result; held to the engine's bar.
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
