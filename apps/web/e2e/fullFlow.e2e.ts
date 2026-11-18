import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * P1.18: the main flow (start → data → weights → result → sensitivity → export) in both languages.
 * Labels come from the catalogs, so the same steps run in Turkish and English, and a missing
 * or renamed string fails here instead of showing up untranslated.
 */
const VALUES = [
  [250, 16, 12],
  [200, 16, 8],
  [300, 32, 16],
  [275, 32, 8],
];

type Language = 'en' | 'tr';

function label(
  language: Language,
  namespace: 'matrix' | 'project' | 'home' | 'flow',
  path: string,
): string {
  const file = new URL(
    `../../../packages/i18n/src/catalogs/${language}/${namespace}.json`,
    import.meta.url,
  );
  let node: unknown = JSON.parse(readFileSync(file, 'utf8'));
  for (const key of path.split('.')) node = (node as Record<string, unknown>)[key];
  if (typeof node !== 'string') throw new Error(`Missing label ${namespace}:${path}`);
  return node;
}

async function paste(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    document.body.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}

for (const language of ['en', 'tr'] as const) {
  test(`main flow works offline in ${language}`, async ({ page, context }) => {
    await page.addInitScript((code) => {
      localStorage.setItem(
        'mateo.settings',
        JSON.stringify({ state: { language: code }, version: 1 }),
      );
    }, language);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    // Everything is local: from here on the network is gone.
    // (The preview server on localhost stays reachable; anything else is blocked.)
    await context.route(
      (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
      (route) => route.abort(),
    );

    // Start: a blank table in a new project.
    await page.getByRole('button', { name: label(language, 'home', 'drop.blank') }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: label(language, 'project', 'browser.create') })
      .click();
    await page
      .getByTestId('create-dataset')
      .filter({ hasText: label(language, 'flow', 'data.empty.blank') })
      .click();
    await paste(page, VALUES.map((row) => row.join('\t')).join('\n'));
    await expect(page.locator('.ag-row')).toHaveCount(4);
    await expect(page.getByTestId('save-status')).toHaveText(
      label(language, 'matrix', 'status.saved'),
      {
        timeout: 10_000,
      },
    );

    // Weights: calculated from the data as soon as the step opens.
    await page.getByRole('link', { name: label(language, 'flow', 'data.next') }).click();
    await expect(page.getByTestId('weights-section')).toBeVisible();

    // Result: ranked without a Run button.
    await page.getByRole('link', { name: label(language, 'flow', 'weights.next') }).click();
    await expect(page.getByTestId('winner')).toBeVisible();
    await expect(page.getByTestId('ranking-table')).toBeVisible();
    await expect(page.locator('#main > div')).toHaveCSS('opacity', '1');

    await page.getByTestId('open-sensitivity').click();
    await expect(page.getByTestId('sensitivity-analysis')).toBeVisible();

    await page.getByTestId('export-analysis').click();
    await expect(page.getByTestId('export-dialog')).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByTestId('export-save').click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
  });
}
