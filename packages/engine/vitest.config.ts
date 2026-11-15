import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@mateo/engine',
    // Used by `pnpm --filter @mateo/engine test:coverage`. Coverage settings of a project
    // are ignored when the tests run from the repo root.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      // The toy method and sample data exist only for the tests.
      exclude: ['src/**/*.test.ts', 'src/__fixtures__/**'],
      // docs/phases/phase-1.md, P1.2: at least 90 % line coverage of the engine.
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
