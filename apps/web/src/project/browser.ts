import {
  createWasmStorage,
  indexedDbFileStore,
  opfsFileStore,
  type FileStore,
  type IdbFactoryLike,
  type OpfsDirectoryLike,
  type Sqlite3Like,
} from '@mateo/project';
import { hasProjectExtension, PROJECT_EXTENSION, type ProjectPlatform } from './platform';

/** The in-app dialogs the browser build uses instead of native file dialogs. */
export interface BrowserFileDialogs {
  /**
   * Asks for a project name. `purpose` tells which command asks. Resolves with the name
   * the user typed, or `null` when cancelled.
   */
  askName(purpose: 'new' | 'saveAs', suggestedName: string): Promise<string | null>;
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

/**
 * Project files in the browser build: SQLite compiled to WebAssembly, with files kept in
 * the browser's own storage (`files`). There is no file system to browse, so projects are
 * named and picked with in-app dialogs. The bytes are the same `.mateo` format as on the
 * desktop.
 */
export function createBrowserPlatform(options: {
  readonly files: FileStore;
  readonly dialogs: BrowserFileDialogs;
  /** `sqlite3InitModule` of `@sqlite.org/sqlite-wasm`; loaded on first use by default. */
  readonly sqlite3?: () => Promise<Sqlite3Like>;
  /** Defaults to `localStorage`. */
  readonly preferences?: Storage;
}): ProjectPlatform {
  const { files, dialogs } = options;
  const replaceable = new Set<string>();

  const loadSqlite =
    options.sqlite3 ??
    (async () => {
      const { default: init } = await import('@sqlite.org/sqlite-wasm');
      return (await init()) as unknown as Sqlite3Like;
    });

  async function chooseName(
    purpose: 'new' | 'saveAs',
    suggestedName: string,
  ): Promise<string | null> {
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

  const removeReplacedFile = async (location: string): Promise<void> => {
    if (!replaceable.delete(location)) return;
    await files.remove(location);
  };

  return {
    storage: createWasmStorage({ sqlite3: loadSqlite, files }),
    preferences: options.preferences ?? localStorage,
    chooseNewLocation: (suggestedName) => chooseName('new', suggestedName),
    async chooseOpenLocation() {
      const stored = (await files.list()).filter(hasProjectExtension);
      return await dialogs.pickProject(stored);
    },
    chooseSaveAsLocation: (current) => chooseName('saveAs', current.replace(/\.mateo$/i, '')),
    removeReplacedFile,
  };
}
