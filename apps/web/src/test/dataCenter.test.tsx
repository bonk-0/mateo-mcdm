import { memoryFileStore, type FileStore, type ProjectSession } from '@mateo/project';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { forwardRef } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../commands/commands';
import { autosaveSettings } from '../project/autosaveSettings';
import type * as BrowserModule from '../project/browser';
import { getProjectController } from '../project/store';
import { useSettings } from '../settings/store';
import { createAppI18n } from '../i18n/setup';
import { findUntranslated, pseudoProcessor } from './pseudo';
import { renderApp } from './renderApp';

const store = vi.hoisted(() => ({ files: undefined as FileStore | undefined }));

vi.mock('../project/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof BrowserModule>()),
  browserFileStore: () => Promise.resolve(store.files),
}));

// The editor page opens after an import; the grid itself is covered by its own tests.
vi.mock('../editor/MatrixGrid', () => ({
  MatrixGrid: forwardRef(function MatrixGridStub(props: { rows: readonly unknown[] }, _ref) {
    return <div data-testid="grid-stub">{props.rows.length} rows</div>;
  }),
}));

const FIXTURES = resolve(import.meta.dirname, '../../../../packages/io/fixtures/files') + '/';

function fixture(name: string): File {
  const bytes = readFileSync(FIXTURES + name);
  return new File([new Uint8Array(bytes)], name);
}

const FILE_TEXTS = ['Veri'];

type User = ReturnType<typeof userEvent.setup>;

