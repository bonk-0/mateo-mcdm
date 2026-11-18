import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * Mateo as a web app: it works offline once loaded, a project goes out to the computer as
 * a `.mateo` file and comes back in, one project is open in one tab at a time, and the
 * Content Security Policy allows everything the app does.
 */

async function paste(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    document.body.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}

/** Collects Content Security Policy violations of the page. */
async function watchPolicy(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return () =>
    page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);
}

/** Creates a project named `name` with a 4 × 3 matrix and waits until it is stored. */
async function createProject(page: Page, name: string): Promise<void> {
  await page.getByTestId('start-blank').click();
  const dialog = page.getByRole('dialog', { name: 'New project' });
  await dialog.getByLabel('Project name').fill(name);
  await dialog.getByRole('button', { name: 'Create' }).click();
  await page.getByTestId('create-dataset').filter({ hasText: 'Blank table' }).click();
  // Four phones on price, memory and camera: data CRITIC and MARCOS can work with.
  await paste(page, '250\t16\t12\n200\t16\t8\n300\t32\t16\n275\t32\t8');
  await expect(page.locator('.ag-row')).toHaveCount(4);
  await expect(page.getByTestId('save-status')).toHaveText('All changes saved', {
    timeout: 10_000,
  });
}

test('opens and works offline once it has been loaded', async ({ page, context }) => {
  const violations = await watchPolicy(page);
  await page.goto('/');
  // The service worker has stored the whole build.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(page.getByText('Mateo now works offline too.')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('start-blank')).toBeVisible();

  // Project storage (SQLite WebAssembly) and the calculation worker run offline.
  await createProject(page, 'Offline');
  await page.getByRole('link', { name: 'Next: Weights' }).click();
  await expect(page.getByTestId('weights-section')).toBeVisible();
  await page.getByRole('link', { name: 'Next: Result' }).click();
  await expect(page.getByTestId('winner')).toBeVisible();

  expect(await violations()).toEqual([]);
});

test('a project goes out as a .mateo file and comes back in', async ({ page }) => {
  const violations = await watchPolicy(page);
  // The save dialog of Chromium cannot be driven by a test; the download path is tested.
  await page.addInitScript(() => {
    delete (window as { showSaveFilePicker?: unknown }).showSaveFilePicker;
  });
  await page.goto('/');
  await createProject(page, 'Suppliers');

  await page.getByTestId('open-project').click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download .mateo file' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('Suppliers.mateo');
  const bytes = readFileSync(await file.path());
  expect(bytes.subarray(0, 15).toString('latin1')).toBe('SQLite format 3');

  // Back in, under another name, from the Open dialog.
  await page.getByTestId('open-project').click();
  await page.getByRole('menuitem', { name: 'Open…' }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('open-from-computer').click();
  await (
    await chooser
  ).setFiles({
    name: 'Suppliers.mateo',
    mimeType: 'application/octet-stream',
    buffer: bytes,
  });
  const name = page.getByRole('dialog', { name: 'Keep the project as' });
  await name.getByLabel('Project name').fill('Suppliers copy');
  await name.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByText('Opened “Suppliers” from your computer')).toBeVisible();
  await expect(page.getByTestId('open-project')).toHaveAttribute('title', 'Suppliers copy.mateo');
  await page.goto('/#/data');
  await expect(page.locator('.ag-row')).toHaveCount(4);

  expect(await violations()).toEqual([]);
});

test('a project is open in one tab at a time', async ({ page, context }) => {
  await page.goto('/');
  await createProject(page, 'Shared');

  const other = await context.newPage();
  await other.goto('/');
  await other.getByTestId('open-project').click();
  await other.getByRole('menuitem', { name: 'Open…' }).click();
  await other.getByRole('dialog', { name: 'Open a project' }).getByText('Shared').click();
  await expect(other.getByText('Could not open the project')).toBeVisible();
  await expect(other.getByText(/open in another tab or window/)).toBeVisible();

  // Once the first tab has let it go, the second one opens it.
  await page.close();
  await other.getByTestId('open-project').click();
  await other.getByRole('menuitem', { name: 'Open…' }).click();
  await other.getByRole('dialog', { name: 'Open a project' }).getByText('Shared').click();
  await expect(other.getByText('Opened “Shared”')).toBeVisible();
});
