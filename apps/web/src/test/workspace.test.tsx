import { runMethod, textLiteral } from '@mateo/engine';
import { criticMethod, marcosMethod } from '@mateo/methods';
import {
  addDataset,
  memoryFileStore,
  randomId,
  type CellValue,
  type Dataset,
  type FileStore,
  type ProjectSession,
} from '@mateo/project';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../commands/commands';
import { autosaveSettings } from '../project/autosaveSettings';
import type * as BrowserModule from '../project/browser';
import { getProjectController } from '../project/store';
import { useSettings } from '../settings/store';
import type * as RunnerModule from '../workspace/runner';
import { renderApp } from './renderApp';

const store = vi.hoisted(() => ({ files: undefined as FileStore | undefined }));
const runs = vi.hoisted(() => ({ count: 0 }));

vi.mock('../project/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof BrowserModule>()),
  browserFileStore: () => Promise.resolve(store.files),
}));

// Counts the runs, so a test can tell a recalculation from a stored result.
vi.mock('../workspace/runner', async (importOriginal) => {
  const actual = await importOriginal<typeof RunnerModule>();
  return {
    ...actual,
    runJob: (job: Parameters<typeof actual.runJob>[0]) => {
      runs.count += 1;
      return actual.runJob(job);
    },
  };
});

// ECharts needs a real layout engine; the chart options are covered by their own tests.
vi.mock('../workspace/charts/EChart', () => ({
  EChart: ({ label }: { label: string }) => <div role="img" aria-label={label} />,
}));

const VALUES = [
  [250, 16, 12],
  [200, 16, 8],
  [300, 32, 16],
  [275, 32, 8],
];

function sampleDataset(): Dataset {
  const alternatives = VALUES.map((_, i) => ({
    id: `alt-${i + 1}`,
    code: `A${i + 1}`,
    name: `Phone ${i + 1}`,
    description: '',
    group: '',
  }));
  const criteria = [
    { name: 'Price', direction: 'cost' as const },
    { name: 'Memory', direction: 'benefit' as const },
    { name: 'Camera', direction: 'benefit' as const },
  ].map((item, j) => ({
    id: `crit-${j + 1}`,
    code: `C${j + 1}`,
    name: item.name,
    description: '',
    direction: item.direction,
    unit: '',
    numberType: 'crisp' as const,
    scaleId: null,
  }));
  const cells: Record<string, Record<string, CellValue>> = {};
  alternatives.forEach((alternative, i) => {
    cells[alternative.id] = Object.fromEntries(
      criteria.map((criterion, j) => [criterion.id, { kind: 'crisp', value: VALUES[i]![j]! }]),
    );
  });
  return {
    id: randomId(),
    name: 'Phones',
    description: '',
    createdAt: new Date().toISOString(),
    criteria,
    alternatives,
    matrices: [{ id: randomId(), name: 'Decision matrix', role: 'decision', cells }],
  };
}

function engineMatrix() {
  return {
    alternatives: VALUES.map((_, i) => ({
      id: `alt-${i + 1}`,
      name: textLiteral(`Phone ${i + 1}`),
    })),
    criteria: ['Price', 'Memory', 'Camera'].map((name, j) => ({
      id: `crit-${j + 1}`,
      name: textLiteral(name),
      direction: j === 0 ? ('cost' as const) : ('benefit' as const),
      numberType: 'crisp',
    })),
    values: VALUES,
  };
}

/**
 * The shell fades pages in and out. While the previous page is still leaving, the new page
 * can be replaced once by an identical one, which would drop what a test just typed.
 * Waiting for the transition to end keeps the tests deterministic under load.
 */
const settleTransition = () => new Promise((resolve) => setTimeout(resolve, 700));

async function openProjectWithData(
  user: ReturnType<typeof userEvent.setup>,
): Promise<ProjectSession> {
  await waitFor(() => expect(getProjectController()).not.toBeNull());
  act(() => runCommand('file.new'));
  await user.click(
    within(await screen.findByRole('dialog', { name: 'New project' })).getByRole('button', {
      name: 'Create',
    }),
  );
  await waitFor(() => expect(getProjectController()!.session).not.toBeNull());
  const session = getProjectController()!.session!;
  act(() => session.execute(addDataset(sampleDataset())));
  return session;
}