async function openProject(user: User): Promise<ProjectSession> {
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

async function openWizard(user: User, file: File): Promise<void> {
  await user.click(await screen.findByTestId('import-file'));
  const input = await screen.findByTestId('import-file-input');
  await user.upload(input, file);
}

const next = (user: User) => user.click(screen.getByRole('button', { name: /^Next/ }));

describe('Data Center', () => {
  beforeEach(() => {
    store.files = memoryFileStore();
    autosaveSettings.delayMs = false;
    toast.dismiss();
  });
  afterEach(() => {
    autosaveSettings.delayMs = 1500;
  });

  it('asks for a project when none is open', async () => {
    renderApp('/data/sources');
    expect(await screen.findByRole('heading', { name: 'No decision open yet' })).toBeTruthy();
  });

  it('imports a Turkish XLSX through every step and stores the original file', async () => {
    const user = userEvent.setup();
    renderApp('/data/sources');
    const session = await openProject(user);
    await openWizard(user, fixture('08-tr-tez-tablosu.xlsx'));

    // Worksheet, structure, columns.
    expect(await screen.findByTestId('step-sheet')).toBeTruthy();
    await next(user);
    expect(await screen.findByTestId('step-structure')).toBeTruthy();
    await next(user);
    const table = await screen.findByTestId('criteria-table');
    expect(within(table).getAllByRole('row')).toHaveLength(4); // header + 3 criteria

    // The file gives no directions: the import is blocked until each one is chosen.
    expect(screen.getByTestId('wizard-blocked')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'All cost' }));
    await waitFor(() => expect(screen.queryByTestId('wizard-blocked')).toBeNull());
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Direction of Alan/ }),
      'benefit',
    );

    await next(user); // data types
    await next(user); // missing values
    expect(await screen.findByTestId('missing-none')).toBeTruthy();
    await next(user); // validation
    expect(await screen.findByTestId('validation-ok')).toBeTruthy();
    await next(user); // preview
    const preview = await screen.findByTestId('preview-table');
    expect(within(preview).getByText('Gebze')).toBeTruthy();
    await next(user); // confirm
    expect(await screen.findByDisplayValue('08-tr-tez-tablosu')).toBeTruthy();
    await user.click(screen.getByRole('checkbox', { name: /import profile/ }));
    await user.click(screen.getByTestId('confirm-import'));

    // The dataset is in the project, the editor opens on it.
    await waitFor(() => expect(session.document.model.datasets).toHaveLength(1));
    const dataset = session.document.model.datasets[0]!;
    expect(dataset.name).toBe('08-tr-tez-tablosu');
    expect(dataset.alternatives.map((a) => a.name)).toEqual([
      'Gebze',
      'Tuzla',
      'Dilovası',
      'Çerkezköy',
    ]);
    expect(dataset.criteria.map((c) => [c.name, c.direction])).toEqual([
      ['Kira (TL/ay)', 'cost'],
      ['Alan (m²)', 'benefit'],
      ['Limana uzaklık (km)', 'cost'],
    ]);
    const first = dataset.alternatives[0]!;
    expect(dataset.matrices[0]!.cells[first.id]![dataset.criteria[0]!.id]).toEqual({
      kind: 'crisp',
      value: 185000,
    });
    expect(await screen.findByTestId('grid-stub')).toBeTruthy();

    // Original file, import record and profile are stored in the project.
    const files = await session.listSourceFiles();
    expect(files.map((f) => f.name)).toEqual(['08-tr-tez-tablosu.xlsx']);
    expect(await session.readSourceFile(files[0]!.id)).toEqual(
      new Uint8Array(readFileSync(FIXTURES + '08-tr-tez-tablosu.xlsx')),
    );
    const imports = await session.listImports();
    expect(imports).toHaveLength(1);
    expect(imports[0]!.datasetId).toBe(dataset.id);
    expect(imports[0]!.sourceFileId).toBe(files[0]!.id);
    expect((await session.listImportProfiles()).map((p) => p.name)).toEqual(['08-tr-tez-tablosu']);
  });

  it('imports an English CSV with fuzzy numbers in cells', async () => {
    const user = userEvent.setup();
    renderApp('/data/sources');
    const session = await openProject(user);
    await openWizard(user, fixture('15-en-tfn-in-cells.csv'));
    expect(await screen.findByTestId('step-structure')).toBeTruthy(); // no sheet step for CSV
    await next(user);
    expect(await screen.findAllByText('Fuzzy (in one cell)')).toHaveLength(2);
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await user.click(await screen.findByTestId('confirm-import'));
    await waitFor(() => expect(session.document.model.datasets).toHaveLength(1));
    const dataset = session.document.model.datasets[0]!;
    expect(dataset.criteria.map((c) => [c.name, c.direction, c.numberType])).toEqual([
      ['Comfort', 'benefit', 'tfn'],
      ['Fuel use', 'cost', 'tfn'],
    ]);
    const carA = dataset.alternatives[0]!;
    expect(dataset.matrices[0]!.cells[carA.id]![dataset.criteria[0]!.id]).toEqual({
      kind: 'tfn',
      value: { l: 3, m: 5, u: 7 },
    });
  });

  it('does not guess an ambiguous number format and shows both readings', async () => {
    const user = userEvent.setup();
    renderApp('/data/sources');
    const session = await openProject(user);
    await openWizard(user, fixture('05-ambiguous-thousands.csv'));
    await next(user); // columns
    await next(user); // types
    expect(await screen.findByTestId('number-format-status')).toHaveProperty(
      'textContent',
      expect.stringContaining('Choose the format'),
    );
    const samples = within(screen.getByTestId('number-samples'));
    expect(samples.getAllByText('1,234').length).toBeGreaterThan(0);
    // "1,234" is 1234 with a decimal point and 1.234 with a decimal comma.
    expect(samples.getAllByText('1234').length).toBeGreaterThan(0);
    expect(samples.getAllByText('1.234').length).toBeGreaterThan(0);

    await next(user);
    await next(user);
    // Errors block confirming, so no dataset can be made yet.
    expect(screen.getByTestId('wizard-blocked')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /^Back/ }));
    await user.click(screen.getByRole('button', { name: /^Back/ }));
    await user.click(screen.getByRole('radio', { name: /Decimal point/ }));
    expect(session.document.model.datasets).toHaveLength(0);
    await waitFor(() => expect(screen.queryByTestId('wizard-blocked')).not.toBeNull());
  });

  it('starts an import from text pasted anywhere on the page', async () => {
    const user = userEvent.setup();
    renderApp('/data/sources');
    const session = await openProject(user);
    await screen.findByTestId('import-file');
    act(() => {
      // jsdom has no DataTransfer: a plain event carries the clipboard data.
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => 'Name\tPrice\tQuality\nX\t10\t3\nY\t12,5\t4\nZ\t9\t5\n' },
      });
      document.body.dispatchEvent(event);
    });
    expect(await screen.findByTestId('step-structure')).toBeTruthy();
    await next(user);
    await user.click(screen.getByRole('button', { name: 'All benefit' }));
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await user.click(await screen.findByTestId('confirm-import'));
    await waitFor(() => expect(session.document.model.datasets).toHaveLength(1));
    const dataset = session.document.model.datasets[0]!;
    expect(dataset.alternatives.map((a) => a.name)).toEqual(['X', 'Y', 'Z']);
    const files = await session.listSourceFiles();
    expect(files[0]!.name).toBe('Pasted table.tsv');
  });

  it('lists the original file, the import history and the saved profile', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/data/sources');
    await openProject(user);
    await openWizard(user, fixture('08-tr-tez-tablosu.xlsx'));
    await next(user);
    await next(user);
    await user.click(await screen.findByRole('button', { name: 'All cost' }));
    for (let step = 0; step < 5; step += 1) await next(user);
    await user.click(screen.getByRole('checkbox', { name: /import profile/ }));
    await user.click(screen.getByTestId('confirm-import'));
    await screen.findByTestId('grid-stub');

    await act(() => router.navigate('/data/sources'));
    const files = await screen.findByTestId('file-list');
    expect(within(files).getByText('08-tr-tez-tablosu.xlsx')).toBeTruthy();
    const history = await screen.findByTestId('history-list');
    expect(within(history).getByText('08-tr-tez-tablosu.xlsx')).toBeTruthy();
    expect(within(history).getAllByText('08-tr-tez-tablosu').length).toBeGreaterThan(0);
    // Warnings of the import (directions the file did not give were set by the user).
    expect(within(screen.getByTestId('dataset-list')).getByText(/4 alternatives/)).toBeTruthy();
    expect(
      within(await screen.findByTestId('profile-list')).getByText('08-tr-tez-tablosu'),
    ).toBeTruthy();
  });

  it('applies a saved profile to a similar file', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/data/sources');
    const session = await openProject(user);
    // First import: choose directions and save them as a profile.
    await openWizard(user, fixture('08-tr-tez-tablosu.xlsx'));
    await next(user);
    await next(user);
    await user.click(await screen.findByRole('button', { name: 'All benefit' }));
    for (let step = 0; step < 5; step += 1) await next(user);
    await user.click(screen.getByRole('checkbox', { name: /import profile/ }));
    await user.click(screen.getByTestId('confirm-import'));
    await screen.findByTestId('grid-stub');
    expect(await session.listImportProfiles()).toHaveLength(1);

    // Second import of the same file with the profile: no direction has to be chosen again.
    await act(() => router.navigate('/data/sources'));
    await user.click(await screen.findByTestId('import-file'));
    await waitFor(() => screen.getByRole('combobox', { name: 'Import profile' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Import profile' }),
      '08-tr-tez-tablosu',
    );
    await user.upload(
      await screen.findByTestId('import-file-input'),
      fixture('08-tr-tez-tablosu.xlsx'),
    );
    await next(user); // sheet -> structure
    await next(user); // structure -> columns
    await screen.findByTestId('criteria-table');
    expect(screen.queryByTestId('wizard-blocked')).toBeNull();
    for (let step = 0; step < 5; step += 1) await next(user);
    await user.click(await screen.findByTestId('confirm-import'));
    await waitFor(() => expect(session.document.model.datasets).toHaveLength(2));
    const imports = await session.listImports();
    expect(imports[1]!.profileId).toBe((await session.listImportProfiles())[0]!.id);
  });

  it('shows no untranslated text in any wizard step', async () => {
    const user = userEvent.setup();
    const i18n = createAppI18n('en', {
      plugins: [pseudoProcessor],
      options: { postProcess: ['pseudo'] },
    });
    // Names that the file itself holds (headers, alternatives) are data, not interface text.
    const untranslated = () =>
      findUntranslated(screen.getByTestId('import-wizard')).filter(
        (text) => !FILE_TEXTS.some((name) => text.includes(name)),
      );
    renderApp('/data/sources', { i18n });
    await waitFor(() => expect(getProjectController()).not.toBeNull());
    act(() => runCommand('file.new'));
    await user.click(
      within(await screen.findByRole('dialog'))
        .getAllByRole('button')
        .find((b) => /⟦.*Create.*⟧/u.test(b.textContent ?? ''))!,
    );
    await waitFor(() => expect(getProjectController()!.session).not.toBeNull());
    await user.click(await screen.findByTestId('import-file'));
    expect(untranslated()).toEqual([]);
    await user.upload(
      await screen.findByTestId('import-file-input'),
      fixture('19-tr-eksik-ve-hatali.xlsx'),
    );
    for (let step = 0; step < 8; step += 1) {
      await screen.findByTestId(/^step-/);
      expect(untranslated()).toEqual([]);
      const button = screen.queryByRole('button', { name: /^⟦Next/u });
      if (!button) break;
      await user.click(button);
    }
  });

  it('is available in Turkish', async () => {
    const user = userEvent.setup();
    act(() => useSettings.getState().update({ language: 'tr' }));
    renderApp('/data/sources', { language: 'tr' });
    await waitFor(() => expect(getProjectController()).not.toBeNull());
    act(() => runCommand('file.new'));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Oluştur' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Dosya içe aktar' }));
    await user.upload(
      await screen.findByTestId('import-file-input'),
      fixture('08-tr-tez-tablosu.xlsx'),
    );
    expect(await screen.findByRole('region', { name: 'Çalışma sayfası' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /^İleri/ }));
    await user.click(screen.getByRole('button', { name: /^İleri/ }));
    expect(await screen.findByText(/Mateo tahmin etmez/)).toBeTruthy();
  });
});
