import { describeCause, ProjectError } from '../errors';
import type {
  OpenConnectionOptions,
  SqlConnection,
  SqlRow,
  SqlStatement,
  SqlValue,
  StorageAdapter,
} from '../sql/types';

/**
 * The part of a `Database` of `@tauri-apps/plugin-sql` (2.x) this adapter uses. The
 * plugin is not imported here: `@mateo/project` stays free of Tauri, and the desktop app
 * passes `Database.load` in.
 */
export interface TauriDatabaseLike {
  /** The connection string the database was loaded with. */
  readonly path: string;
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  /** Without an argument the plugin closes every pool, so the path is always passed. */
  close(db?: string): Promise<boolean>;
}

export interface TauriStorageOptions {
  /** `Database.load` of `@tauri-apps/plugin-sql`. */
  readonly load: (
    connection: string,
    options?: { autoCreate?: boolean },
  ) => Promise<TauriDatabaseLike>;
  /**
   * Deletes a file if it exists. Needed to replace an existing file with "Save As" (the
   * user already confirmed in the save dialog). Without it, copying onto an existing file
   * fails with `LOCATION_NOT_EMPTY`.
   */
  readonly removeFile?: (path: string) => Promise<void>;
}

/**
 * The plugin hands the text after `sqlite:` to sqlx, which splits it at `?` and
 * percent-decodes the file name. These three characters must therefore be escaped.
 */
export function tauriConnectionString(path: string): string {
  const escaped = path.replace(/[%?#]/g, (char) =>
    char === '%' ? '%25' : char === '?' ? '%3F' : '%23',
  );
  return `sqlite:${escaped}`;
}

/**
 * Project files through the Tauri SQL plugin (desktop).
 *
 * How the plugin behaves, and what this adapter does about it (checked against
 * tauri-plugin-sql 2.6 and sqlx 0.8):
 *
 * - Every call runs on an arbitrary connection of a pool, even when calls do not overlap.
 *   `BEGIN` and `COMMIT` in separate calls can therefore end up on different connections.
 *   A transaction is sent as one multi-statement call instead; sqlx runs it on a single
 *   connection and assigns positional `?` values across the statements in order.
 * - If a statement of such a call fails, the connection is returned to the pool with the
 *   transaction still open. The adapter then closes and reloads the pool, which rolls the
 *   transaction back.
 * - The plugin creates new files in WAL mode. A project is a single file that people copy
 *   and send around, so it must not depend on `-wal` side files: the file is switched to
 *   the rollback journal before the first write. If that is not possible (the file is in
 *   use elsewhere), the WAL is folded back into the file after every write instead.
 * - Numbers are bound as doubles and blobs cannot be bound, see `SqlValue`.
 */
export function createTauriStorage(options: TauriStorageOptions): StorageAdapter {
  return {
    kind: 'tauri',
    async open(location: string, open: OpenConnectionOptions): Promise<SqlConnection> {
      const connection = tauriConnectionString(location);
      let database: TauriDatabaseLike;
      try {
        database = await options.load(connection, { autoCreate: open.create });
      } catch (cause) {
        const text = describeCause(cause);
        const missing = !open.create && /does not exist|unable to open database/i.test(text);
        throw new ProjectError(
          missing ? 'NOT_FOUND' : 'STORAGE_FAILED',
          missing ? `No project file at ${location}.` : `Could not open ${location}: ${text}`,
          { location },
          { cause },
        );
      }
      return new TauriConnection(options, connection, location, database);
    },
  };
}

class TauriConnection implements SqlConnection {
  private walFallback = false;

  constructor(
    private readonly options: TauriStorageOptions,
    private readonly connection: string,
    private readonly location: string,
    private database: TauriDatabaseLike,
  ) {}

  async select(sql: string, params: readonly SqlValue[] = []): Promise<SqlRow[]> {
    return await this.database.select<SqlRow[]>(sql, [...params]);
  }

  async transaction(statements: readonly SqlStatement[]): Promise<void> {
    const sql = ['BEGIN IMMEDIATE', ...statements.map((item) => item.sql), 'COMMIT'].join(';\n');
    const params = statements.flatMap((item) => item.params);
    try {
      await this.database.execute(sql, params);
    } catch (cause) {
      // The failed call left a transaction open on some pooled connection.
      await this.reload();
      throw new ProjectError(
        'STORAGE_FAILED',
        `Could not write to ${this.location}: ${describeCause(cause)}`,
        { location: this.location },
        { cause },
      );
    }
    if (this.walFallback) {
      await this.database.select('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined);
    }
  }

  async prepareForWriting(): Promise<void> {
    const rows = await this.select('PRAGMA journal_mode');
    if (rows[0]?.['journal_mode'] !== 'wal') return;
    // Leaving WAL mode needs a moment with exactly one connection: the first call on a
    // freshly loaded pool.
    try {
      await this.reload();
      const changed = await this.select('PRAGMA journal_mode = DELETE');
      this.walFallback = changed[0]?.['journal_mode'] === 'wal';
    } catch {
      this.walFallback = true;
    }
  }

  async copyTo(location: string): Promise<void> {
    try {
      await this.options.removeFile?.(location);
      // VACUUM INTO writes a compact, consistent copy and refuses to overwrite a file.
      await this.database.execute('VACUUM INTO ?', [location]);
    } catch (cause) {
      const text = describeCause(cause);
      const exists = /already exists/i.test(text);
      throw new ProjectError(
        exists ? 'LOCATION_NOT_EMPTY' : 'STORAGE_FAILED',
        exists
          ? `A file already exists at ${location}.`
          : `Could not write a copy to ${location}: ${text}`,
        { location },
        { cause },
      );
    }
  }

  async close(): Promise<void> {
    await this.database.close(this.database.path);
  }

  private async reload(): Promise<void> {
    await this.database.close(this.database.path).catch(() => undefined);
    this.database = await this.options.load(this.connection, { autoCreate: false });
  }
}