describe('method workspaces', () => {
  beforeEach(() => {
    store.files = memoryFileStore();
    autosaveSettings.delayMs = false;
    runs.count = 0;
    // Page transitions would animate; tests run without them.
    useSettings.getState().update({ motion: 'reduce' });
  });
  afterEach(() => {
    autosaveSettings.delayMs = 1500;
  });

  it('asks for a project when none is open', async () => {
    renderApp('/methods/weighting');
    expect(await screen.findByRole('heading', { name: 'No project is open' })).toBeTruthy();
  });

  it('runs CRITIC, passes the weights to MARCOS, and reads the stored analysis back without recalculating', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/methods/weighting');
    const session = await openProjectWithData(user);

    // CRITIC: weights match the engine, and the run is stored with its trace.
    await user.click(await screen.findByTestId('run-weighting'));
    await screen.findByTestId('weights-section', {}, { timeout: 8000 });
    const expectedWeights = runMethod(criticMethod, { matrix: engineMatrix() }).result;
    const stored = await session.listAnalyses();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.methodId).toBe('critic');
    const critic = await session.getAnalysis(stored[0]!.id);
    expect(critic.record.result).toEqual(expectedWeights);
    expect(critic.record.trace.steps.length).toBeGreaterThan(3);
    // Every step of the trace is viewable.
    for (const step of critic.record.trace.steps) {
      expect(screen.getByTestId(`trace-step-${step.id}`)).toBeTruthy();
    }

    // One click carries the weights over to MARCOS.
    await user.click(screen.getByTestId('use-in-marcos'));
    await screen.findByTestId('chosen-weights');
    expect(router.state.location.pathname).toBe('/analysis/marcos');
    await act(settleTransition);
    expect(screen.getByTestId('weights-analysis')).toHaveProperty('value', critic.id);

    await user.click(screen.getByTestId('run-marcos'));
    const table = await screen.findByTestId('ranking-table', {}, { timeout: 8000 });
    const expected = runMethod(marcosMethod, {
      matrix: engineMatrix(),
      weights: { numberType: 'crisp', entries: expectedWeights.weights.entries },
    }).result;
    const shownRanks = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('rowheader')[0]!.textContent);
    const bestFirst = [...expected.ranking].sort((a, b) => a.rank - b.rank);
    expect(shownRanks).toEqual(bestFirst.map((entry) => `Phone ${entry.alternativeId.slice(-1)}`));

    const all = await session.listAnalyses();
    expect(all.map((item) => item.methodId)).toEqual(['critic', 'marcos']);
    const marcos = await session.getAnalysis(all[1]!.id);
    expect(marcos.record.result).toEqual(expected);
    expect(marcos.configuration).toMatchObject({
      workspace: 'ranking',
      weights: { source: 'analysis', analysisId: critic.id },
    });
    const runsSoFar = runs.count;
    expect(runsSoFar).toBe(2);

    // Opening the stored analysis in Results shows it without running anything.
    await act(() => router.navigate(`/analysis/results?analysis=${marcos.id}`));
    expect(await screen.findByTestId('ranking-table', {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.getByTestId('trace-step-final-utility')).toBeTruthy();
    expect(runs.count).toBe(runsSoFar);
  });

  it('shows what is wrong with the data instead of running', async () => {
    const user = userEvent.setup();
    renderApp('/methods/weighting');
    const session = await openProjectWithData(user);
    const dataset = session.document.model.datasets[0]!;
    const { setCells } = await import('@mateo/project');
    act(() =>
      session.execute(
        setCells(dataset.id, dataset.matrices[0]!.id, [
          { alternativeId: 'alt-2', criterionId: 'crit-2', value: null },
        ]),
      ),
    );
    await user.click(await screen.findByTestId('run-weighting'));
    expect(await screen.findByTestId('dataset-problems')).toBeTruthy();
    expect(screen.getByText('Phone 2 has no value for Memory.')).toBeTruthy();
    expect(await session.listAnalyses()).toHaveLength(0);
  });

  it('blocks MARCOS until every weight is entered, then runs with manual weights', async () => {
    const user = userEvent.setup();
    renderApp('/analysis/marcos');
    const session = await openProjectWithData(user);
    await user.click(await screen.findByTestId('run-marcos'));
    expect(await screen.findByText('Enter a weight for every criterion.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Fill with equal weights' }));
    await user.click(screen.getByTestId('run-marcos'));
    await screen.findByTestId('ranking-table', {}, { timeout: 8000 });
    const [saved] = await session.listAnalyses();
    expect(saved!.methodId).toBe('marcos');
    expect((await session.getAnalysis(saved!.id)).configuration).toMatchObject({
      weights: { source: 'manual' },
    });
  });

  it('re-ranks live when a weight slider moves and saves the scenario in the project', async () => {
    const user = userEvent.setup();
    renderApp('/analysis/marcos');
    const session = await openProjectWithData(user);
    await user.click(await screen.findByRole('button', { name: 'Fill with equal weights' }));
    await user.click(screen.getByTestId('run-marcos'));
    await screen.findByTestId('ranking-table', {}, { timeout: 8000 });
    await screen.findByTestId('sensitivity-panel');

    fireEvent.change(screen.getByTestId('weight-slider-1'), { target: { value: '0.8' } });
    // The other sliders follow, and the sum stays 1.
    expect(Number(screen.getByTestId<HTMLInputElement>('weight-slider-0').value)).toBeCloseTo(
      0.1,
      6,
    );
    expect(Number(screen.getByTestId<HTMLInputElement>('weight-slider-2').value)).toBeCloseTo(
      0.1,
      6,
    );
    expect(screen.getByTestId('weights-sum').textContent).toContain('1');

    // The live ranking is what the engine gives for these weights.
    const weights = [0.1, 0.8, 0.1];
    const expected = runMethod(marcosMethod, {
      matrix: engineMatrix(),
      weights: {
        numberType: 'crisp',
        entries: ['crit-1', 'crit-2', 'crit-3'].map((criterionId, i) => ({
          criterionId,
          value: weights[i]!,
        })),
      },
    }).result;
    const best = [...expected.ranking].sort((a, b) => a.rank - b.rank)[0]!;
    await waitFor(() => {
      const row = within(screen.getByTestId('live-ranking'))
        .getAllByRole('listitem')
        .find((item) => item.textContent?.startsWith('1'));
      expect(row?.getAttribute('data-alternative')).toBe(best.alternativeId);
    });

    // The chart is drawn on request, from engine runs.
    await user.click(screen.getByTestId('sweep-run'));
    await screen.findByRole('img', { name: /Ranks of the alternatives/ });

    await user.type(screen.getByTestId('scenario-name'), 'Memory first');
    await user.click(screen.getByTestId('scenario-save'));
    const list = await screen.findByTestId('scenario-list');
    expect(within(list).getByText('Memory first')).toBeTruthy();
    const dataset = session.document.model.datasets[0]!;
    const stored = session.document.settings[`sensitivity.scenarios.${dataset.id}`] as {
      name: string;
      weights: Record<string, number>;
    }[];
    expect(stored).toHaveLength(1);
    expect(stored[0]!.name).toBe('Memory first');
    expect(stored[0]!.weights['crit-2']).toBeCloseTo(0.8, 12);
  });

  it('runs Fuzzy MARCOS with the TFN model on a plain-number matrix', async () => {
    const user = userEvent.setup();
    renderApp('/analysis/marcos');
    const session = await openProjectWithData(user);
    await user.click(await screen.findByLabelText(/Fuzzy MARCOS \(TFN\)/));
    await user.click(screen.getByRole('button', { name: 'Fill with equal weights' }));
    await user.click(screen.getByTestId('run-marcos'));
    await screen.findByTestId('ranking-table', {}, { timeout: 8000 });
    const [saved] = await session.listAnalyses();
    expect(saved).toMatchObject({ methodId: 'fuzzy-marcos', numberType: 'tfn' });
    expect(screen.getByTestId('trace-step-defuzzification')).toBeTruthy();
  });

  it('runs SWARA from an ordered list of criteria', async () => {
    const user = userEvent.setup();
    renderApp('/methods/weighting');
    const session = await openProjectWithData(user);
    await user.click(await screen.findByLabelText(/^SWARA/));
    await user.click(screen.getByTestId('run-weighting'));
    expect(
      await screen.findByText(
        'Enter the comparative importance of every criterion except the first.',
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Move Memory up' }));
    await user.type(screen.getByLabelText('Comparative importance of Price'), '0,2');
    await user.type(screen.getByLabelText('Comparative importance of Camera'), '0.3');
    await user.click(screen.getByTestId('run-weighting'));
    await screen.findByTestId('weights-section', {}, { timeout: 8000 });
    const [saved] = await session.listAnalyses();
    const stored = await session.getAnalysis(saved!.id);
    expect(stored.methodId).toBe('swara');
    expect(stored.methodInput).toMatchObject({
      criteria: [{ id: 'crit-2' }, { id: 'crit-1' }, { id: 'crit-3' }],
      comparativeImportance: [null, 0.2, 0.3],
    });
  });
});
