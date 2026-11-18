import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

/**
 * The Content Security Policy of the built app. Everything Mateo needs is served with it,
 * so nothing may load from anywhere else. `wasm-unsafe-eval` lets the SQLite (project
 * files) and HiGHS (solver) WebAssembly modules compile; it allows no JavaScript `eval`.
 * Inline styles come from the UI components that position popovers and charts.
 *
 * Set as a meta tag, so that the app is protected on any static host. A host that can send
 * headers may send the same policy as a header (and add `frame-ancestors 'none'`, which a
 * meta tag cannot carry). Only in builds: the dev server injects an inline script.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  const charset = '<meta charset="UTF-8" />';
  return {
    name: 'mateo-content-security-policy',
    apply: 'build',
    // Right after the charset: a policy in a meta tag covers only what comes after it.
    transformIndexHtml(html) {
      if (!html.includes(charset)) throw new Error(`index.html must start with ${charset}`);
      return html.replace(
        charset,
        `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    contentSecurityPolicy(),
    // Offline and installable: a service worker keeps every file of the build, so the app
    // opens and runs without a connection once it has been loaded. A new version waits
    // until the user reloads (`shell/AppUpdate.tsx`), so a project is never interrupted.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mateo',
        short_name: 'Mateo',
        description: 'Classical and fuzzy multi-criteria decision making.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0d1a38',
        theme_color: '#1b3266',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,svg,png,woff2}'],
        // The solver (HiGHS) and SQLite WebAssembly files are a few megabytes each.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Routes are in the hash, so every navigation is the app's one page.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Relative URLs: the build works from any folder of any static host. Routes are in the
  // hash, so there is only one page to find.
  base: './',
  // SQLite WebAssembly (project storage) loads its .wasm file itself.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // The service worker caches the whole build on the first visit; after that, chunk
    // sizes only affect the very first load.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    name: '@mateo/web',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Rendering full pages with jsdom can be slow on a cold start.
    testTimeout: 20_000,
  },
});
