import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { PURE_PACKAGES } from '../eslint.config.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd: repoRoot });

/**
 * Lints `code` as if it lived at `relativePath` (the file does not need to exist on disk
 * because the type-aware parser uses the default project for unknown files).
 */
async function ruleIdsFor(relativePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, {
    filePath: `${repoRoot}/${relativePath}`,
  });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

const uiImports = [
  "import { PACKAGE_NAME } from '@mateo/ui';",
  "import { PACKAGE_NAME } from '@mateo/explain';",
  "import { PACKAGE_NAME } from '../../ui/src/index';",
  "import { PACKAGE_NAME } from '../../../apps/web/src/index';",
  "import * as React from 'react';",
  "import { invoke } from '@tauri-apps/api/core';",
];

describe('UI import boundary', () => {
  for (const pkg of PURE_PACKAGES) {
    for (const statement of uiImports) {
      it(`rejects \`${statement}\` in packages/${pkg}`, async () => {
        const ids = await ruleIdsFor(
          `packages/${pkg}/src/index.ts`,
          `${statement}\nexport const x = 1;\n`,
        );
        expect(ids).toContain('no-restricted-imports');
      });
    }
  }

  it('allows pure-to-pure imports', async () => {
    const ids = await ruleIdsFor(
      'packages/methods/src/index.ts',
      "import { PACKAGE_NAME } from '@mateo/engine';\nexport const x = PACKAGE_NAME;\n",
    );
    expect(ids).not.toContain('no-restricted-imports');
  });

  it('allows UI imports outside pure packages', async () => {
    const ids = await ruleIdsFor(
      'packages/ui/src/index.ts',
      "import { PACKAGE_NAME } from '@mateo/engine';\nexport const x = PACKAGE_NAME;\n",
    );
    expect(ids).not.toContain('no-restricted-imports');
  });
});
