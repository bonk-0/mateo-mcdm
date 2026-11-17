import { memoryFileStore, type FileStore } from '@mateo/project';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../commands/commands';
import { sampleFixture } from '../library/samples';
import { autosaveSettings } from '../project/autosaveSettings';
import type * as BrowserModule from '../project/browser';
import { getProjectController } from '../project/store';
import { useSettings } from '../settings/store';
import { renderApp } from './renderApp';

const store = vi.hoisted(() => ({ files: undefined as FileStore | undefined }));

vi.mock('../project/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof BrowserModule>()),
  browserFileStore: () => Promise.resolve(store.files),
}));

// ECharts needs a real layout engine; the chart options have their own tests.
vi.mock('../workspace/charts/EChart', () => ({
  EChart: ({ label }: { label: string }) => <div role="img" aria-label={label} />,
}));

const settleTransition = () => new Promise((resolve) => setTimeout(resolve, 700));

async function createProject(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(getProjectController()).not.toBeNull());
  act(() => runCommand('file.new'));
  await user.click(
    within(await screen.findByRole('dialog', { name: 'New project' })).getByRole('button', {
      name: 'Create',
    }),
  );
  await waitFor(() => expect(getProjectController()!.session).not.toBeNull());
  return getProjectController()!.session!;
}

