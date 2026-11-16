import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // Lets tests import a binary project file as hex text: `import hex from './x.mateo?hex'`.
      // The package itself has no Node types, so tests cannot read files directly.
      name: 'mateo-fixture-hex',
      enforce: 'pre',
      load(id) {
        if (!id.endsWith('.mateo?hex')) return null;
        const hex = readFileSync(id.slice(0, -'?hex'.length)).toString('hex');
        return `export default ${JSON.stringify(hex)};`;
      },
    },
  ],
  test: {
    name: '@mateo/project',
    // Used by `pnpm --filter @mateo/project test:coverage`. Coverage settings of a project
    // are ignored when the tests run from the repo root.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/testing/**'],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
});
