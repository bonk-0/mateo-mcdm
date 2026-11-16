import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const FIXTURES = fileURLToPath(new URL('./fixtures/files', import.meta.url));
const VIRTUAL_ID = 'virtual:io-fixtures';

export default defineConfig({
  plugins: [
    {
      // Lets tests import the fixture library as `{ [file name]: hex }`. The package itself
      // has no Node types, so tests cannot read files directly.
      name: 'mateo-io-fixtures',
      enforce: 'pre',
      resolveId: (id) => (id === VIRTUAL_ID ? `\0${VIRTUAL_ID}` : null),
      load(id) {
        if (id !== `\0${VIRTUAL_ID}`) return null;
        const files = Object.fromEntries(
          readdirSync(FIXTURES)
            .sort()
            .map((name) => [name, readFileSync(join(FIXTURES, name)).toString('hex')]),
        );
        return `export default ${JSON.stringify(files)};`;
      },
    },
  ],
  test: {
    name: '@mateo/io',
    // Used by `pnpm --filter @mateo/io test:coverage`. Coverage settings of a project are
    // ignored when the tests run from the repo root.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/testing/**'],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
    },
  },
});
