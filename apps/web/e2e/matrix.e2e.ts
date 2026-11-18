import { expect, test, type Locator, type Page } from '@playwright/test';

/** Puts text on the "clipboard" the way a spreadsheet does and pastes it into the page. */
async function paste(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    document.body.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}

function table(rows: number, columns: number, value: (r: number, c: number) => string): string {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns }, (_, c) => value(r, c)).join('\t'),
  ).join('\n');
}

/** The criterion cell at (row, criterion) of the grid. */
function cellAt(page: Page, row: number, criterion: number): Locator {
  return page
    .locator(`.ag-row[row-index="${row}"] .ag-cell[col-id]:not([col-id^="__"])`)
    .nth(criterion);
}

async function rowTexts(page: Page, row: number): Promise<string[]> {
  return page.locator(`.ag-row[row-index="${row}"] .ag-cell[col-id]`).allTextContents();
}

async function newDecisionProblem(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Blank table' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await page.getByTestId('create-dataset').click();
}

/** Less frequent tools are in the "More" menu of the toolbar. */
async function more(page: Page, testId: string): Promise<void> {
  await page.getByTestId('more-actions').click();
  await page.getByTestId(testId).click();
}

const saved = (page: Page) => page.getByTestId('save-status');

test('paste 10×6, edit, undo, redo, autosave and reopen without losing data', async ({ page }) => {
  await newDecisionProblem(page);

  await paste(
    page,
    table(10, 6, (r, c) => String((r + 1) * 10 + c)),
  );
  await expect(
    page.getByText('Pasted 60 cells and added 10 alternatives and 6 criteria.'),
  ).toBeVisible();
  await expect(page.locator('.ag-row')).toHaveCount(10);
  await expect(cellAt(page, 9, 5)).toHaveText('105');

  // Edit one cell by typing a number with a decimal comma.
  await cellAt(page, 2, 1).dblclick();
  await expect(page.locator('.ag-popup input')).toBeFocused();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('99,5');
  await page.keyboard.press('Enter');
  await expect(cellAt(page, 2, 1)).toHaveText('99.5');

  await page.getByTestId('undo').click();
  await expect(cellAt(page, 2, 1)).toHaveText('31');
  await page.getByTestId('redo').click();
  await expect(cellAt(page, 2, 1)).toHaveText('99.5');

  // Autosave writes the project by itself.
  await expect(saved(page)).toHaveText('All changes saved', { timeout: 10_000 });
  const before = await Promise.all(Array.from({ length: 10 }, (_, r) => rowTexts(page, r)));

  // Reload: the app starts from nothing, then opens the saved project.
  await page.reload();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Open another project…' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Untitled project/ })
    .click();
  await page.getByTestId('continue').click();
  await expect(page.locator('.ag-row')).toHaveCount(10);
  const after = await Promise.all(Array.from({ length: 10 }, (_, r) => rowTexts(page, r)));
  expect(after).toEqual(before);
  await expect(cellAt(page, 2, 1)).toHaveText('99.5');

  // Undo history belongs to the session, but the data of the file is complete.
  await expect(page.getByTestId('undo')).toBeDisabled();
});

test('a triangular number with l > m is rejected with a translated message', async ({ page }) => {
  await newDecisionProblem(page);
  await paste(
    page,
    table(3, 2, (r, c) => String(r + c + 1)),
  );
  await expect(page.locator('.ag-row')).toHaveCount(3);

  await cellAt(page, 0, 0).click();
  await more(page, 'toggle-panel');
  await page.getByLabel('Number type').selectOption('tfn');
  await expect(cellAt(page, 0, 0)).toHaveText('(1, 1, 1)');

  await cellAt(page, 0, 0).dblclick();
  const parts = page.getByRole('group', { name: 'Triangular fuzzy number' }).locator('input');
  await parts.nth(0).fill('5');
  await parts.nth(1).fill('3');
  await parts.nth(2).fill('9');
  await expect(page.getByRole('alert')).toContainText('needs l ≤ m ≤ u');
  await page.keyboard.press('Enter');
  await expect(parts).toHaveCount(3); // still open: the value is not accepted
  await parts.nth(1).fill('6');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(cellAt(page, 0, 0)).toHaveText('(5, 6, 9)');
});

