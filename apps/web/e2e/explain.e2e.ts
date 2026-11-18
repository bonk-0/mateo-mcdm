import { expect, test, type Page } from '@playwright/test';

/** A 10 × 8 decision matrix: the size Explain mode must animate smoothly (P1.13). */
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

test('Explain mode plays the MARCOS timeline and is operable from the keyboard', async ({
  page,
}) => {
  await runMarcos(page);
  // Explain opens below the results, which stay on screen.
  await page.getByTestId('view-explain').click();
  const player = page.getByTestId('explain-player');
  await expect(player).toHaveAttribute('data-animated', 'true');
  await expect(player).toHaveAttribute('data-scene', 'initial-matrix');

  // Jump to a step, then drive the player with the keyboard only.
  await page.getByTestId('explain-step-normalized-matrix').focus();
  await page.keyboard.press('Enter');
  await expect(player).toHaveAttribute('data-scene', 'normalized-matrix/benefit');
  await expect(page.getByTestId('explain-formula').locator('.katex').first()).toBeVisible();
  await page.keyboard.press('End');
  await expect(player).toHaveAttribute('data-scene', 'ranking');
  await page.keyboard.press('Home');
  await expect(player).toHaveAttribute('data-scene', 'initial-matrix');

  // Play: values fly between the matrices and the timeline moves on by itself.
  await page.getByTestId('explain-speed').selectOption('3');
  // Jumping to a step plays its first scene once; Space pauses, and plays on from there.
  await page.getByTestId('explain-step-extended-matrix').click();
  await expect(page.getByTestId('explain-play')).toHaveAccessibleName('Pause');
  await page.getByTestId('explain-play').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('explain-play')).toHaveAccessibleName('Play');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('explain-play')).toHaveAccessibleName('Pause');
  await expect(player).toHaveAttribute('data-scene', 'extended-matrix', { timeout: 30_000 });
  await expect(page.locator('.ex-ghost').first()).toBeAttached();
  await expect(player).toHaveAttribute('data-scene', /^normalized-matrix/u, { timeout: 30_000 });
  await page.keyboard.press('Space');
  await expect(page.getByTestId('explain-play')).toHaveAccessibleName('Play');

  // "How was this calculated?" for the example cell, and the story of the result.
  await page.getByTestId('explain-derivation').click();
  await expect(page.getByRole('dialog', { name: 'How was this calculated?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByTestId('explain-tab-story').click();
  await expect(page.getByTestId('story-winner')).toContainText('ranks first');

  // The results are still there.
  await expect(page.getByTestId('ranking-table')).toBeVisible();
});

test('with reduced motion Explain mode shows static steps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await runMarcos(page);
  await page.getByTestId('view-explain').click();
  const player = page.getByTestId('explain-player');
  await expect(player).toHaveAttribute('data-animated', 'false');
  await expect(page.getByTestId('explain-play')).toHaveCount(0);
  await page.getByTestId('explain-step-weighted-matrix').click();
  await page.getByTestId('explain-next').click();
  await expect(player).toHaveAttribute('data-scene', 'weighted-matrix');
  // The whole table is there at once: 10 alternatives and the two reference rows.
  const cells = page.getByTestId('output-weighted-matrix').locator('[data-value]');
  await expect(cells).toHaveCount(12 * 8);
  await expect(cells.last()).toBeVisible();
  await expect(page.locator('.ex-ghost')).toHaveCount(0);
});
