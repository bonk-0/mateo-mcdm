import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { textLiteral } from '@mateo/engine';
import type { BwmInput } from '@mateo/methods';
import { expect, test } from '@playwright/test';
import type { WorkerRequest, WorkerResponse } from '../src/workspace/runner.worker';

/**
 * P2.2: the optimization solver (HiGHS, WebAssembly) runs in the calculation worker of the
 * production build, offline. BWM has no workspace yet (P2.7), so the test talks to the
 * built worker directly.
 */
const assets = fileURLToPath(new URL('../dist/assets', import.meta.url));
const workerFile = readdirSync(assets).find((name) => /^runner\.worker-.*\.js$/.test(name));

const input: BwmInput = {
  criteria: ['quality', 'price', 'comfort', 'safety', 'style'].map((id) => ({
    id,
    name: textLiteral(id),
  })),
  best: 'price',
  worst: 'style',
  bestToOthers: [2, 1, 4, 3, 8],
  othersToWorst: [4, 8, 4, 2, 1],
};

test('the worker solves BWM with the bundled solver and no network', async ({ page }) => {
  expect(workerFile).toBeDefined();
  const external: string[] = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost') return route.continue();
    external.push(url.href);
    return route.abort();
  });
  await page.goto('/');

  const outcomes = await page.evaluate(
    async ({ url, input }) => {
      const worker = new Worker(url, { type: 'module' });
      const run = (request: WorkerRequest) =>
        new Promise<WorkerResponse['outcome']>((resolve) => {
          worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
            if (event.data.id === request.id) resolve(event.data.outcome);
          });
          worker.postMessage(request);
        });
      const results = await Promise.all(
        (['nonlinear', 'linear'] as const).map((model, i) =>
          run({ id: i + 1, job: { methodId: 'bwm', input, parameters: { model } } }),
        ),
      );
      worker.terminate();
      return results.map((outcome) =>
        outcome.ok && 'record' in outcome ? outcome.record.result : outcome,
      );
    },
    { url: `/assets/${workerFile}`, input },
  );

  const [nonlinear, linear] = outcomes as [
    { xi: number; consistencyRatio: number },
    { xi: number; weights: { entries: { value: number }[] } },
  ];
  expect(nonlinear.xi).toBeCloseTo(1, 10);
  expect(nonlinear.consistencyRatio).toBeCloseTo(0.2238, 4);
  expect(linear.xi).toBeCloseTo(4 / 65, 12);
  expect(linear.weights.entries.map((e) => e.value)).toEqual(
    [16, 28, 8, 10, 3].map((k): unknown => expect.closeTo(k / 65, 12)),
  );
  expect(external).toEqual([]);
});
