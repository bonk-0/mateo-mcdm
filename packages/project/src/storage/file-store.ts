/**
 * Where the browser build keeps project files: whole files under a name, as bytes.
 * `opfsFileStore` uses the origin private file system, `indexedDbFileStore` is the
 * fallback where OPFS is missing, and `memoryFileStore` is for tests and throwaway demos.
 */
export interface FileStore {
  /** The stored bytes, or `null` when there is no file with that name. */
  read(name: string): Promise<Uint8Array | null>;
  /** Replaces the file atomically: after a failure the old content is still there. */
  write(name: string, bytes: Uint8Array): Promise<void>;
  remove(name: string): Promise<void>;
  list(): Promise<string[]>;
}

export function memoryFileStore(initial?: Readonly<Record<string, Uint8Array>>): FileStore {
  const files = new Map<string, Uint8Array>(Object.entries(initial ?? {}));
  return {
    read: (name) => Promise.resolve(files.get(name)?.slice() ?? null),
    write: (name, bytes) => {
      files.set(name, bytes.slice());
      return Promise.resolve();
    },
    remove: (name) => {
      files.delete(name);
      return Promise.resolve();
    },
    list: () => Promise.resolve([...files.keys()].sort()),
  };
}

// --- Origin private file system -------------------------------------------------------
// This package has no DOM types, so the few members used are described structurally. A
// `FileSystemDirectoryHandle` from `navigator.storage.getDirectory()` fits.

export interface OpfsFileHandleLike {
  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<{
    write(data: Uint8Array): Promise<void>;
    close(): Promise<void>;
  }>;
}

export interface OpfsDirectoryLike {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFileHandleLike>;
  removeEntry(name: string): Promise<void>;
  keys(): AsyncIterable<string>;
}

function isNotFound(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'NotFoundError';
}

/**
 * Files in a directory of the origin private file system. A writable stream replaces the
 * file only when it is closed, so an interrupted write leaves the old content.
 */
export function opfsFileStore(directory: OpfsDirectoryLike): FileStore {
  return {
    async read(name) {
      try {
        const handle = await directory.getFileHandle(name);
        return new Uint8Array(await (await handle.getFile()).arrayBuffer());
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async write(name, bytes) {
      const handle = await directory.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();
    },
    async remove(name) {
      try {
        await directory.removeEntry(name);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    },
    async list() {
      const names: string[] = [];
      for await (const name of directory.keys()) names.push(name);
      return names.sort();
    },
  };
}

// --- IndexedDB ------------------------------------------------------------------------

interface IdbRequestLike<T> {
  result: T;
  error: unknown;
  onsuccess: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

interface IdbObjectStoreLike {
  get(key: string): IdbRequestLike<unknown>;
  put(value: unknown, key: string): IdbRequestLike<unknown>;
  delete(key: string): IdbRequestLike<unknown>;
  getAllKeys(): IdbRequestLike<unknown[]>;
}

interface IdbTransactionLike {
  objectStore(name: string): IdbObjectStoreLike;
  error: unknown;
  oncomplete: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onabort: ((event: unknown) => void) | null;
}

interface IdbDatabaseLike {
  createObjectStore(name: string): unknown;
  transaction(storeNames: string, mode?: 'readonly' | 'readwrite'): IdbTransactionLike;
}

/** The global `indexedDB` fits. */
export interface IdbFactoryLike {
  open(
    name: string,
    version?: number,
  ): IdbRequestLike<IdbDatabaseLike> & { onupgradeneeded: ((event: unknown) => void) | null };
}

const IDB_STORE = 'files';

/** Files as values of one IndexedDB object store. A `put` is atomic. */
export function indexedDbFileStore(
  factory: IdbFactoryLike,
  databaseName = 'mateo-projects',
): FileStore {
  let opened: Promise<IdbDatabaseLike> | undefined;
  const database = (): Promise<IdbDatabaseLike> =>
    (opened ??= new Promise((resolve, reject) => {
      const request = factory.open(databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(IDB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        opened = undefined;
        reject(asError(request.error));
      };
    }));

  /** Runs one request and resolves with its result once the transaction is durable. */
  async function run<T>(
    mode: 'readonly' | 'readwrite',
    action: (store: IdbObjectStoreLike) => IdbRequestLike<T>,
  ): Promise<T> {
    const db = await database();
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE, mode);
      const request = action(transaction.objectStore(IDB_STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(asError(transaction.error ?? request.error));
      transaction.onabort = () => reject(asError(transaction.error ?? request.error));
    });
  }

  return {
    async read(name) {
      const value = await run('readonly', (store) => store.get(name));
      return value instanceof Uint8Array ? value.slice() : null;
    },
    async write(name, bytes) {
      await run('readwrite', (store) => store.put(bytes.slice(), name));
    },
    async remove(name) {
      await run('readwrite', (store) => store.delete(name));
    },
    async list() {
      const keys = await run('readonly', (store) => store.getAllKeys());
      return keys.filter((key): key is string => typeof key === 'string').sort();
    },
  };
}

function asError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : 'IndexedDB request failed');
}
