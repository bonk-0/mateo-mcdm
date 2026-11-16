import { ProjectError } from '../errors';

/**
 * Values that may be bound to a statement or come back from a query.
 *
 * Deliberately narrow, because the two drivers agree on nothing else:
 *
 * - Numbers must be integers. The Tauri SQL plugin binds every number as a double and its
 *   JSON bridge does not guarantee exact doubles, so real numbers travel as JSON text.
 * - Binary data travels as hex text (`unhex(?)` when writing, `hex(column)` when reading):
 *   the plugin cannot bind blobs.
 */
export type SqlValue = string | number | null;

export type SqlRow = Readonly<Record<string, SqlValue>>;

/** One SQL statement with positional `?` parameters. */
export interface SqlStatement {
  readonly sql: string;
  readonly params: readonly SqlValue[];
}

/**
 * Builds a statement and checks that it has exactly one value per `?`. A missing value
 * would be bound as NULL by SQLite without any error.
 *
 * The SQL of this package never contains a `?` or a `;` outside of their syntactic role
 * (no such characters in string literals), which the drivers rely on.
 */
export function statement(sql: string, params: readonly SqlValue[] = []): SqlStatement {
  const placeholders = sql.split('?').length - 1;
  if (placeholders !== params.length) {
    throw new ProjectError(
      'INVALID_ARGUMENT',
      `SQL statement has ${placeholders} placeholders but ${params.length} values: ${sql}`,
    );
  }
  for (const value of params) {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new ProjectError('INVALID_ARGUMENT', `Only integers may be bound as numbers: ${sql}`);
    }
  }
  return { sql: sql.trim().replace(/;\s*$/, ''), params };
}

/**
 * An open connection to one project file.
 *
 * The interface is the smallest one both drivers can implement safely. In particular
 * there is no `begin`/`commit`: the Tauri SQL plugin runs each call on any connection of
 * a pool, so a transaction that spans several calls is not possible there. Atomic writes
 * are a list of statements handed over in one call.
 *
 * Calls must not overlap; the repository runs them one at a time.
 */
export interface SqlConnection {
  /** Runs one query and returns its rows. Must not be used to write. */
  select(sql: string, params?: readonly SqlValue[]): Promise<SqlRow[]>;
  /**
   * Runs the statements in order as one transaction: either all of them are applied and
   * durable when the promise resolves, or none is.
   */
  transaction(statements: readonly SqlStatement[]): Promise<void>;
  /**
   * Called once before the first write, after the file was accepted as a project this
   * version may modify. Until then the connection must not change the file in any way.
   */
  prepareForWriting(): Promise<void>;
  /** Writes a consistent copy of the database to another location of the same storage. */
  copyTo(location: string): Promise<void>;
  close(): Promise<void>;
}

export interface OpenConnectionOptions {
  /** `true`: the location may be new or empty. `false`: it must already exist. */
  readonly create: boolean;
}

/**
 * Where project files live and how they are reached: the Tauri SQL plugin on the desktop
 * (`createTauriStorage`) and SQLite compiled to WebAssembly in the browser
 * (`createWasmStorage`). A location is a file path on the desktop and a file name in the
 * browser's private storage.
 */
export interface StorageAdapter {
  readonly kind: string;
  open(location: string, options: OpenConnectionOptions): Promise<SqlConnection>;
}
