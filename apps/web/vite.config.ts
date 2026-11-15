import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// Tauri sets TAURI_ENV_PLATFORM while it runs the dev server or a build.
const tauriPlatform = process.env['TAURI_ENV_PLATFORM'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Tauri expects a fixed port and must see Rust errors in the terminal.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS and Linux.
    target: tauriPlatform === 'windows' ? 'chrome111' : 'safari16',
    sourcemap: Boolean(process.env['TAURI_ENV_DEBUG']),
    // A local desktop app loads from disk, so one larger bundle is fine.
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
