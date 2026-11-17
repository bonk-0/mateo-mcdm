import { describeCause, ProjectError } from '../errors';
import type { SqlConnection, SqlRow, SqlStatement, SqlValue } from '../sql/types';
import { statement } from '../sql/types';
import { SCHEMA_V1 } from './v1';
import { APPLICATION_ID } from './version';

/** Read access a migration gets while it plans its changes. */
export interface MigrationReader {
  select(sql: string, params?: readonly SqlValue[]): Promise<SqlRow[]>;
}

/**
 * One step of the schema history. `version` is the schema version the file has after the
 * step. A migration first reads whatever it needs and returns the statements to run; the
 * runner applies them together with the version bump as one transaction, so a file is
 * always entirely at one version.
 *
 * Rules:
 * - A released migration is never edited. Fix forward with a new one.
 * - Every change of the format gets a migration, including changes no SQL is needed for
 *   (a new cell kind, number type or matrix role): the bump is what makes an older Mateo
 *   refuse the file instead of misreading it.
 */
export interface Migration {
  readonly version: number;
  /** Short kebab-case description, recorded in `schema_migrations`. */
  readonly name: string;
  up(reader: MigrationReader): Promise<readonly SqlStatement[]> | readonly SqlStatement[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    up: () => SCHEMA_V1.map((sql) => statement(sql)),
  },
  {
    // Analyses are now written with trace format 2 (shared derivation nodes, see
    // `encodeTrace` in @mateo/engine). No SQL changes: existing analyses keep format 1
    // and are read as they are. The bump makes a Mateo that only reads format 1 refuse
    // the file as newer instead of failing on each new analysis.
    version: 2,
    name: 'trace-format-2',
    up: () => [],
  },
];

/** The schema version this build reads and writes. */
export const CURRENT_SCHEMA_VERSION = MIGRATIONS.length;

export function assertMigrationList(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new ProjectError(
        'INVALID_ARGUMENT',
        `Migration "${migration.name}" must have version ${index + 1}, not ${migration.version}.`,
      );
    }
  });
}

export interface FileHeader {
  readonly applicationId: number;
  readonly schemaVersion: number;
  /** Number of tables, to tell an empty database from a foreign one. */
  readonly tableCount: number;
}

/**
 * Reads what identifies the file. This only reads, and it is the first thing done with any
 * file, so a file that is rejected is never modified.
 */
export async function readFileHeader(connection: SqlConnection): Promise<FileHeader> {
  let rows: SqlRow[];
  try {
    rows = await connection.select(
      `SELECT
         (SELECT application_id FROM pragma_application_id) AS application_id,
         (SELECT user_version FROM pragma_user_version) AS user_version,
         (SELECT count(*) FROM sqlite_schema WHERE type = 'table') AS table_count`,
    );
  } catch (cause) {
    throw new ProjectError(
      'NOT_A_PROJECT_FILE',
      `This file is not a Mateo project: ${describeCause(cause)}`,
      {},
      { cause },
    );
  }
  const row = rows[0];
  const applicationId = row?.['application_id'];
  const schemaVersion = row?.['user_version'];
  const tableCount = row?.['table_count'];
  if (
    typeof applicationId !== 'number' ||
    typeof schemaVersion !== 'number' ||
    typeof tableCount !== 'number'
  ) {
    throw new ProjectError('NOT_A_PROJECT_FILE', 'This file is not a Mateo project.');
  }
  return { applicationId, schemaVersion, tableCount };
}

export interface MigrationContext {
  readonly appVersion: string;
  readonly now: () => string;
}

/**
 * Brings a file from `fromVersion` to the last version of `migrations`, one atomic step
 * per version. `fromVersion` 0 is an empty database: the first step also stamps the
 * application id.
 */
export async function runMigrations(
  connection: SqlConnection,
  fromVersion: number,
  migrations: readonly Migration[],
  context: MigrationContext,
): Promise<void> {
  for (const migration of migrations.slice(fromVersion)) {
    try {
      const planned = await migration.up({
        select: (sql, params) => connection.select(sql, params),
      });
      await connection.transaction([
        ...(migration.version === 1
          ? [statement(`PRAGMA application_id = ${APPLICATION_ID}`)]
          : []),
        ...planned,
        statement(
          'INSERT INTO schema_migrations (version, name, applied_at, app_version) VALUES (?, ?, ?, ?)',
          [migration.version, migration.name, context.now(), context.appVersion],
        ),
        // PRAGMA takes no parameters; the version is an integer from the list above.
        statement(`PRAGMA user_version = ${migration.version}`),
      ]);
    } catch (cause) {
      throw new ProjectError(
        'MIGRATION_FAILED',
        `Could not upgrade the project file to format version ${migration.version} (${migration.name}): ${describeCause(cause)}`,
        { fromVersion: migration.version - 1, toVersion: migration.version },
        { cause },
      );
    }
  }
}
