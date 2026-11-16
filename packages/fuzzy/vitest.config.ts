import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@mateo/fuzzy',
    // Used by `pnpm --filter @mateo/fuzzy test:coverage`. Coverage settings of a project
    // are ignored when the tests run from the repo root.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      // Every fuzzy method builds on this package, so it is held to the engine's bar.
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
