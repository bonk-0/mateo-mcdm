import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  addDataset,
  createProjectRepository,
  createWasmStorage,
  memoryFileStore,
  type FileStore,
  type KeyValueStore,
  type Sqlite3Like,
} from '@mateo/project';
import { describe, expect, it, vi } from 'vitest';
import {
  createProjectController,
  type ProjectController,
  type ProjectNotice,
  type UnsavedChoice,
} from './controller';
import type { ProjectPlatform } from './platform';

const sqlite3 = sqlite3InitModule() as unknown as Promise<Sqlite3Like>;

function memoryPreferences(): KeyValueStore {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
}

interface Harness {
  readonly controller: ProjectController;
  readonly files: FileStore;
  readonly notices: ProjectNotice[];
  /** Answers of the next dialogs, in order. `null` cancels. */
  readonly locations: (string | null)[];
  readonly unsavedAnswers: UnsavedChoice[];
  readonly unsavedAsked: string[];
  readonly removed: string[];
  /** Locations given to the user as files. */
  readonly exported: string[];
}

function setup(autosaveDelayMs: number | false = false): Harness {
  const files = memoryFileStore();
  const locations: (string | null)[] = [];
  const unsavedAnswers: UnsavedChoice[] = [];
  const unsavedAsked: string[] = [];
  const notices: ProjectNotice[] = [];
  const removed: string[] = [];
  const exported: string[] = [];
  const next = () => Promise.resolve(locations.length > 0 ? locations.shift()! : null);
  const platform: ProjectPlatform = {
    storage: createWasmStorage({ sqlite3: () => sqlite3, files }),
    preferences: memoryPreferences(),
    chooseNewLocation: next,
    chooseOpenLocation: next,
    chooseSaveAsLocation: next,
    async removeReplacedFile(location) {
      removed.push(location);
      await files.remove(location);
    },
    async checkProjectFile(bytes) {
      const probe = createProjectRepository({
        storage: createWasmStorage({
          sqlite3: () => sqlite3,
          files: memoryFileStore({ 'probe.mateo': bytes }),
        }),
        appVersion: '0.1.0-test',
      });
      await (await probe.open('probe.mateo')).close();
    },
    chooseImportLocation: next,
    writeProjectFile: (location, bytes) => files.write(location, bytes),
    exportProjectFile(location) {
      exported.push(location);
      return Promise.resolve(true);
    },
  };
  const controller = createProjectController({
    platform,
    appVersion: '0.1.0-test',
    confirmUnsaved: (name) => {
      unsavedAsked.push(name);
      return Promise.resolve(unsavedAnswers.shift() ?? 'cancel');
    },
    notify: (notice) => notices.push(notice),
    untitledName: () => 'Untitled project',
    autosaveDelayMs,
  });
  return { controller, files, notices, locations, unsavedAnswers, unsavedAsked, removed, exported };
}

/** Makes the open project dirty with a model edit. */
function edit(controller: ProjectController, id = 'ds-1'): void {
  controller.session!.execute(
    addDataset({
      id,
      name: 'Suppliers',
      description: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      criteria: [],
      alternatives: [],
      matrices: [],
    }),
  );
}

const kinds = (notices: readonly ProjectNotice[]) => notices.map((notice) => notice.kind);

