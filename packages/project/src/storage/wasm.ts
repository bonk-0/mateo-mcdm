import { describeCause, ProjectError } from '../errors';
import type {
  OpenConnectionOptions,
  SqlConnection,
  SqlRow,
  SqlStatement,
  SqlValue,
  StorageAdapter,
} from '../sql/types';
import type { FileStore } from './file-store';
import type { ProjectLocks } from './locks';

/**
 * The part of the `@sqlite.org/sqlite-wasm` module object this adapter uses (the value
 * `sqlite3InitModule()` resolves to). Described structurally so that the package does not
 * import the WebAssembly build; the app loads it and passes it in.
 */
export interface Sqlite3Like {
  readonly oo1: { readonly DB: new (filename?: string, flags?: string) => Sqlite3DbLike };
  readonly capi: {
    readonly SQLITE_DESERIALIZE_FREEONCLOSE: number;
    readonly SQLITE_DESERIALIZE_RESIZEABLE: number;
    sqlite3_deserialize(
      db: unknown,
      schema: string,
      data: unknown,
      size: number,
      capacity: number,
      flags: number,
    ): number;
    sqlite3_js_db_export(db: unknown): Uint8Array;
  };
  readonly wasm: { allocFromTypedArray(bytes: Uint8Array): unknown };
}

export interface Sqlite3DbLike {
  readonly pointer?: unknown;
  exec(options: {
    sql: string;
    bind?: readonly SqlValue[];
    rowMode?: 'object';
    returnValue?: 'resultRows';
  }): unknown;
  checkRc(resultCode: number): unknown;
  close(): void;
}

export interface WasmStorageOptions {
  /** The initialised SQLite module, or a function that loads it on first use. */
  readonly sqlite3: Sqlite3Like | (() => Promise<Sqlite3Like>);
  /** Where the files are kept, see `opfsFileStore` and `indexedDbFileStore`. */
  readonly files: FileStore;
  /**
   * Keeps each project open in one tab at a time (`webProjectLocks(navigator.locks)`).
   * Without it nothing stops two tabs from overwriting each other's changes.
   */
  readonly locks?: ProjectLocks;
}

/**
 * Project files: SQLite compiled to WebAssembly, over files kept in the browser.
 *
 * A project is loaded into an in-memory database; after every transaction the whole
 * database is written back to the file store as one atomic replacement. So the stored
 * file is always a complete, consistent `.mateo` file: a crash or a closed tab loses at
 * most the changes not yet saved, never the file. The stored bytes are an ordinary SQLite
 * file, which is also what the user downloads and opens again (`FileStore.read`/`write`).
 *
 * Why not one of the OPFS virtual file systems of SQLite, which write only changed pages:
 * they run in a worker, the plain one needs cross-origin isolation and the pool one lets
 * only one tab use any project at a time, and neither has an IndexedDB fallback for
 * browsers without a writable OPFS. The price of this design is that a project must fit
 * in memory and each save rewrites the file, which stays fast at the project sizes Mateo
 * targets (docs/project-file.md, Storage).
 *
 * With `locks`, an open project holds its lock until the connection closes; opening it
 * elsewhere fails with `IN_USE`, and so does copying onto it.
 */
export function createWasmStorage(options: WasmStorageOptions): StorageAdapter {
  let module: Promise<Sqlite3Like> | undefined;
  const sqlite3 = (): Promise<Sqlite3Like> =>
    (module ??=
      typeof options.sqlite3 === 'function' ? options.sqlite3() : Promise.resolve(options.sqlite3));

  return {
    kind: 'wasm',
    async open(location: string, open: OpenConnectionOptions): Promise<SqlConnection> {
      const release = await lock(options.locks, location);
      try {
        const bytes = await options.files.read(location);
        if (bytes === null && !open.create) {
          throw new ProjectError('NOT_FOUND', `No project file named ${location}.`, { location });
        }
        const api = await sqlite3();
        return new WasmConnection(api, options, location, load(api, bytes), release);
      } catch (error) {
        release();
        throw error;
      }
    },
  };
}

async function lock(locks: ProjectLocks | undefined, location: string): Promise<() => void> {
  if (!locks) return () => {};
  const release = await locks.acquire(location);
  if (release === null) throw inUse(location);
  return release;
}

