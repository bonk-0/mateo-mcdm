import { addDataset, memoryFileStore, PROJECT_MESSAGES, type FileStore } from '@mateo/project';
import { resources } from '@mateo/i18n';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCommand } from '../commands/commands';
import { useSettings } from '../settings/store';
import type * as BrowserModule from '../project/browser';
import { getProjectController } from '../project/store';
import { renderApp } from './renderApp';

/** The browser file store of the app, in memory for the test. */
const store = vi.hoisted(() => ({ files: undefined as FileStore | undefined }));

vi.mock('../project/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof BrowserModule>()),
  browserFileStore: () => Promise.resolve(store.files),
}));

async function controller() {
  await waitFor(() => expect(getProjectController()).not.toBeNull());
  return getProjectController()!;
}

function makeDirty(): void {
  act(() =>
    getProjectController()!.session!.execute(
      addDataset({
        id: 'ds-1',
        name: 'Suppliers',
        description: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        criteria: [],
        alternatives: [],
        matrices: [],
      }),
    ),
  );
}

describe('project files in the app (browser build)', () => {
  beforeEach(() => {
    store.files = memoryFileStore();
    // Toasts live in a module-level queue that outlives a rendered app.
    toast.dismiss();
  });

  it('creates a project from the home screen and shows it in the top bar', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await controller();

    await user.click(await screen.findByRole('button', { name: 'New project' }));
    const dialog = await screen.findByRole('dialog', { name: 'New project' });
    const name = within(dialog).getByLabelText('Project name');
    expect((name as HTMLInputElement).value).toBe('Untitled project');
    await user.clear(name);
    await user.type(name, 'Suppliers');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Created “Suppliers”')).toBeTruthy();
    expect(within(screen.getByRole('banner')).getByText('Suppliers')).toBeTruthy();
    expect(await store.files!.list()).toEqual(['Suppliers.mateo']);
    // The home screen lists it as a recent project.
    expect(screen.getByRole('button', { name: 'Open Suppliers' })).toBeTruthy();
  });

  it('opens a stored project from the list', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const projects = await controller();
    act(() => runCommand('file.new'));
    const dialog = await screen.findByRole('dialog', { name: 'New project' });
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    await screen.findByText('Created “Untitled project”');
    await act(() => projects.closeProject());

    await user.click(screen.getByRole('button', { name: 'Open project' }));
    const picker = await screen.findByRole('dialog', { name: 'Open a project' });
    await user.click(within(picker).getByRole('button', { name: 'Untitled project' }));
    expect(await screen.findByText('Opened “Untitled project”')).toBeTruthy();
  });

  it('asks before replacing a stored project with Save As', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const projects = await controller();
    for (const name of ['Old', 'Current']) {
      act(() => runCommand('file.new'));
      const dialog = await screen.findByRole('dialog', { name: 'New project' });
      const input = within(dialog).getByLabelText('Project name');
      await user.clear(input);
      await user.type(input, name);
      await user.click(within(dialog).getByRole('button', { name: 'Create' }));
      await screen.findByText(`Created “${name}”`);
    }

    act(() => runCommand('file.saveAs'));
    const dialog = await screen.findByRole('dialog', { name: 'Save the project as' });
    const input = within(dialog).getByLabelText('Project name');
    await user.clear(input);
    await user.type(input, 'Old');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Replace “Old.mateo”?' });
    await user.click(within(confirm).getByRole('button', { name: 'Replace' }));

    expect(await screen.findByText('Saved “Current”')).toBeTruthy();
    expect(projects.getState().project?.location).toBe('Old.mateo');
  });

  it('asks about unsaved changes and keeps the project when cancelled', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const projects = await controller();
    act(() => runCommand('file.new'));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'New project' })).getByRole('button', {
        name: 'Create',
      }),
    );
    await waitFor(() => expect(projects.getState().project).not.toBeNull());
    makeDirty();
    expect(
      within(screen.getByRole('banner')).getByRole('img', { name: 'Unsaved changes' }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'New project' }));
    const question = await screen.findByRole('alertdialog', {
      name: 'Save the changes to “Untitled project”?',
    });
    await user.click(within(question).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(projects.getState().project).toMatchObject({ isDirty: true });
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'New project' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save' }),
    );
    // Saved, then the new project dialog follows.
    expect(await screen.findByRole('dialog', { name: 'New project' })).toBeTruthy();
    expect(projects.getState().project?.isDirty).toBe(false);
  });

  it('shows translated messages for project errors', async () => {
    useSettings.getState().update({ language: 'tr' });
    renderApp('/', { language: 'tr' });
    const projects = await controller();
    await store.files!.write(
      'notlar.mateo',
      Uint8Array.from('not a database', (char) => char.charCodeAt(0)),
    );
    await act(() => projects.openProject('notlar.mateo'));
    expect(await screen.findByText('Proje açılamadı')).toBeTruthy();
    expect(
      screen.getByText('notlar.mateo: Bu dosya bir Mateo projesi değil.', { exact: false }),
    ).toBeTruthy();
  });
});

describe('project error texts', () => {
  it('match the texts of @mateo/project', () => {
    for (const language of ['en', 'tr'] as const) {
      const errors = resources[language].project.errors as Record<string, string>;
      for (const [key, text] of Object.entries(PROJECT_MESSAGES[language])) {
        if (!key.startsWith('project.error.')) continue;
        expect(errors[key.slice('project.error.'.length)], key).toBe(text);
      }
    }
  });
});