describe('Method Library', () => {
  beforeEach(() => {
    store.files = memoryFileStore();
    autosaveSettings.delayMs = false;
    useSettings.getState().update({ motion: 'reduce' });
  });
  afterEach(() => {
    useSettings.getState().update({ language: 'en' });
    autosaveSettings.delayMs = 1500;
  });

  it('lists the Phase 1 methods and links to their pages', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn/library');
    for (const id of ['marcos', 'fuzzy-marcos', 'critic', 'merec', 'swara']) {
      expect(await screen.findByTestId(`library-card-${id}`)).toBeTruthy();
    }
    await user.click(screen.getByTestId('library-card-critic'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn/library/critic'));
    expect(await screen.findByTestId('library-page-critic')).toBeTruthy();
  });

  it('shows the template of a method page, with formulas read from the trace', async () => {
    renderApp('/learn/library/marcos');
    const page = await screen.findByTestId('library-page-marcos');
    for (const heading of [
      'Introduction',
      'Purpose',
      'Inputs',
      'Supported number types',
      'Steps and formulas',
      'Animated example',
      'Sample data',
      'Properties and edge cases',
      'References',
      'Related methods',
    ]) {
      expect(within(page).getByRole('heading', { name: heading })).toBeTruthy();
    }
    // One entry per trace step; the formulas are KaTeX output of the engine's own templates.
    const steps = within(screen.getByTestId('library-steps')).getAllByRole('listitem');
    expect(steps.length).toBeGreaterThanOrEqual(10);
    expect(
      screen.getByTestId('library-formula-final-utility').querySelector('.katex'),
    ).toBeTruthy();
    // The animated example is the Explain player on the reference dataset.
    expect(screen.getByTestId('explain-panel')).toBeTruthy();
    // References link to the papers of docs/methods.
    const references = within(screen.getByTestId('library-references'));
    expect(references.getByRole('link', { name: /10\.1016\/j\.cie\.2019\.106231/u })).toBeTruthy();
    // Related methods.
    expect(
      within(screen.getByTestId('library-related')).getByRole('link', { name: 'Fuzzy MARCOS' }),
    ).toBeTruthy();
  });

  it('shows the pages in Turkish', async () => {
    renderApp('/learn/library/critic');
    await screen.findByTestId('library-page-critic');
    act(() => useSettings.getState().update({ language: 'tr' }));
    const page = await screen.findByTestId('library-page-critic');
    expect(await within(page).findByRole('heading', { name: 'Adımlar ve formüller' })).toBeTruthy();
    expect(within(page).getByRole('heading', { name: 'Adımlar ve formüller' })).toBeTruthy();
    expect(within(page).getByRole('heading', { name: 'Kaynaklar' })).toBeTruthy();
  });

  it.each(['critic', 'merec', 'swara', 'fuzzy-marcos'])(
    'shows the Explain player in the example of %s',
    async (id) => {
      renderApp(`/learn/library/${id}`);
      await screen.findByTestId(`library-page-${id}`);
      expect(screen.getByTestId('explain-panel')).toBeTruthy();
      expect(screen.queryByTestId('library-no-animation')).toBeNull();
    },
  );

  it('puts classical and fuzzy SWARA on one page', async () => {
    const user = userEvent.setup();
    renderApp('/learn/library/swara');
    expect(await screen.findByTestId('library-variant-swara')).toBeTruthy();
    expect(screen.queryByTestId('library-variant-fuzzy-swara')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Fuzzy SWARA (IMF SWARA)' }));
    expect(await screen.findByTestId('library-variant-fuzzy-swara')).toBeTruthy();
    const references = within(screen.getByTestId('library-references'));
    expect(references.getByRole('link', { name: /10\.3390\/axioms10020092/u })).toBeTruthy();
  });

  it('opens MARCOS sample data in the workspace and reproduces the printed ranking', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn/library/marcos');
    await screen.findByTestId('library-page-marcos');
    // Without a project the button creates one first.
    expect(screen.getByTestId('sample-open-marcos').textContent).toMatch(/Create a project/u);
    const session = await createProject(user);
    await user.click(
      await screen.findByRole('button', { name: 'Open in workspace with sample data' }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/analysis/marcos'));
    expect(session.document.model.datasets).toHaveLength(1);
    await act(settleTransition);
    // The matrix of the paper and its weights are filled in.
    const table = await screen.findByTestId('input-matrix');
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    await user.click(await screen.findByTestId('run-marcos'));
    await screen.findByTestId('ranking-table', {}, { timeout: 8000 });

    const [saved] = await session.listAnalyses();
    const stored = await session.getAnalysis(saved!.id);
    const ranks = (stored.record.result as { ranking: { rank: number }[] }).ranking.map(
      (entry) => entry.rank,
    );
    expect(ranks).toEqual(sampleFixture('marcos').result['ranking']!.values);

    // Opening the sample again reuses its decision problem.
    await act(() => router.navigate('/learn/library/marcos'));
    await user.click(await screen.findByTestId('sample-open-marcos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/analysis/marcos'));
    expect(session.document.model.datasets).toHaveLength(1);
  });

  it('fills in SWARA from its sample and reproduces the printed weights', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn/library/swara');
    await screen.findByTestId('library-page-swara');
    const session = await createProject(user);
    await user.click(await screen.findByTestId('sample-open-swara'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/methods/weighting'));
    await act(settleTransition);

    expect(screen.getByRole('radio', { name: /SWARA/u, checked: true }) ?? null).toBeTruthy();
    expect(
      screen.getByLabelText<HTMLInputElement>(
        'Comparative importance of Price of dispute resolution',
      ).value,
    ).toBe('0.15');
    await user.click(screen.getByTestId('run-weighting'));
    await screen.findByTestId('weights-section', {}, { timeout: 8000 });

    const [saved] = await session.listAnalyses();
    expect(saved!.methodId).toBe('swara');
    const stored = await session.getAnalysis(saved!.id);
    const weights = (
      stored.record.result as { weights: { entries: { value: number }[] } }
    ).weights.entries.map((entry) => entry.value);
    const printed = sampleFixture('swara').result['weights']!.values as number[];
    weights.forEach((value, index) =>
      expect(Math.abs(value - printed[index]!)).toBeLessThan(0.005 + 1e-9),
    );
  });

  it('runs Fuzzy MARCOS on its sample with the weights of the paper', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn/library/fuzzy-marcos');
    await screen.findByTestId('library-page-fuzzy-marcos');
    const session = await createProject(user);
    await user.click(await screen.findByTestId('sample-open-fuzzy-marcos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/analysis/marcos'));
    await act(settleTransition);
    expect(await screen.findByTestId('sample-weights')).toBeTruthy();
    await user.click(screen.getByTestId('run-marcos'));
    await screen.findByTestId('ranking-table', {}, { timeout: 15000 });

    const [saved] = await session.listAnalyses();
    expect(saved!.methodId).toBe('fuzzy-marcos');
    const stored = await session.getAnalysis(saved!.id);
    expect(stored.configuration).toMatchObject({ weights: { source: 'sample' } });
    const best = (stored.record.result as { ranking: { alternativeId: string; rank: number }[] })
      .ranking;
    const first = best.find((entry) => entry.rank === 1)!;
    const dataset = session.document.model.datasets[0]!;
    expect(dataset.alternatives.find((a) => a.id === first.alternativeId)!.name).toBe('A23');
  }, 60_000);
});
