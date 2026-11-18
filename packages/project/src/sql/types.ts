import { ProjectError } from '../errors';

/**
 * Values that may be bound to a statement or come back from a query.
 *
 * Deliberately narrow, so that any SQLite driver (in this thread, in a worker, or behind a
 * message channel) can carry them without loss:
 *
 * - Numbers must be integers. Real numbers of the model travel as JSON text, which
 *   round-trips every double exactly (docs/project-file.md, Conventions).
 * - Binary data travels as hex text (`unhex(?)` when writing, `hex(column)` when reading).
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
 * The interface is deliberately small. There is no `begin`/`commit`: atomic writes are a
 * list of statements handed over in one call, so a transaction can never be left open
 * between calls, and a driver that runs in a worker needs one message per write.
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
  /** Writes a consistent copy of the database to another location of the same storage. */
  copyTo(location: string): Promise<void>;
  close(): Promise<void>;
}

export interface OpenConnectionOptions {
  /** `true`: the location may be new or empty. `false`: it must already exist. */
  readonly create: boolean;
}

/**
 * Where project files live and how they are reached: SQLite compiled to WebAssembly over
 * the browser's own storage (`createWasmStorage`). A location is a file name in that
 * storage, for example `Suppliers.mateo`.
 */
export interface StorageAdapter {
  readonly kind: string;
  /**
   * Opens the file at `location`. Opening never changes the file: the repository checks
   * that it is a project this version may modify before its first `transaction`.
   */
  open(location: string, options: OpenConnectionOptions): Promise<SqlConnection>;
}
