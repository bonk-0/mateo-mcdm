import type { Database as OoDatabase, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import type { TauriDatabaseLike, TauriStorageOptions } from '../storage/tauri';

/**
 * A stand-in for `@tauri-apps/plugin-sql` backed by the real SQLite engine, for tests.
 *
 * It reproduces the behaviour of the plugin that the adapter has to cope with, as checked
 * against tauri-plugin-sql 2.6 and sqlx 0.8:
 *
 * - numbers are bound as doubles, anything else that is not a string or null as JSON text;
 * - a call may contain several statements; positional values are assigned across them;
 * - BLOB columns come back as arrays of numbers;
 * - a file created by `load` starts in WAL mode, and leaving WAL mode only works as the
 *   first call on a freshly loaded pool;
 * - a call that fails inside `BEGIN ... COMMIT` leaves the transaction open, and because
 *   the next call may run on any pooled connection, `BEGIN`, `COMMIT` and `ROLLBACK` as
 *   calls of their own are refused outright: code that needs them is wrong.
 *
 * Files live in `disk` (path → bytes). A file is written when a call commits.
 */
export interface FakeTauri extends Required<TauriStorageOptions> {
  readonly disk: Map<string, Uint8Array>;
  /** Journal mode per path, as the real file header would record it. */
  readonly journalModes: Map<string, 'wal' | 'delete'>;
  /** Every `execute` and `select` call, for assertions. */
  readonly calls: { path: string; kind: 'execute' | 'select'; query: string }[];
  /** Number of pools loaded and not closed. */
  openPools(): number;
  /** While set, leaving WAL mode fails as if another program had the file open. */
  lockJournalMode: boolean;
}

function pathOf(connection: string): string {
  return decodeURIComponent(connection.slice('sqlite:'.length));
}

export function createFakeTauri(sqlite3: Sqlite3Static): FakeTauri {
  const { capi, wasm } = sqlite3;
  const disk = new Map<string, Uint8Array>();
  const journalModes = new Map<string, 'wal' | 'delete'>();
  const calls: FakeTauri['calls'] = [];
  let pools = 0;

  function openDatabase(bytes: Uint8Array | undefined): OoDatabase {
    const db = new sqlite3.oo1.DB(':memory:', 'c');
    if (bytes && bytes.length > 0) {
      const pointer = wasm.allocFromTypedArray(bytes);
      db.checkRc(
        capi.sqlite3_deserialize(
          db,
          'main',
          pointer,
          bytes.length,
          bytes.length,
          capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_RESIZEABLE,
        ),
      );
    }
    db.exec('PRAGMA foreign_keys = ON');
    return db;
  }

  /** Runs every statement of `sql`, binding values across them like sqlx does. */
  function run(db: OoDatabase, sql: string, values: readonly unknown[]): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    const scope = wasm.scopedAllocPush();
    try {
      let cursor = wasm.scopedAllocCString(sql, false);
      const [ppStmt, pzTail] = wasm.scopedAllocPtr(2) as [number, number];
      let next = 0;
      while (wasm.peek8(cursor) !== 0) {
        wasm.pokePtr(ppStmt, 0);
        db.checkRc(capi.sqlite3_prepare_v3(db, cursor, -1, 0, ppStmt, pzTail));
        const stmt = wasm.peekPtr(ppStmt);
        cursor = wasm.peekPtr(pzTail);
        if (!stmt) continue;
        try {
          const count = capi.sqlite3_bind_parameter_count(stmt);
          for (let index = 1; index <= count; index += 1) {
            // Like sqlx, a missing value is bound as NULL without complaint.
            const value = next < values.length ? values[next] : null;
            next += 1;
            if (value === null || value === undefined) capi.sqlite3_bind_null(stmt, index);
            else if (typeof value === 'number') capi.sqlite3_bind_double(stmt, index, value);
            else {
              const textValue = typeof value === 'string' ? value : JSON.stringify(value);
              // Bound from a pointer: the string overload is broken in the Node build.
              const [pointer, length] = wasm.scopedAllocCString(textValue, true);
              db.checkRc(
                capi.sqlite3_bind_text(stmt, index, pointer, length, capi.SQLITE_TRANSIENT),
              );
            }
          }
          let rc = capi.sqlite3_step(stmt);
          while (rc === capi.SQLITE_ROW) {
            const row: Record<string, unknown> = {};
            for (let column = 0; column < capi.sqlite3_column_count(stmt); column += 1) {
              const value = capi.sqlite3_column_js(stmt, column);
              row[capi.sqlite3_column_name(stmt, column)] =
                value instanceof Uint8Array
                  ? [...value]
                  : typeof value === 'bigint'
                    ? Number(value)
                    : value;
            }
            rows.push(row);
            rc = capi.sqlite3_step(stmt);
          }
          if (rc !== capi.SQLITE_DONE) db.checkRc(rc);
        } finally {
          capi.sqlite3_finalize(stmt);
        }
      }
    } finally {
      wasm.scopedAllocPop(scope);
    }
    return rows;
  }

  class FakeDatabase implements TauriDatabaseLike {
    private db: OoDatabase | undefined;
    private callsSinceLoad = 0;

    constructor(
      readonly path: string,
      private readonly file: string,
    ) {
      this.db = openDatabase(disk.get(file));
      pools += 1;
    }

    private use(kind: 'execute' | 'select', query: string): OoDatabase {
      if (!this.db) throw new Error(`database ${this.path} not loaded`);
      calls.push({ path: this.file, kind, query });
      if (/^\s*(BEGIN|COMMIT|ROLLBACK|END)\b[^;]*;?\s*$/i.test(query)) {
        throw new Error('fake plugin: transaction control across calls is not reliable on a pool');
      }
      if (capi.sqlite3_get_autocommit(this.db) === 0) {
        throw new Error('fake plugin: this pooled connection was left inside a transaction');
      }
      this.callsSinceLoad += 1;
      return this.db;
    }

    execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
      try {
        const db = this.use('execute', query);
        if (/^\s*VACUUM INTO \?\s*$/i.test(query)) {
          const target = String(bindValues[0]);
          if (disk.has(target)) throw new Error('output file already exists');
          db.exec('VACUUM');
          disk.set(target, capi.sqlite3_js_db_export(db));
          journalModes.set(target, 'delete');
        } else {
          run(db, query, bindValues);
          if (capi.sqlite3_get_autocommit(db) !== 0) {
            disk.set(this.file, capi.sqlite3_js_db_export(db));
          }
        }
        return Promise.resolve({ rowsAffected: 0 });
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
      try {
        const db = this.use('select', query);
        if (/^\s*PRAGMA journal_mode\s*$/i.test(query)) {
          return Promise.resolve([{ journal_mode: journalModes.get(this.file) ?? 'delete' }] as T);
        }
        if (/^\s*PRAGMA journal_mode = DELETE\s*$/i.test(query)) {
          if (this.callsSinceLoad > 1 || fake.lockJournalMode)
            throw new Error('database is locked');
          journalModes.set(this.file, 'delete');
          return Promise.resolve([{ journal_mode: 'delete' }] as T);
        }
        if (/^\s*PRAGMA wal_checkpoint/i.test(query)) {
          return Promise.resolve([{ busy: 0, log: 0, checkpointed: 0 }] as T);
        }
        return Promise.resolve(run(db, query, bindValues) as T);
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    close(db?: string): Promise<boolean> {
      if (db !== this.path) return Promise.reject(new Error('fake plugin: close needs the path'));
      if (this.db) {
        // Closing a connection rolls back whatever transaction it still had open.
        this.db.close();
        this.db = undefined;
        pools -= 1;
      }
      return Promise.resolve(true);
    }
  }

  const fake: FakeTauri = {
    disk,
    journalModes,
    calls,
    lockJournalMode: false,
    openPools: () => pools,
    load(connection, options) {
      const file = pathOf(connection);
      if (!disk.has(file)) {
        if (options?.autoCreate === false) {
          return Promise.reject(new Error(`database ${connection} does not exist`));
        }
        disk.set(file, new Uint8Array());
        journalModes.set(file, 'wal');
      }
      return Promise.resolve(new FakeDatabase(connection, file));
    },
    removeFile(path) {
      disk.delete(path);
      journalModes.delete(path);
      return Promise.resolve();
    },
  };
  return fake;
}
