import {
  createProjectRepository,
  createWasmStorage,
  indexedDbFileStore,
  memoryFileStore,
  opfsFileStore,
  webProjectLocks,
  ProjectError,
  type FileStore,
  type IdbFactoryLike,
  type OpfsDirectoryLike,
  type ProjectLocks,
  type Sqlite3Like,
  type StorageAdapter,
} from '@mateo/project';
import { saveBytes } from '../export/download';
import { requestPersistentStorage } from './persistence';
import {
  fileNameOf,
  hasProjectExtension,
  PROJECT_EXTENSION,
  type ProjectPlatform,
} from './platform';

/** Which command asks for a project name. */
export type NamePurpose = 'new' | 'saveAs' | 'import';

/** The in-app dialogs that name and pick projects kept in the browser. */
export interface BrowserFileDialogs {
  /** Asks for a project name. Resolves with the name the user typed, or `null` when cancelled. */
  askName(purpose: NamePurpose, suggestedName: string): Promise<string | null>;
  /** Lets the user pick one of the stored projects (file names), or `null`. */
  pickProject(locations: readonly string[]): Promise<string | null>;
  /** Asks whether to replace the stored project `location`. */
  confirmReplace(location: string): Promise<boolean>;
}

/** Where the browser keeps project files: the origin private file system if it can write, else IndexedDB. */
export async function browserFileStore(): Promise<FileStore> {
  const storage = (globalThis.navigator as Partial<Navigator> | undefined)?.storage;
  const canWriteOpfs =
    typeof FileSystemFileHandle !== 'undefined' &&
    'createWritable' in FileSystemFileHandle.prototype;
  if (storage?.getDirectory && canWriteOpfs) {
    try {
      const root = await storage.getDirectory();
      const directory = await root.getDirectoryHandle('projects', { create: true });
      return opfsFileStore(directory as unknown as OpfsDirectoryLike);
    } catch {
      // Private browsing in some browsers refuses OPFS; IndexedDB usually still works.
    }
  }
  return indexedDbFileStore(globalThis.indexedDB as unknown as IdbFactoryLike);
}

/** Locks shared by all tabs of the app, where the browser has the Web Locks API. */
export function browserLocks(): ProjectLocks | undefined {
  const locks = (globalThis.navigator as Partial<Navigator> | undefined)?.locks;
  return locks ? webProjectLocks(locks) : undefined;
}

interface SaveFilePicker {
  (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }): Promise<{
    createWritable(): Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }>;
  }>;
}

/**
 * Saves `bytes` as a file on the user's computer: where they choose, with the save dialog
 * of browsers that have one for web pages (`showSaveFilePicker`), or as a download.
 * Resolves `false` when the user cancelled the dialog.
 */
