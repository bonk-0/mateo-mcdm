import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@mateo/methods',
    // Used by `pnpm --filter @mateo/methods test:coverage`. Coverage settings of a project
    // are ignored when the tests run from the repo root.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts', '*/*.ts'],
      exclude: ['**/*.test.ts', 'src/testing/**', 'vitest.config.ts'],
      // Methods produce the numbers users act on; held to the engine's bar.
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
