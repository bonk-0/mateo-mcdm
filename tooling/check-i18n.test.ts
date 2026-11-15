import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const script = join(repoRoot, 'tooling/check-i18n.ts');
const catalogs = join(repoRoot, 'packages/i18n/src/catalogs');

const run = (dir?: string) =>
  spawnSync(process.execPath, dir ? [script, dir] : [script], { encoding: 'utf8' });

let copies: string[] = [];
afterEach(() => {
  for (const dir of copies) rmSync(dir, { recursive: true, force: true });
  copies = [];
});

/** Copies the real catalogs to a temp folder and lets `edit` change one tr namespace. */
function copyWithTrEdit(namespace: string, edit: (tree: Record<string, unknown>) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'mateo-i18n-'));
  copies.push(dir);
  cpSync(catalogs, dir, { recursive: true });
  const file = join(dir, 'tr', `${namespace}.json`);
  const tree = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  edit(tree);
  writeFileSync(file, JSON.stringify(tree));
  return dir;
}

describe('pnpm i18n:check', () => {
  it('passes on the shipped catalogs', () => {
    const result = run();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('fails when a key is removed from tr', () => {
    const result = run(copyWithTrEdit('shell', (tree) => delete tree['skipToContent']));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[missing-key] tr/shell:skipToContent');
  });

  it('fails when tr has a key that en does not', () => {
    const result = run(copyWithTrEdit('home', (tree) => (tree['extra'] = 'Fazla')));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[unused-key] tr/home:extra');
  });
});
