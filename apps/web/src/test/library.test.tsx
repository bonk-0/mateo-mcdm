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

/** Opens the folded reference of a method page: formulas, the paper's example, sources. */
async function openReference(user: ReturnType<typeof userEvent.setup>, sampleId: string) {
  const section = await screen.findByTestId(`library-reference-toggle-${sampleId}`);
  await user.click(within(section).getAllByRole('button')[0]!);
  return section;
}

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

  it('opens Learn on three questions, each with its lessons', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn');
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn/library'));
    const weighting = within(await screen.findByTestId('learn-topic-weighting'));
    expect(
      weighting.getByRole('heading', { name: 'How important is each criterion?' }),
    ).toBeTruthy();
    for (const id of ['critic', 'merec', 'swara'])
      expect(weighting.getByTestId(`library-card-${id}`)).toBeTruthy();
    const ranking = within(screen.getByTestId('learn-topic-ranking'));
    expect(ranking.getByTestId('library-card-marcos').textContent).toMatch(/7 steps/u);
    const fuzzy = within(screen.getByTestId('learn-topic-fuzzy'));
    expect(fuzzy.getByTestId('library-card-fuzzy').textContent).toMatch(/5 steps/u);
    await user.click(fuzzy.getByTestId('library-card-playground'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn/playground'));
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

  it('teaches a method on the phone example and keeps the paper under Reference', async () => {
    const user = userEvent.setup();
    renderApp('/learn/library/marcos');
    const page = await screen.findByTestId('library-page-marcos');
    expect(screen.getByTestId('library-purpose').textContent).not.toBe('');
    expect(within(page).getByRole('heading', { name: 'Learn step by step' })).toBeTruthy();
    // The lesson runs the real method on three phones.
    const lesson = screen.getByTestId('lesson');
    expect(lesson.textContent).toContain('Phone A');
    expect(lesson.textContent).toContain('Price (₺)');
    expect(screen.queryByRole('heading', { name: 'Steps and formulas' })).toBeNull();

    await openReference(user, 'marcos');
    for (const heading of [
      'Introduction',
      'Inputs',
      'Supported number types',
      'Steps and formulas',
      'Reference example',
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
    // References link to the papers of docs/methods.
    const references = within(screen.getByTestId('library-references'));
    expect(references.getByRole('link', { name: /10\.1016\/j\.cie\.2019\.106231/u })).toBeTruthy();
    expect(
      within(screen.getByTestId('library-related')).getByRole('link', { name: 'Fuzzy MARCOS' }),
    ).toBeTruthy();
  });

  it('ends a lesson with what to do next', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn/library/critic');
    await screen.findByTestId('library-page-critic');
    const lesson = screen.getByTestId('lesson');
    const markers = within(lesson).getAllByRole('button', { name: /^Step \d+:/u });
    await user.click(markers.at(-1)!);
    expect(screen.queryByTestId('lesson-next')).toBeNull();
    await user.click(screen.getByTestId('lesson-own-data'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('shows the pages in Turkish', async () => {
    const user = userEvent.setup();
    renderApp('/learn/library/critic');
    await screen.findByTestId('library-page-critic');
    act(() => useSettings.getState().update({ language: 'tr' }));
    const page = await screen.findByTestId('library-page-critic');
    expect(await within(page).findByRole('heading', { name: 'Adım adım öğren' })).toBeTruthy();
    expect(screen.getByTestId('lesson').textContent).toContain('Telefon A');
    await openReference(user, 'critic');
    expect(within(page).getByRole('heading', { name: 'Adımlar ve formüller' })).toBeTruthy();
    expect(within(page).getByRole('heading', { name: 'Kaynaklar' })).toBeTruthy();
  });

  it.each(['critic', 'merec', 'swara', 'fuzzy-marcos'])('teaches %s step by step', async (id) => {
    renderApp(`/learn/library/${id}`);
    await screen.findByTestId(`library-page-${id}`);
    expect(screen.getByTestId('lesson-idea').textContent).not.toBe('');
    expect(screen.getByTestId('lesson-next')).toBeTruthy();
  });

  it('puts classical and fuzzy SWARA on one page', async () => {
    const user = userEvent.setup();
    renderApp('/learn/library/swara');
    expect(await screen.findByTestId('library-variant-swara')).toBeTruthy();
    expect(screen.queryByTestId('library-variant-fuzzy-swara')).toBeNull();
    await user.click(screen.getByRole('tab', { name: 'Fuzzy SWARA (IMF SWARA)' }));
    expect(await screen.findByTestId('library-variant-fuzzy-swara')).toBeTruthy();
    await openReference(user, 'fuzzy-swara');
    const references = within(screen.getByTestId('library-references'));
    expect(references.getByRole('link', { name: /10\.3390\/axioms10020092/u })).toBeTruthy();
  });

  it('opens MARCOS sample data in the workspace and reproduces the printed ranking', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn/library/marcos');
    await screen.findByTestId('library-page-marcos');
    await openReference(user, 'marcos');
    // Without a project the button creates one first.
    expect(screen.getByTestId('sample-open-marcos').textContent).toMatch(/Create a project/u);
    const session = await createProject(user);
    await user.click(await screen.findByRole('button', { name: 'Try it with the sample data' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/result'));
    expect(session.document.model.datasets).toHaveLength(1);
    await act(settleTransition);
    // The result step ranks the matrix of the paper with its weights, without a Run button.
    await screen.findByTestId('winner', {}, { timeout: 8000 });
    expect(session.document.model.datasets[0]!.alternatives).toHaveLength(8);

    const [saved] = await waitFor(async () => {
      const analyses = await session.listAnalyses();
      expect(analyses).toHaveLength(1);
      return analyses;
    });
    expect(saved!.methodId).toBe('marcos');
    const stored = await session.getAnalysis(saved!.id);
    const ranks = (stored.record.result as { ranking: { rank: number }[] }).ranking.map(
      (entry) => entry.rank,
    );
    expect(ranks).toEqual(sampleFixture('marcos').result['ranking']!.values);

    // Opening the sample again reuses its decision problem.
    await act(() => router.navigate('/learn/library/marcos'));
    await openReference(user, 'marcos');
    await user.click(await screen.findByTestId('sample-open-marcos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/result'));
    expect(session.document.model.datasets).toHaveLength(1);
  });

  it('fills in SWARA from its sample and reproduces the printed weights', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/learn/library/swara');
    await screen.findByTestId('library-page-swara');
    await openReference(user, 'swara');
    const session = await createProject(user);
    await user.click(await screen.findByTestId('sample-open-swara'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/weights'));
    await act(settleTransition);

    expect(await screen.findByTestId<HTMLInputElement>('weight-mode-order')).toHaveProperty(
      'checked',
      true,
    );
    expect(
      screen.getByLabelText<HTMLInputElement>(
        'How much less Price of dispute resolution matters than the criterion above it',
      ).value,
    ).toBe('0.15');
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
    await openReference(user, 'fuzzy-marcos');
    const session = await createProject(user);
    await user.click(await screen.findByTestId('sample-open-fuzzy-marcos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/result'));
    await act(settleTransition);
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