export async function saveFileToComputer(
  name: string,
  bytes: Uint8Array,
  description: string,
): Promise<boolean> {
  const picker = (globalThis as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const handle = await picker({
        suggestedName: name,
        types: [{ description, accept: { 'application/octet-stream': [`.${PROJECT_EXTENSION}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();
      return true;
    } catch (error) {
      if ((error as { name?: unknown } | null)?.name === 'AbortError') return false;
      // Refused (for example without a recent click): the download below still works.
    }
  }
  saveBytes(name, bytes, 'application/octet-stream');
  return true;
}

/** A file name that the browser file store accepts: no folders, and the `.mateo` extension. */
export function browserLocation(name: string): string | null {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, '-')
    .replace(/\.mateo$/i, '')
    .trim();
  if (cleaned.length === 0 || cleaned === '.' || cleaned === '..') return null;
  return `${cleaned}.${PROJECT_EXTENSION}`;
}

export interface BrowserPlatformOptions {
  readonly files: FileStore;
  readonly dialogs: BrowserFileDialogs;
  /** Recorded in projects that are checked before they are brought in. */
  readonly appVersion: string;
  /** Name of the file type in the save dialog, for example "Mateo project". */
  readonly fileTypeLabel: () => string;
  /** `sqlite3InitModule` of `@sqlite.org/sqlite-wasm`; loaded on first use by default. */
  readonly sqlite3?: () => Promise<Sqlite3Like>;
  /** Defaults to `localStorage`. */
  readonly preferences?: Storage;
  /** Keeps a project open in one tab at a time. Defaults to `browserLocks()`. */
  readonly locks?: ProjectLocks;
  /** Defaults to `requestPersistentStorage`. */
  readonly persist?: () => Promise<unknown>;
  /** Defaults to `saveFileToComputer`. */
  readonly saveFile?: (name: string, bytes: Uint8Array, description: string) => Promise<boolean>;
}

/**
 * Project files in the browser: SQLite compiled to WebAssembly, with the files kept in the
 * browser's own storage (`files`) and named and picked with in-app dialogs. A project
 * comes in from the user's computer as a `.mateo` file and goes out as one, in the same
 * format.
 */
export function createBrowserPlatform(options: BrowserPlatformOptions): ProjectPlatform {
  const { files, dialogs } = options;
  const locks = 'locks' in options ? options.locks : browserLocks();
  const replaceable = new Set<string>();

  const loadSqlite =
    options.sqlite3 ??
    (async () => {
      const { default: init } = await import('@sqlite.org/sqlite-wasm');
      return (await init()) as unknown as Sqlite3Like;
    });

  // Asked once, when the first project is created or opened: that is when there is
  // something worth keeping.
  let persistRequested = false;
  const persist = (): void => {
    if (persistRequested) return;
    persistRequested = true;
    void (options.persist ?? requestPersistentStorage)().catch(() => undefined);
  };

  const wasm = createWasmStorage({ sqlite3: loadSqlite, files, ...(locks ? { locks } : {}) });
  const storage: StorageAdapter = {
    kind: wasm.kind,
    async open(location, open) {
      const connection = await wasm.open(location, open);
      persist();
      return connection;
    },
  };

  async function chooseName(purpose: NamePurpose, suggestedName: string): Promise<string | null> {
    for (;;) {
      const typed = await dialogs.askName(purpose, suggestedName);
      if (typed === null) return null;
      const location = browserLocation(typed);
      if (location === null) continue;
      replaceable.clear();
      const existing = await files.list();
      if (!existing.includes(location)) return location;
      if (await dialogs.confirmReplace(location)) {
        replaceable.add(location);
        return location;
      }
      suggestedName = typed;
    }
  }

  async function assertNotInUse(location: string): Promise<void> {
    if (await locks?.isHeld(location)) {
      throw new ProjectError('IN_USE', `${location} is open in another tab or window.`, {
        location,
      });
    }
  }

  return {
    storage,
    preferences: options.preferences ?? localStorage,
    chooseNewLocation: (suggestedName) => chooseName('new', suggestedName),
    async chooseOpenLocation() {
      const stored = (await files.list()).filter(hasProjectExtension);
      return await dialogs.pickProject(stored);
    },
    chooseSaveAsLocation: (current) => chooseName('saveAs', current.replace(/\.mateo$/i, '')),
    async removeReplacedFile(location) {
      if (!replaceable.delete(location)) return;
      // Another tab would write the project back with its next save.
      await assertNotInUse(location);
      await files.remove(location);
    },

    async checkProjectFile(bytes) {
      // The real open, on a throwaway copy in memory: every check of the repository runs,
      // including a migration of an older file, and nothing is stored.
      const probe = createProjectRepository({
        storage: createWasmStorage({
          sqlite3: loadSqlite,
          files: memoryFileStore({ [`file.${PROJECT_EXTENSION}`]: bytes }),
        }),
        appVersion: options.appVersion,
      });
      const session = await probe.open(`file.${PROJECT_EXTENSION}`);
      await session.close();
    },
    chooseImportLocation: (suggestedName) => chooseName('import', suggestedName),
    async writeProjectFile(location, bytes) {
      await assertNotInUse(location);
      await files.write(location, bytes);
    },
    async exportProjectFile(location) {
      const bytes = await files.read(location);
      if (bytes === null) {
        throw new ProjectError('NOT_FOUND', `No project file named ${location}.`, { location });
      }
      const save = options.saveFile ?? saveFileToComputer;
      return await save(fileNameOf(location), bytes, options.fileTypeLabel());
    },
  };
}
