import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const FIXTURES = resolve(import.meta.dirname, '../../../packages/io/fixtures/files');

async function newProject(page: Page): Promise<void> {
  await page.goto('/#/data-center');
  await page.getByRole('button', { name: 'New project' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page.getByTestId('import-file')).toBeVisible();
}

const next = (page: Page) => page.getByRole('button', { name: /^Next/ }).click();

async function walkToConfirm(page: Page, from: 'columns' | 'structure'): Promise<void> {
  // From the given step to the last one (columns → types → missing → validation → preview → confirm).
  const remaining = from === 'columns' ? 5 : 6;
  for (let step = 0; step < remaining; step += 1) await next(page);
  await expect(page.getByTestId('step-confirm')).toBeVisible();
}

test('imports a Turkish XLSX and an English CSV with fuzzy columns into editable models', async ({
  page,
}) => {
  await newProject(page);

  // --- TR-locale XLSX: worksheet, structure, columns with directions to choose.
  await page.getByTestId('import-file').click();
  await page.getByTestId('import-file-input').setInputFiles(`${FIXTURES}/08-tr-tez-tablosu.xlsx`);
  await expect(page.getByTestId('step-sheet')).toBeVisible();
  await next(page);
  await expect(page.getByTestId('step-structure')).toBeVisible();
  await next(page);
  await expect(page.getByTestId('criteria-table')).toBeVisible();
  // The file has no directions: the import is blocked until they are chosen.
  await expect(page.getByTestId('wizard-blocked')).toBeVisible();
  await page.getByRole('button', { name: 'All cost' }).click();
  await expect(page.getByTestId('wizard-blocked')).toBeHidden();
  await walkToConfirm(page, 'columns');
  await page.getByTestId('confirm-import').click();

  // The editor opens on the new dataset with the Turkish numbers read correctly.
  await expect(page.locator('.ag-row')).toHaveCount(4);
  await expect(
    page.locator('.ag-row[row-index="0"] .ag-cell').filter({ hasText: '185000' }).first(),
  ).toBeVisible();
  await expect(page.locator('.ag-row[row-index="3"]').getByText('Çerkezköy')).toBeVisible();

  // --- EN-locale CSV with a fuzzy (l, m, u) layout.
  await page.goto('/#/data-center');
  await page.getByTestId('import-file').click();
  await page.getByTestId('import-file-input').setInputFiles({
    name: 'fuzzy-suppliers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      [
        'Supplier,Quality_l,Quality_m,Quality_u,Cost_l,Cost_m,Cost_u',
        'Alpha,5.5,7,8.5,1200.5,1250.25,1300',
        'Beta,4,6,8,900,950,1010.75',
        'Gamma,6.25,8,9.5,1100,1180,1250',
        '',
      ].join('\n'),
    ),
  });
  await expect(page.getByTestId('step-structure')).toBeVisible(); // a CSV has no worksheet step
  await next(page);
  await expect(page.getByText('Fuzzy (l, m, u columns)').first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Direction of Quality' }).selectOption('benefit');
  await page.getByRole('combobox', { name: 'Direction of Cost' }).selectOption('cost');
  await walkToConfirm(page, 'columns');
  await page.getByTestId('confirm-import').click();
  await expect(page.locator('.ag-row')).toHaveCount(3);
  // A fuzzy cell shows its three numbers.
  await expect(page.locator('.ag-row[row-index="0"]').getByText(/5\.5/).first()).toBeVisible();

  // --- The Data Center lists both datasets, both original files and the history.
  await page.getByRole('link', { name: 'Data Center' }).first().click();
  await expect(page.getByTestId('dataset-list').getByRole('listitem')).toHaveCount(2);
  const files = page.getByTestId('file-list');
  await expect(files.getByText('08-tr-tez-tablosu.xlsx')).toBeVisible();
  await expect(files.getByText('fuzzy-suppliers.csv')).toBeVisible();
  await expect(page.getByTestId('history-list').getByRole('listitem')).toHaveCount(2);

  // The project reopens with everything in place (the editor shows when autosave is done).
  await page.goto('/#/matrix');
  await expect(page.getByTestId('save-status')).toHaveText('All changes saved', {
    timeout: 10_000,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Open project' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Untitled project/ })
    .click();
  await page.getByRole('link', { name: 'Data Center' }).first().click();
  await expect(page.getByTestId('dataset-list').getByRole('listitem')).toHaveCount(2);
  await expect(page.getByTestId('file-list').getByText('fuzzy-suppliers.csv')).toBeVisible();
});

test('pasting a range copied from Excel starts an import', async ({ page }) => {
  await newProject(page);
  await page.evaluate((text) => {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    document.body.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, 'Name\tPrice\tQuality\nX\t10\t3\nY\t12,5\t4\nZ\t9\t5\n');
  await expect(page.getByTestId('step-structure')).toBeVisible();
  await next(page);
  await page.getByRole('button', { name: 'All benefit' }).click();
  await walkToConfirm(page, 'columns');
  await page.getByTestId('confirm-import').click();
  await expect(page.locator('.ag-row')).toHaveCount(3);
});
