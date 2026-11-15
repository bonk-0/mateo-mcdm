import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each workspace package is its own Vitest project; `tooling` holds repo-level checks.
    projects: ['packages/*', 'apps/*', 'tooling'],
  },
});
