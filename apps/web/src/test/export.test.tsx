import { importFile } from '@mateo/io';
import {
  addDataset,
  memoryFileStore,
  randomId,
  type CellValue,
  type Dataset,
  type FileStore,
  type ProjectSession,
} from '@mateo/project';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../commands/commands';
import { autosaveSettings } from '../project/autosaveSettings';
import type * as BrowserModule from '../project/browser';
import { getProjectController } from '../project/store';
import { useSettings } from '../settings/store';
import type * as DownloadModule from '../export/download';
import { renderApp } from './renderApp';

const store = vi.hoisted(() => ({ files: undefined as FileStore | undefined }));
const saved = vi.hoisted(() => ({ files: [] as { name: string; bytes: Uint8Array }[] }));

vi.mock('../project/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof BrowserModule>()),
  browserFileStore: () => Promise.resolve(store.files),
}));

// Collects what would be downloaded.
vi.mock('../export/download', async (importOriginal) => ({
  ...(await importOriginal<typeof DownloadModule>()),
  saveBytes: (name: string, bytes: Uint8Array) => {
    saved.files.push({ name, bytes });
  },
}));

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

describe('export', () => {
  beforeEach(() => {
    store.files = memoryFileStore();
    autosaveSettings.delayMs = false;
    saved.files = [];
    useSettings.getState().update({ motion: 'reduce' });
  });
  afterEach(() => {
    autosaveSettings.delayMs = 1500;
  });

  it('exports the matrix as a workbook that imports back to the same values', async () => {
    const user = userEvent.setup();
    renderApp('/matrix');
    await openProjectWithData(user);
    await user.click(await screen.findByTestId('export-matrix'));
    const dialog = await screen.findByTestId('export-dialog');
    await user.selectOptions(within(dialog).getByTestId('export-language'), 'en');
    await waitFor(() =>
      expect(within(dialog).getByTestId('export-save')).toHaveProperty('disabled', false),
    );
    await user.click(within(dialog).getByTestId('export-save'));

    await waitFor(() => expect(saved.files).toHaveLength(1));
    expect(saved.files[0]!.name).toBe('Phones - matrix.xlsx');
    const imported = importFile(saved.files[0]!.bytes, { fileName: 'Phones - matrix.xlsx' });
    expect(imported.validation.errors).toEqual([]);
    expect(imported.model!.values).toEqual(VALUES);
    expect(imported.model!.criteria.map((item) => [item.name.text, item.direction])).toEqual([
      ['Price', 'cost'],
      ['Memory', 'benefit'],
      ['Camera', 'benefit'],
    ]);
  });

  it('exports one table as CSV in the chosen language', async () => {
    const user = userEvent.setup();
    renderApp('/matrix');
    await openProjectWithData(user);
    await user.click(await screen.findByTestId('export-matrix'));
    const dialog = await screen.findByTestId('export-dialog');
    await user.selectOptions(within(dialog).getByTestId('export-format'), 'csv');
    await user.selectOptions(within(dialog).getByTestId('export-language'), 'tr');
    await waitFor(() =>
      expect(within(dialog).getByTestId('export-save')).toHaveProperty('disabled', false),
    );
    await user.click(within(dialog).getByTestId('export-save'));
    await waitFor(() => expect(saved.files).toHaveLength(1));
    expect(saved.files[0]!.name).toBe('Phones - matrix - Veri.csv');
    const text = new TextDecoder().decode(saved.files[0]!.bytes);
    expect(text).toContain('Alternatif;Price;Memory;Camera');
    expect(text).toContain('Yön;Maliyet;Fayda;Fayda');
    expect(text).toContain('Phone 1;250;16;12');
  });

  it('exports a stored analysis with every step of its trace', async () => {
    const user = userEvent.setup();
    renderApp('/methods/weighting');
    const session = await openProjectWithData(user);
    await user.click(await screen.findByTestId('run-weighting'));
    await screen.findByTestId('weights-section', {}, { timeout: 8000 });
    const [summary] = await session.listAnalyses();
    const analysis = await session.getAnalysis(summary!.id);

    await user.click(await screen.findByTestId('export-analysis'));
    const dialog = await screen.findByTestId('export-dialog');
    await user.selectOptions(within(dialog).getByTestId('export-language'), 'en');
    await user.selectOptions(within(dialog).getByTestId('export-format'), 'zip');
    await waitFor(() =>
      expect(within(dialog).getByTestId('export-save')).toHaveProperty('disabled', false),
    );
    await user.click(within(dialog).getByTestId('export-save'));
    await waitFor(() => expect(saved.files).toHaveLength(1));
    expect(saved.files[0]!.name).toMatch(/\.zip$/);
    // The ZIP lists a file for each step: their names are in the central directory.
    const text = new TextDecoder('latin1').decode(saved.files[0]!.bytes);
    for (const step of analysis.record.trace.steps) {
      expect(text).toContain(`${step.index + 1}. `);
    }
    expect(text).toContain('Info.csv');
    expect(text).toContain('Weights.csv');
  });
});
