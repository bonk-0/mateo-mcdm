import { memoryFileStore, type FileStore, type ProjectSession } from '@mateo/project';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../commands/commands';
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

// AG Grid needs a real layout engine; the grid itself is covered by the end-to-end tests.
vi.mock('../editor/MatrixGrid', () => ({
  MatrixGrid: forwardRef(function MatrixGridStub(props: { rows: readonly unknown[] }, _ref) {
    return <div data-testid="grid-stub">{props.rows.length} rows</div>;
  }),
}));

async function openProject(
  user: ReturnType<typeof userEvent.setup>,
  labels = { dialog: 'New project', create: 'Create' },
): Promise<ProjectSession> {
  await waitFor(() => expect(getProjectController()).not.toBeNull());
  act(() => runCommand('file.new'));
  await user.click(
    within(await screen.findByRole('dialog', { name: labels.dialog })).getByRole('button', {
      name: labels.create,
    }),
  );
  await waitFor(() => expect(getProjectController()!.session).not.toBeNull());
  return getProjectController()!.session!;
}

describe('decision matrix editor page', () => {
  beforeEach(() => {
    store.files = memoryFileStore();
    autosaveSettings.delayMs = false;
    toast.dismiss();
  });
  afterEach(() => {
    autosaveSettings.delayMs = 1500;
  });

  it('asks for a project when none is open', async () => {
    renderApp('/matrix');
    expect(await screen.findByRole('heading', { name: 'No project is open' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open project' })).toBeTruthy();
  });

  it('creates a decision problem and shows the grid', async () => {
    const user = userEvent.setup();
    renderApp('/matrix');
    const session = await openProject(user);
    await user.click(await screen.findByRole('button', { name: 'Create decision problem' }));
    expect(await screen.findByTestId('grid-stub')).toBeTruthy();
    const dataset = session.document.model.datasets[0]!;
    expect(dataset.name).toBe('Decision problem');
    expect(dataset.matrices).toHaveLength(1);
    expect(dataset.matrices[0]!.role).toBe('decision');
    expect(screen.getByTestId('save-status').dataset['dirty']).toBe('true');
  });

  it('undoes and redoes, naming the step in the button', async () => {
    const user = userEvent.setup();
    renderApp('/matrix');
    const session = await openProject(user);
    await user.click(await screen.findByRole('button', { name: 'Create decision problem' }));
    await user.click(screen.getByRole('button', { name: 'Add criterion' }));
    await user.click(screen.getByRole('button', { name: 'Add criterion' }));
    expect(session.document.model.datasets[0]!.criteria.map((c) => c.code)).toEqual(['C1', 'C2']);

    const undo = screen.getByRole('button', { name: 'Undo: Add criterion' });
    await user.click(undo);
    expect(session.document.model.datasets[0]!.criteria).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Redo: Add criterion' }));
    expect(session.document.model.datasets[0]!.criteria).toHaveLength(2);

    await user.keyboard('{Control>}z{/Control}');
    expect(session.document.model.datasets[0]!.criteria).toHaveLength(1);
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(session.document.model.datasets[0]!.criteria).toHaveLength(2);
  });

  it('edits a criterion in the panel and groups typing into one undo step', async () => {
    const user = userEvent.setup();
    renderApp('/matrix');
    const session = await openProject(user);
    await user.click(await screen.findByRole('button', { name: 'Create decision problem' }));
    await user.click(screen.getByRole('button', { name: 'Add criterion' }));

    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, 'Price');
    await user.tab();
    expect(session.document.model.datasets[0]!.criteria[0]!.name).toBe('Price');
    await user.selectOptions(screen.getByLabelText('Direction'), 'cost');
    expect(session.document.model.datasets[0]!.criteria[0]!.direction).toBe('cost');

    session.undo();
    expect(session.document.model.datasets[0]!.criteria[0]!.direction).toBe('benefit');
    session.undo();
    // One step for all the typing: back to the generated name.
    expect(session.document.model.datasets[0]!.criteria[0]!.name).toBe('C1');
  });

  it('switching a criterion to fuzzy numbers converts its numbers in one step', async () => {
    const user = userEvent.setup();
    renderApp('/matrix');
    const session = await openProject(user);
    await user.click(await screen.findByRole('button', { name: 'Create decision problem' }));
    await user.click(screen.getByRole('button', { name: 'Add criterion' }));
    await user.click(screen.getByRole('tab', { name: 'Alternatives' }));
    await user.click(screen.getByRole('button', { name: 'Add alternative' }));

    const { setCells } = await import('@mateo/project');
    const dataset = session.document.model.datasets[0]!;
    session.execute(
      setCells(dataset.id, dataset.matrices[0]!.id, [
        {
          alternativeId: dataset.alternatives[0]!.id,
          criterionId: dataset.criteria[0]!.id,
          value: { kind: 'crisp', value: 4 },
        },
      ]),
    );
    await user.click(screen.getByRole('tab', { name: 'Criteria' }));
    await user.selectOptions(screen.getByLabelText('Number type'), 'tfn');

    const next = session.document.model.datasets[0]!;
    expect(next.criteria[0]!.numberType).toBe('tfn');
    expect(Object.values(next.matrices[0]!.cells)[0]).toEqual({
      [next.criteria[0]!.id]: { kind: 'tfn', value: { l: 4, m: 4, u: 4 } },
    });
    session.undo();
    const back = session.document.model.datasets[0]!;
    expect(back.criteria[0]!.numberType).toBe('crisp');
    expect(Object.values(back.matrices[0]!.cells)[0]![back.criteria[0]!.id]).toEqual({
      kind: 'crisp',
      value: 4,
    });
  });

  it('is fully translated to Turkish', async () => {
    const user = userEvent.setup();
    useSettings.getState().update({ language: 'tr' });
    renderApp('/matrix', { language: 'tr' });
    await openProject(user, { dialog: 'Yeni proje', create: 'Oluştur' });
    expect(await screen.findByRole('button', { name: 'Karar problemi oluştur' })).toBeTruthy();
  });
});

describe('linguistic scale manager', () => {
  beforeEach(() => {
    store.files = memoryFileStore();
    autosaveSettings.delayMs = false;
    toast.dismiss();
  });
  afterEach(() => {
    autosaveSettings.delayMs = 1500;
  });

  it('asks for a project when none is open', async () => {
    renderApp('/settings/scales');
    expect(await screen.findByRole('heading', { name: 'No project is open' })).toBeTruthy();
  });

  it('adds a predefined scale, previews it and reports invalid values', async () => {
    const user = userEvent.setup();
    renderApp('/settings/scales');
    const session = await openProject(user);
    await user.click(await screen.findByRole('button', { name: 'Add a predefined scale' }));

    const scale = session.document.model.scales[0]!;
    expect(scale).toMatchObject({ id: 'five-level', sourceId: 'five-level' });
    expect(scale.terms).toHaveLength(5);
    expect(screen.getByTestId('scale-status').textContent).toBe('The scale is valid.');

    const chart = screen.getByRole('img', {
      name: /Membership functions of the terms of 5-level scale/,
    });
    expect(chart.querySelectorAll('polygon')).toHaveLength(5);

    // A term that is not above the previous one is reported.
    const l = screen.getByLabelText('l 2');
    await user.clear(l);
    await user.type(l, '0');
    expect(session.document.model.scales[0]!.terms[1]!.value.l).toBe(0);
    await waitFor(() =>
      expect(screen.getByTestId('scale-status').textContent).toContain('Problems with this scale'),
    );

    session.undo();
    await waitFor(() =>
      expect(screen.getByTestId('scale-status').textContent).toBe('The scale is valid.'),
    );
  });

  it('creates and edits a custom scale, then deletes it with undo', async () => {
    const user = userEvent.setup();
    renderApp('/settings/scales');
    const session = await openProject(user);
    await user.click(await screen.findByRole('button', { name: 'Create a custom scale' }));

    const name = screen.getByRole('textbox', { name: 'Scale name' });
    await user.clear(name);
    await user.type(name, 'Quality');
    expect(session.document.model.scales[0]!.name).toEqual({ text: 'Quality' });

    await user.click(screen.getByRole('button', { name: 'Add term' }));
    expect(session.document.model.scales[0]!.terms).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Delete scale' }));
    expect(session.document.model.scales).toHaveLength(0);
    session.undo();
    expect(session.document.model.scales).toHaveLength(1);
  });
});
