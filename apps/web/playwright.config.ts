import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests run against the production build served by `vite preview`
 * (`pnpm build` first). Specs are named `*.e2e.ts` so that Vitest does not pick them up.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1500, height: 1000 },
    trace: 'off',
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