function inUse(location: string): ProjectError {
  return new ProjectError('IN_USE', `${location} is open in another tab or window.`, { location });
}

/**
 * A database file left in WAL mode by another tool cannot be opened in memory. Bytes 18
 * and 19 of the header select the journal format; 1 is the rollback journal. Only the
 * in-memory copy is changed.
 */
function withRollbackJournalHeader(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 100 || (bytes[18] === 1 && bytes[19] === 1)) return bytes;
  const copy = bytes.slice();
  copy[18] = 1;
  copy[19] = 1;
  return copy;
}

function load(api: Sqlite3Like, bytes: Uint8Array | null): Sqlite3DbLike {
  const db = new api.oo1.DB(':memory:', 'c');
  try {
    if (bytes !== null && bytes.length > 0) {
      const content = withRollbackJournalHeader(bytes);
      const pointer = api.wasm.allocFromTypedArray(content);
      db.checkRc(
        api.capi.sqlite3_deserialize(
          db.pointer,
          'main',
          pointer,
          content.length,
          content.length,
          api.capi.SQLITE_DESERIALIZE_FREEONCLOSE | api.capi.SQLITE_DESERIALIZE_RESIZEABLE,
        ),
      );
    }
    db.exec({ sql: 'PRAGMA foreign_keys = ON' });
    return db;
  } catch (cause) {
    db.close();
    throw new ProjectError(
      'NOT_A_PROJECT_FILE',
      `This file is not a Mateo project: ${describeCause(cause)}`,
      {},
      { cause },
    );
  }
}

class WasmConnection implements SqlConnection {
  private readonly files: FileStore;
  private readonly locks: ProjectLocks | undefined;

  constructor(
    private readonly api: Sqlite3Like,
    options: WasmStorageOptions,
    private readonly location: string,
    private db: Sqlite3DbLike,
    private readonly release: () => void,
  ) {
    this.files = options.files;
    this.locks = options.locks;
  }

  select(sql: string, params: readonly SqlValue[] = []): Promise<SqlRow[]> {
    try {
      const rows = this.db.exec({
        sql,
        bind: params,
        rowMode: 'object',
        returnValue: 'resultRows',
      });
      return Promise.resolve((rows as Record<string, SqlValue>[]).map((row) => ({ ...row })));
    } catch (cause) {
      return Promise.reject(asError(cause));
    }
  }

  async transaction(statements: readonly SqlStatement[]): Promise<void> {
    this.db.exec({ sql: 'BEGIN IMMEDIATE' });
    try {
      for (const item of statements) this.db.exec({ sql: item.sql, bind: item.params });
      this.db.exec({ sql: 'COMMIT' });
    } catch (cause) {
      try {
        this.db.exec({ sql: 'ROLLBACK' });
      } catch {
        // Some errors roll the transaction back on their own.
      }
      throw new ProjectError(
        'STORAGE_FAILED',
        `Could not write to ${this.location}: ${describeCause(cause)}`,
        { location: this.location },
        { cause },
      );
    }
    try {
      await this.files.write(this.location, this.exportBytes());
    } catch (cause) {
      // The change is committed in memory but not stored. Go back to what is stored, so
      // that memory and storage agree and the caller sees a write that did not happen.
      await this.restore();
      throw new ProjectError(
        'STORAGE_FAILED',
        `Could not store ${this.location}: ${describeCause(cause)}`,
        { location: this.location },
        { cause },
      );
    }
  }

  async copyTo(location: string): Promise<void> {
    // A project open elsewhere would overwrite the copy with its next save.
    if (location !== this.location && (await this.locks?.isHeld(location))) {
      throw inUse(location);
    }
    try {
      await this.files.write(location, this.exportBytes());
    } catch (cause) {
      throw new ProjectError(
        'STORAGE_FAILED',
        `Could not write a copy to ${location}: ${describeCause(cause)}`,
        { location },
        { cause },
      );
    }
  }

  close(): Promise<void> {
    try {
      this.db.close();
    } finally {
      this.release();
    }
    return Promise.resolve();
  }

  private exportBytes(): Uint8Array {
    return this.api.capi.sqlite3_js_db_export(this.db.pointer);
  }

  private async restore(): Promise<void> {
    const stored = await this.files.read(this.location);
    const previous = this.db;
    this.db = load(this.api, stored);
    previous.close();
  }
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