test('selection, bulk edit, insert and delete rows and columns', async ({ page }) => {
  await newDecisionProblem(page);
  await paste(
    page,
    table(4, 3, (r, c) => String(r * 3 + c + 1)),
  );
  await expect(page.locator('.ag-row')).toHaveCount(4);

  // Shift+arrows extend the selection; bulk edit multiplies the selected numbers.
  await cellAt(page, 0, 0).click();
  await expect(cellAt(page, 0, 0)).toHaveClass(/mt-selected/);
  await page.keyboard.press('Shift+ArrowDown');
  await expect(cellAt(page, 1, 0)).toHaveClass(/mt-selected/);
  await page.keyboard.press('Shift+ArrowRight');
  await expect(cellAt(page, 1, 1)).toHaveClass(/mt-selected/);
  await more(page, 'bulk-edit');
  await page.getByLabel('Operation').selectOption('multiply');
  await page.getByLabel('Number', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(cellAt(page, 0, 0)).toHaveText('10');
  await expect(cellAt(page, 1, 1)).toHaveText('50');
  await expect(cellAt(page, 2, 0)).toHaveText('7');

  // Insert a row below the selection and delete it again.
  await page.getByTestId('insert-row-below').click();
  await expect(page.locator('.ag-row')).toHaveCount(5);
  await more(page, 'delete-rows');
  await expect(page.locator('.ag-row')).toHaveCount(3);
  await page.getByTestId('undo').click();
  await expect(page.locator('.ag-row')).toHaveCount(5);

  // Copy puts the selection on the clipboard as tab-separated text.
  const copied = await page.evaluate(() => {
    const data = new DataTransfer();
    document.body.dispatchEvent(
      new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }),
    );
    return data.getData('text/plain');
  });
  expect(copied.split('\n')[0]).toBe('10\t20');

  // Search filters the rows.
  await more(page, 'toggle-find');
  await page.getByRole('searchbox', { name: 'Search the matrix' }).fill('A1');
  await expect(page.locator('.ag-row')).toHaveCount(1);
});

test('the editor stays under 100 ms per edit with a 500×50 matrix', async ({ page }) => {
  await newDecisionProblem(page);
  await paste(
    page,
    table(500, 50, (r, c) => String(r * 50 + c + 1)),
  );
  await expect(page.getByText('Pasted 25,000 cells')).toBeVisible({ timeout: 30_000 });
  await expect(cellAt(page, 0, 0)).toHaveText('1');

  const timings: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    await cellAt(page, 3, 2).dblclick();
    await expect(page.locator('.ag-popup input')).toBeFocused();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(String(1000 + i));
    // Time from the Enter key until the cell shows the new value.
    await page.evaluate(() => {
      const w = window as unknown as { __edit: Promise<number> };
      w.__edit = new Promise<number>((resolve) => {
        const cell = document.querySelectorAll(
          '.ag-row[row-index="3"] .ag-cell[col-id]:not([col-id^="__"])',
        )[2] as HTMLElement;
        let start = 0;
        window.addEventListener('keydown', () => (start = performance.now()), {
          capture: true,
          once: true,
        });
        new MutationObserver((_records, observer) => {
          observer.disconnect();
          resolve(performance.now() - start);
        }).observe(cell, { childList: true, subtree: true, characterData: true });
      });
    });
    await page.keyboard.press('Enter');
    timings.push(
      await page.evaluate(() => (window as unknown as { __edit: Promise<number> }).__edit),
    );
    await expect(cellAt(page, 3, 2)).toHaveText(String(1000 + i));
    await expect(page.locator('.ag-popup input')).toHaveCount(0);
  }
  timings.sort((a, b) => a - b);
  const median = timings[Math.floor(timings.length / 2)] as number;
  test.info().annotations.push({
    type: 'edit latency (ms)',
    description: timings.map((value) => value.toFixed(1)).join(', '),
  });
  expect(median).toBeLessThan(100);
});
