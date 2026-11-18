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

/** The names in the ranking bars of the result step, best first. */
async function rankingOrder(page: Page): Promise<string[]> {
  return page
    .getByTestId('ranking-table')
    .first()
    .locator('li > span[title]')
    .evaluateAll((spans) => spans.map((span) => span.getAttribute('title') ?? ''));
}

/** Lets the page transition of the shell end, so the page is not swapped under the clicks. */
async function settle(page: Page): Promise<void> {
  await expect(page.locator('#main > div')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(400);
}

test('data → CRITIC → MARCOS: the ranking equals the engine output, and survives a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Blank table' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await page.getByTestId('create-dataset').click();
  await paste(page, VALUES.map((row) => row.join('\t')).join('\n'));
  await expect(page.locator('.ag-row')).toHaveCount(4);
  await expect(page.getByTestId('save-status')).toHaveText('All changes saved', {
    timeout: 10_000,
  });

  // CRITIC is the recommended weighting; it runs in a Web Worker as the step opens.
  await page.getByRole('link', { name: 'Next: Weights' }).click();
  await expect(page.getByTestId('weights-section')).toBeVisible();
  await settle(page);
  await page.getByRole('button', { name: 'How were these weights calculated?' }).click();
  await page.getByTestId('trace-tables').getByRole('button').first().click();
  await expect(page.getByTestId('trace-step-correlation-matrix')).toBeVisible();

  // The result step ranks with these weights on its own.
  await page.getByRole('link', { name: 'Next: Result' }).click();
  await expect(page.getByTestId('winner')).toBeVisible();
  const shown = await rankingOrder(page);
  expect(shown).toEqual(expectedRanking());
  await settle(page);

  // Charts and every table of the calculation are one click away.
  await page.getByTestId('result-details').getByRole('button').first().click();
  await expect(
    page
      .getByRole('img', { name: 'Final utility of each alternative', exact: true })
      .locator('svg'),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Heat map of the weighted normalized values' }).locator('svg'),
  ).toBeVisible();
  await page.getByTestId('view-explain').click();
  await page.getByTestId('trace-tables').getByRole('button').first().click();
  await expect(page.getByTestId('trace-step-final-utility')).toBeVisible();

  // Reload and reopen the project: the stored analyses are shown, none is stored twice.
  await page.reload();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Open another project…' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Untitled project/ })
    .click();
  await page.goto('/#/result');
  await expect(page.getByTestId('winner')).toBeVisible();
  expect(await rankingOrder(page)).toEqual(shown);
  await page.goto('/#/result/history');
  const list = page.getByTestId('analysis-list');
  await expect(list.getByRole('button')).toHaveCount(2);
  await list.getByRole('button').filter({ hasText: 'MARCOS' }).click();
  await expect(page.getByTestId('ranking-table')).toBeVisible();
});
