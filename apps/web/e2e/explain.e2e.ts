import { expect, test, type Page } from '@playwright/test';

/** A 10 × 8 decision matrix: a lesson shows it focused around the explained cell. */
const VALUES = Array.from({ length: 10 }, (_, i) =>
  Array.from({ length: 8 }, (_, j) => 10 + ((i * 7 + j * 13 + i * j) % 29)),
);

async function paste(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    document.body.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}

async function runMarcos(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Blank table' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await page.getByTestId('create-dataset').click();
  await paste(page, VALUES.map((row) => row.join('\t')).join('\n'));
  await expect(page.locator('.ag-row').first()).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveText('All changes saved', {
    timeout: 10_000,
  });
  await page.getByRole('link', { name: 'Next: Weights' }).click();
  // Let the page transition of the shell end, so that the page is not swapped under the clicks.
  await expect(page.locator('#main > div')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(400);
  await page.getByTestId('weight-mode-manual').check({ force: true });
  await page.getByRole('button', { name: 'Make them equal' }).click();
  await page.getByRole('link', { name: 'Next: Result' }).click();
  await expect(page.getByTestId('ranking-table')).toBeVisible();
  await expect(page.locator('#main > div')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(400);
}

test('"How it was calculated" teaches the result step by step, from the keyboard too', async ({
  page,
}) => {
  await runMarcos(page);
  // The lesson opens beside the results, on the user's own data.
  await page.getByTestId('view-explain').click();
  const lesson = page.getByTestId('lesson');
  await expect(lesson).toHaveAttribute('data-step', 'decision');
  await expect(page.getByTestId('lesson-idea')).not.toBeEmpty();

  // Next and the arrow keys move through the steps; nothing plays by itself.
  await page.getByTestId('lesson-next').click();
  await expect(lesson).toHaveAttribute('data-step', 'reference');
  await lesson.focus();
  await page.keyboard.press('ArrowRight');
  await expect(lesson).toHaveAttribute('data-part', 'normalized-matrix');
  await page.waitForTimeout(1000);
  await expect(lesson).toHaveAttribute('data-part', 'normalized-matrix');

  // One cell is explained in words and numbers; the formula is there on request.
  await expect(page.getByTestId('lesson-how')).not.toBeEmpty();
  await expect(page.getByTestId('lesson-substitution').locator('.katex').first()).toBeVisible();
  await page.getByTestId('lesson-formula-toggle').click();
  await expect(page.getByTestId('lesson-formula').locator('.katex').first()).toBeVisible();
  await page.getByTestId('lesson-derivation').click();
  await expect(page.getByRole('dialog', { name: 'How was this calculated?' })).toBeVisible();
  await page.keyboard.press('Escape');

  // Any cell can be explained.
  const picked = page
    .getByTestId('output-normalized-matrix')
    .locator('[data-testid^="cell-normalized-matrix-"]')
    .nth(9);
  const name = (await picked.getAttribute('aria-description'))!.replace(/^Explain /u, '');
  await picked.click();
  await expect(page.getByTestId('lesson-cell')).toHaveText(name);

  // The last step tells the story of the result.
  await page
    .getByTestId(/^lesson-marker-/u)
    .last()
    .click();
  await expect(page.getByTestId('story-winner')).toContainText('ranks first');

  // The results are still there.
  await expect(page.getByTestId('ranking-table')).toBeVisible();
});

test('the Learn home leads to a lesson on a small example', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/learn');
  await page.getByTestId('library-card-marcos').click();
  const lesson = page.getByTestId('lesson');
  await expect(lesson).toContainText('Phone A');
  await expect(page.locator('.lesson-enter')).toHaveCount(0);
  await page.getByTestId('lesson-next').click();
  await expect(lesson).toHaveAttribute('data-step', 'reference');
});