describe('project controller', () => {
  it('creates a project at the chosen location, named after the file', async () => {
    const { controller, files, locations, notices, removed } = setup();
    locations.push('Tedarikçi seçimi.mateo');
    await controller.newProject();

    expect(controller.getState().project).toEqual({
      name: 'Tedarikçi seçimi',
      location: 'Tedarikçi seçimi.mateo',
      isDirty: false,
    });
    expect(await files.list()).toEqual(['Tedarikçi seçimi.mateo']);
    // The platform decides whether the file may be replaced; it is always asked first.
    expect(removed).toEqual(['Tedarikçi seçimi.mateo']);
    expect(notices).toEqual([
      { kind: 'created', name: 'Tedarikçi seçimi', location: 'Tedarikçi seçimi.mateo' },
    ]);
    expect(controller.getState().recent.map((item) => item.location)).toEqual([
      'Tedarikçi seçimi.mateo',
    ]);
  });

  it('does nothing when a dialog is cancelled', async () => {
    const { controller, notices } = setup();
    await controller.newProject();
    await controller.openProject();
    expect(controller.getState().project).toBeNull();
    expect(notices).toEqual([]);
  });

  it('saves, and tells when there is nothing open to save', async () => {
    const { controller, locations, notices } = setup();
    await controller.save();
    await controller.saveAs();
    expect(kinds(notices)).toEqual(['noProject', 'noProject']);

    locations.push('a.mateo');
    await controller.newProject();
    edit(controller);
    expect(controller.getState().project?.isDirty).toBe(true);
    await controller.save();
    expect(controller.getState().project?.isDirty).toBe(false);
    expect(notices.at(-1)).toEqual({ kind: 'saved', name: 'a', location: 'a.mateo' });
  });

  it('opens a project and closes the previous one only once the new one is open', async () => {
    const { controller, locations, notices } = setup();
    locations.push('a.mateo', 'b.mateo');
    await controller.newProject();
    await controller.newProject();
    expect(controller.getState().project?.location).toBe('b.mateo');

    await controller.openProject('a.mateo');
    expect(controller.getState().project?.location).toBe('a.mateo');
    expect(notices.at(-1)).toEqual({ kind: 'opened', name: 'a', location: 'a.mateo' });

    await controller.openProject('a.mateo');
    expect(notices.at(-1)).toEqual({ kind: 'alreadyOpen', name: 'a' });

    // A failing open leaves the current project as it was.
    const session = controller.session;
    await controller.openProject('missing.mateo');
    expect(notices.at(-1)).toMatchObject({ kind: 'failed', action: 'open' });
    expect(controller.session).toBe(session);
    expect(session?.isClosed).toBe(false);
  });

  it('drops a recent project whose file is gone', async () => {
    const { controller, files, locations } = setup();
    locations.push('gone.mateo', 'kept.mateo');
    await controller.newProject();
    await controller.newProject();
    await files.remove('gone.mateo');

    await controller.openProject('gone.mateo');
    expect(controller.getState().recent.map((item) => item.location)).toEqual(['kept.mateo']);
  });

  it('reports why a file cannot be opened', async () => {
    const { controller, files, notices } = setup();
    await files.write('notes.mateo', new TextEncoder().encode('just some text, not SQLite'));
    await controller.openProject('notes.mateo');
    const notice = notices.at(-1);
    expect(notice?.kind === 'failed' && notice.error).toMatchObject({
      code: 'NOT_A_PROJECT_FILE',
    });
  });

  it('asks before unsaved changes are lost, and respects the answer', async () => {
    const { controller, locations, unsavedAnswers, unsavedAsked } = setup();
    locations.push('a.mateo');
    await controller.newProject();
    edit(controller);

    // Cancel: the project stays open and dirty; the dialog is never shown.
    unsavedAnswers.push('cancel');
    locations.push('b.mateo');
    await controller.newProject();
    expect(unsavedAsked).toEqual(['a']);
    expect(controller.getState().project).toMatchObject({ location: 'a.mateo', isDirty: true });
    expect(locations).toEqual(['b.mateo']);

    // Save: the changes are written before the next project replaces it.
    unsavedAnswers.push('save');
    await controller.newProject();
    expect(controller.getState().project?.location).toBe('b.mateo');
    await controller.openProject('a.mateo');
    expect(controller.session?.document.model.datasets.map((d) => d.id)).toEqual(['ds-1']);

    // Discard: the changes are dropped.
    edit(controller, 'ds-2');
    unsavedAnswers.push('discard');
    await controller.openProject('b.mateo');
    await controller.openProject('a.mateo');
    expect(controller.session?.document.model.datasets.map((d) => d.id)).toEqual(['ds-1']);
  });

  it('keeps the project open when closing is cancelled', async () => {
    const { controller, locations, unsavedAnswers } = setup();
    expect(await controller.closeProject()).toBe(true);

    locations.push('a.mateo');
    await controller.newProject();
    edit(controller);
    unsavedAnswers.push('cancel');
    expect(await controller.closeProject()).toBe(false);
    expect(controller.getState().project).not.toBeNull();

    unsavedAnswers.push('discard');
    const session = controller.session;
    expect(await controller.closeProject()).toBe(true);
    expect(controller.getState().project).toBeNull();
    expect(session?.isClosed).toBe(true);
  });

  it('saves a copy and continues in it', async () => {
    const { controller, files, locations, notices } = setup();
    locations.push('a.mateo');
    await controller.newProject();
    edit(controller);

    locations.push('copy.mateo');
    await controller.saveAs();
    expect(controller.getState().project).toEqual({
      name: 'a',
      location: 'copy.mateo',
      isDirty: false,
    });
    expect(notices.at(-1)).toEqual({ kind: 'saved', name: 'a', location: 'copy.mateo' });
    expect(await files.list()).toEqual(['a.mateo', 'copy.mateo']);
    expect(controller.getState().recent.map((item) => item.location)).toEqual([
      'copy.mateo',
      'a.mateo',
    ]);

    // Choosing the current file again is a plain save.
    edit(controller, 'ds-2');
    locations.push('copy.mateo');
    await controller.saveAs();
    expect(controller.getState().project?.isDirty).toBe(false);
  });

  it('opens a project file from the computer under the chosen name', async () => {
    const { controller, files, locations, notices } = setup();
    locations.push('a.mateo');
    await controller.newProject();
    edit(controller);
    await controller.save();
    const bytes = (await files.read('a.mateo'))!;

    locations.push('From disk.mateo');
    await controller.importProject({ name: 'a.mateo', bytes });
    expect(controller.getState().project).toEqual({
      name: 'a',
      location: 'From disk.mateo',
      isDirty: false,
    });
    expect(controller.session?.document.model.datasets.map((d) => d.id)).toEqual(['ds-1']);
    expect(notices.at(-1)).toEqual({ kind: 'imported', name: 'a', location: 'From disk.mateo' });
    expect(await files.list()).toEqual(['From disk.mateo', 'a.mateo']);
  });

  it('checks a file before anything is stored', async () => {
    const { controller, files, locations, notices } = setup();
    locations.push('never.mateo');
    await controller.importProject({
      name: 'notes.mateo',
      bytes: new TextEncoder().encode('just some text, not SQLite'.repeat(10)),
    });
    expect(notices).toEqual([
      expect.objectContaining({ kind: 'failed', action: 'import', location: 'notes.mateo' }),
    ]);
    expect(await files.list()).toEqual([]);
    // Not even asked for a name.
    expect(locations).toEqual(['never.mateo']);
  });

  it('replaces the open project with a file from the computer only after closing it', async () => {
    const { controller, files, locations, unsavedAnswers } = setup();
    locations.push('a.mateo', 'b.mateo');
    await controller.newProject();
    edit(controller);
    await controller.save();
    const withDataset = (await files.read('a.mateo'))!;
    await controller.newProject();
    edit(controller, 'ds-2');

    // Cancelling the unsaved changes question keeps everything as it was.
    locations.push('b.mateo');
    unsavedAnswers.push('cancel');
    await controller.importProject({ name: 'a.mateo', bytes: withDataset });
    expect(controller.getState().project).toMatchObject({ location: 'b.mateo', isDirty: true });

    locations.push('b.mateo');
    unsavedAnswers.push('discard');
    await controller.importProject({ name: 'a.mateo', bytes: withDataset });
    expect(controller.getState().project).toMatchObject({ location: 'b.mateo', isDirty: false });
    expect(controller.session?.document.model.datasets.map((d) => d.id)).toEqual(['ds-1']);
  });

  it('saves before giving the project to the user as a file', async () => {
    const { controller, locations, notices, exported } = setup();
    await controller.exportProject();
    expect(kinds(notices)).toEqual(['noProject']);

    locations.push('a.mateo');
    await controller.newProject();
    edit(controller);
    await controller.exportProject();
    expect(controller.getState().project?.isDirty).toBe(false);
    expect(exported).toEqual(['a.mateo']);
    expect(notices.at(-1)).toEqual({ kind: 'exported', name: 'a', location: 'a.mateo' });
  });

  it('runs one file operation at a time', async () => {
    const { controller, locations } = setup();
    locations.push('a.mateo', 'b.mateo');
    const first = controller.newProject();
    expect(controller.getState().busy).toBe(true);
    await controller.newProject(); // ignored while the first runs
    await first;
    expect(controller.getState()).toMatchObject({ busy: false, project: { location: 'a.mateo' } });
    expect(locations).toEqual(['b.mateo']);
  });

  it('clears the recent projects', async () => {
    const { controller, locations } = setup();
    locations.push('a.mateo');
    await controller.newProject();
    controller.clearRecent();
    expect(controller.getState().recent).toEqual([]);
  });

  it('keeps its state object stable between changes', async () => {
    const { controller, locations } = setup();
    const before = controller.getState();
    expect(controller.getState()).toBe(before);
    let calls = 0;
    const stop = controller.subscribe(() => calls++);
    locations.push('a.mateo');
    await controller.newProject();
    stop();
    expect(calls).toBeGreaterThan(0);
    expect(controller.getState()).not.toBe(before);
  });

  describe('autosave', () => {
    it('saves edits by itself after a quiet moment', async () => {
      const { controller, locations } = setup(20);
      locations.push('auto.mateo');
      await controller.newProject();
      edit(controller);
      expect(controller.getState().project?.isDirty).toBe(true);
      await vi.waitFor(() => expect(controller.getState().project?.isDirty).toBe(false));
    });

    it('saves quietly instead of asking when the project is closed', async () => {
      const { controller, locations, unsavedAsked } = setup(60_000);
      locations.push('auto.mateo');
      await controller.newProject();
      edit(controller);
      expect(await controller.closeProject()).toBe(true);
      expect(unsavedAsked).toEqual([]);
      expect(controller.getState().project).toBeNull();
    });

    it('is off when asked to be, and then the page going away saves nothing', async () => {
      const { controller, locations } = setup(false);
      locations.push('manual.mateo');
      await controller.newProject();
      edit(controller);
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(controller.getState().project?.isDirty).toBe(true);
      await controller.flush();
      expect(controller.hasUnsavedChanges()).toBe(true);
    });

    it('saves pending edits at once when the page is hidden', async () => {
      const { controller, locations } = setup(60_000);
      locations.push('auto.mateo');
      await controller.newProject();
      expect(controller.hasUnsavedChanges()).toBe(false);
      edit(controller);
      expect(controller.hasUnsavedChanges()).toBe(true);
      await controller.flush();
      expect(controller.hasUnsavedChanges()).toBe(false);
    });
  });
});
