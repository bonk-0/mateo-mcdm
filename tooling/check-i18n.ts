/**
 * CI check for translation catalogs: every language must have exactly the keys of the
 * source language (no missing and no unused keys), with valid ICU messages that use the
 * same arguments.
 *
 * Run with `pnpm i18n:check`. Reads every `<language>/<namespace>.json` under
 * packages/i18n/src/catalogs (or the directory given as the first argument), so a newly
 * added language is checked automatically.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkCatalogs,
  flattenCatalog,
  formatCatalogIssues,
  type CatalogSet,
  type CatalogTree,
} from '../packages/i18n/src/check.ts';

const SOURCE_LANGUAGE = 'en';

export function loadCatalogs(dir: string): CatalogSet {
  const catalogs: Record<string, Record<string, CatalogTree>> = {};
  for (const language of readdirSync(dir).sort()) {
    const languageDir = join(dir, language);
    if (!statSync(languageDir).isDirectory()) continue;
    const namespaces: Record<string, CatalogTree> = {};
    for (const file of readdirSync(languageDir).sort()) {
      if (!file.endsWith('.json')) continue;
      namespaces[file.slice(0, -'.json'.length)] = JSON.parse(
        readFileSync(join(languageDir, file), 'utf8'),
      ) as CatalogTree;
    }
    catalogs[language] = namespaces;
  }
  return catalogs;
}

function main(): void {
  const dir =
    process.argv[2] ?? fileURLToPath(new URL('../packages/i18n/src/catalogs', import.meta.url));
  const catalogs = loadCatalogs(dir);
  const languages = Object.keys(catalogs);
  const issues = checkCatalogs(catalogs, SOURCE_LANGUAGE);
  if (issues.length > 0) {
    console.error(`i18n check failed with ${issues.length} issue(s):\n`);
    console.error(formatCatalogIssues(issues));
    process.exit(1);
  }
  const keys = Object.values(catalogs[SOURCE_LANGUAGE] ?? {}).reduce(
    (n, tree) => n + flattenCatalog(tree).size,
    0,
  );
  process.stdout.write(`i18n check passed: ${languages.join(', ')} · ${keys} keys each.\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
