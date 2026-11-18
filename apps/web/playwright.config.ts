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
    // Chromium on Linux turns a download's suggested name into a file system name using the
    // locale. In the POSIX locale every non-ASCII letter ("Adsız proje - MARCOS.xlsx") makes it
    // fall back to "download", so the browser is started with a UTF-8 locale.
    launchOptions: { env: { ...process.env, LC_ALL: 'C.UTF-8' } },
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
