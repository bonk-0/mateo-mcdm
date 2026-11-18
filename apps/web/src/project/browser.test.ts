import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  createProjectRepository,
  memoryFileStore,
  memoryProjectLocks,
  type Sqlite3Like,
} from '@mateo/project';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  browserLocation,
  createBrowserPlatform,
  saveFileToComputer,
  type BrowserFileDialogs,
} from './browser';

const sqlite3 = sqlite3InitModule() as unknown as Promise<Sqlite3Like>;

function setup(answers: { names?: (string | null)[]; replace?: boolean[] } = {}) {
  const files = memoryFileStore();
  const locks = memoryProjectLocks();
  const persist = vi.fn(() => Promise.resolve(true));
  const saveFile = vi.fn(() => Promise.resolve(true));
  const asked: string[] = [];
  const dialogs: BrowserFileDialogs = {
    askName: (purpose, suggested) => {
      asked.push(`${purpose}:${suggested}`);
      return Promise.resolve(answers.names?.shift() ?? null);
    },
    pickProject: (locations) => Promise.resolve(locations[0] ?? null),
    confirmReplace: () => Promise.resolve(answers.replace?.shift() ?? false),
  };
  const platform = createBrowserPlatform({
    files,
    dialogs,
    appVersion: '0.1.0-test',
    fileTypeLabel: () => 'Mateo project',
    sqlite3: () => sqlite3,
    preferences: localStorage,
    locks,
    persist,
    saveFile,
  });
  const repository = createProjectRepository({
    storage: platform.storage,
    appVersion: '0.1.0-test',
  });
  return { platform, repository, files, locks, persist, saveFile, asked };
}

describe('browser project platform', () => {
  it('names files safely', () => {
    expect(browserLocation('  Tedarikçi / seçim.mateo ')).toBe('Tedarikçi - seçim.mateo');
    expect(browserLocation('..')).toBeNull();
    expect(browserLocation('   ')).toBeNull();
  });

  it('asks the browser once to keep its storage, when a project is first stored', async () => {
    const { repository, persist } = setup();
    expect(persist).not.toHaveBeenCalled();
    await (await repository.create('a.mateo', { name: 'A' })).close();
    await (await repository.open('a.mateo')).close();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('keeps a project open in one tab at a time', async () => {
    const { platform, repository, files } = setup();
    const session = await repository.create('a.mateo', { name: 'A' });
    await expect(repository.open('a.mateo')).rejects.toMatchObject({ code: 'IN_USE' });
    // Replacing it from another tab would be undone by the next save of this one.
    await expect(platform.writeProjectFile('a.mateo', new Uint8Array(4))).rejects.toMatchObject({
      code: 'IN_USE',
    });
    await session.close();
    await platform.writeProjectFile('a.mateo', new Uint8Array(4));
    expect(await files.read('a.mateo')).toEqual(new Uint8Array(4));
  });

  it('removes a replaced file only when the user agreed and nobody has it open', async () => {
    const { platform, repository, files } = setup({ names: ['a', 'a'], replace: [true, true] });
    await (await repository.create('a.mateo', { name: 'A' })).close();
    await platform.removeReplacedFile('a.mateo');
    expect(await files.list()).toEqual(['a.mateo']);

    expect(await platform.chooseNewLocation('Untitled')).toBe('a.mateo');
    const open = await repository.open('a.mateo');
    await expect(platform.removeReplacedFile('a.mateo')).rejects.toMatchObject({
      code: 'IN_USE',
    });
    await open.close();
    expect(await platform.chooseNewLocation('Untitled')).toBe('a.mateo');
    await platform.removeReplacedFile('a.mateo');
    expect(await files.list()).toEqual([]);
  });

  it('checks a file from the computer without storing it', async () => {
    const { platform, repository, files } = setup();
    const session = await repository.create('a.mateo', { name: 'A' });
    await session.close();
    const bytes = (await files.read('a.mateo'))!;
    await platform.checkProjectFile(bytes);
    expect(await files.list()).toEqual(['a.mateo']);
    await expect(
      platform.checkProjectFile(new TextEncoder().encode('not a project'.repeat(20))),
    ).rejects.toMatchObject({ code: 'NOT_A_PROJECT_FILE' });
  });

  it('asks under which name to keep an imported project, and before replacing one', async () => {
    const { platform, repository, asked } = setup({ names: ['a', 'b'], replace: [false] });
    await (await repository.create('a.mateo', { name: 'A' })).close();
    expect(await platform.chooseImportLocation('a')).toBe('b.mateo');
    expect(asked).toEqual(['import:a', 'import:a']);
  });

  it('gives the stored file to the user under its name', async () => {
    const { platform, repository, files, saveFile } = setup();
    await (await repository.create('Tedarikçi.mateo', { name: 'T' })).close();
    expect(await platform.exportProjectFile('Tedarikçi.mateo')).toBe(true);
    expect(saveFile).toHaveBeenCalledWith(
      'Tedarikçi.mateo',
      await files.read('Tedarikçi.mateo'),
      'Mateo project',
    );
    await expect(platform.exportProjectFile('gone.mateo')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('saving a file to the computer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const bytes = new Uint8Array([1, 2, 3]);

  it('uses the save dialog where the browser has one', async () => {
    const written: Uint8Array[] = [];
    const picker = vi.fn(() =>
      Promise.resolve({
        createWritable: () =>
          Promise.resolve({
            write: (data: Uint8Array) => {
              written.push(data);
              return Promise.resolve();
            },
            close: () => Promise.resolve(),
          }),
      }),
    );
    vi.stubGlobal('showSaveFilePicker', picker);
    expect(await saveFileToComputer('a.mateo', bytes, 'Mateo project')).toBe(true);
    expect(written).toEqual([bytes]);
    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'a.mateo',
      types: [{ description: 'Mateo project', accept: { 'application/octet-stream': ['.mateo'] } }],
    });
  });

  it('respects a cancelled dialog', async () => {
    vi.stubGlobal('showSaveFilePicker', () =>
      Promise.reject(Object.assign(new Error('cancelled'), { name: 'AbortError' })),
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await saveFileToComputer('a.mateo', bytes, 'Mateo project')).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });

  it('downloads the file where there is no dialog or it is refused', async () => {
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = () => 'blob:mateo';
        static override revokeObjectURL = () => {};
      },
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await saveFileToComputer('a.mateo', bytes, 'Mateo project')).toBe(true);
    vi.stubGlobal('showSaveFilePicker', () =>
      Promise.reject(Object.assign(new Error('no gesture'), { name: 'SecurityError' })),
    );
    expect(await saveFileToComputer('a.mateo', bytes, 'Mateo project')).toBe(true);
    expect(click).toHaveBeenCalledTimes(2);
  });
});
