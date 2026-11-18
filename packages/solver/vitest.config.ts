import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@mateo/solver',
    // Used by `pnpm --filter @mateo/solver test:coverage`. Coverage settings of a project
    // are ignored when the tests run from the repo root.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      // Optimization methods report what this adapter returns; held to the engine's bar.
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
