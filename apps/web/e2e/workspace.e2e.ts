import { runMethod, textLiteral } from '@mateo/engine';
import { criticMethod, marcosMethod } from '@mateo/methods';
import { expect, test, type Page } from '@playwright/test';

/** Four phones on price (cost), memory and camera (benefit). */
const VALUES = [
  [250, 16, 12],
  [200, 16, 8],
  [300, 32, 16],
  [275, 32, 8],
];

async function paste(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    document.body.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}

/** What the engine itself gives for this data: the golden output the UI must show. */
function expectedRanking(): string[] {
  const matrix = {
    alternatives: VALUES.map((_, i) => ({ id: `a${i}`, name: textLiteral(`A${i + 1}`) })),
    criteria: [0, 1, 2].map((j) => ({
      id: `c${j}`,
      name: textLiteral(`C${j + 1}`),
      direction: 'benefit' as const,
      numberType: 'crisp',
    })),
    values: VALUES,
  };
  const { weights } = runMethod(criticMethod, { matrix }).result;
  const { ranking } = runMethod(marcosMethod, { matrix, weights }).result;
  return [...ranking]
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => `A${Number(entry.alternativeId.slice(1)) + 1}`);
}

async function rankingOrder(page: Page): Promise<string[]> {
  const rows = page.getByTestId('ranking-table').locator('tbody tr');
  return rows.locator('th').allTextContents();
}

test('import → CRITIC → MARCOS → ranking equals the engine output, and survives a reload', async ({
  page,
}) => {
  await page.goto('/#/matrix');
  await page.getByRole('button', { name: 'New project' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await page.getByRole('button', { name: 'Create decision problem' }).click();
  await paste(page, VALUES.map((row) => row.join('\t')).join('\n'));
  await expect(page.locator('.ag-row')).toHaveCount(4);
  await expect(page.getByTestId('save-status')).toHaveText('All changes saved', {
    timeout: 10_000,
  });

  // CRITIC in the weighting workspace (the engine runs in a Web Worker).
  await page.getByRole('link', { name: 'Weighting' }).click();
  await page.getByTestId('run-weighting').click();
  await expect(page.getByTestId('weights-section')).toBeVisible();
  await expect(page.getByTestId('trace-step-correlation-matrix')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Criterion weights chart' })).toBeVisible();

  // One click: use these weights in MARCOS.
  await page.getByTestId('use-in-marcos').click();
  await expect(page.getByTestId('chosen-weights')).toBeVisible();
  // Let the page transition of the shell end, so that the page is not swapped under the clicks.
  await expect(page.locator('#main > div')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(400);
  await page.getByTestId('run-marcos').click();
  await expect(page.getByTestId('ranking-table')).toBeVisible();
  const shown = await rankingOrder(page);
  expect(shown).toEqual(expectedRanking());
  await expect(
    page
      .getByRole('img', { name: 'Final utility of each alternative', exact: true })
      .locator('svg'),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Heat map of the weighted normalized values' }).locator('svg'),
  ).toBeVisible();
  await expect(page.getByTestId('trace-step-final-utility')).toBeVisible();

  // Reload, reopen the project and read the stored analysis; nothing is recalculated.
  // (Running saves the project and stores the analysis before the result appears.)
  await page.reload();
  await page.getByRole('button', { name: 'Open project' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Untitled project/ })
    .click();
  await page.getByRole('link', { name: 'Results' }).click();
  const list = page.getByTestId('analysis-list');
  await expect(list.getByRole('button')).toHaveCount(2);
  await list.getByRole('button').filter({ hasText: 'MARCOS' }).click();
  await expect(page.getByTestId('ranking-table')).toBeVisible();
  expect(await rankingOrder(page)).toEqual(shown);
});
