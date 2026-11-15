import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'tooling',
    // ESLint with type information is slow on a cold start.
    testTimeout: 60_000,
  },
});
