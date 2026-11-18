import { ProjectError, isProjectError } from '../errors';
import { assertValidId, randomId } from '../model/ids';
import type { RecentProjects } from '../recent';
import type { Migration } from '../schema/migrations';
import {
  assertMigrationList,
  MIGRATIONS,
  readFileHeader,
  runMigrations,
} from '../schema/migrations';
import { APPLICATION_ID } from '../schema/version';
import type { SqlConnection, StorageAdapter } from '../sql/types';
import { statement } from '../sql/types';
import { loadDocument } from './load';
import type { SessionEnvironment } from './session';
import { ProjectSession } from './session';

export interface ProjectRepositoryOptions {
  /** Usually `createWasmStorage(...)`. */
  readonly storage: StorageAdapter;
  /** Version of the app, recorded in files and analyses. */
  readonly appVersion: string;
  /** Keeps the list of recently used projects up to date, if given. */
  readonly recent?: RecentProjects;
  /** Clock, for tests. */
  readonly now?: () => Date;
  /** Id generator, for tests. Defaults to `crypto.randomUUID`. */
  readonly newId?: () => string;
  /** Schema history, for tests of the migration machinery. Defaults to `MIGRATIONS`. */
  readonly migrations?: readonly Migration[];
}

export interface CreateProjectOptions {
  readonly name: string;
  readonly description?: string;
}

export interface OpenProjectOptions {
  /**
   * Called before a file written by an older version is upgraded, for example to keep a
   * backup copy: once upgraded, older versions of Mateo cannot open the file any more.
   * Throwing cancels the open and leaves the file untouched.
   */
  readonly beforeMigrate?: (info: {
    readonly location: string;
    readonly fromVersion: number;
    readonly toVersion: number;
  }) => Promise<void> | void;
}

/** Creates and opens project files. One per app. */
export interface ProjectRepository {
  /** The schema version this repository reads and writes. */
  readonly schemaVersion: number;
  readonly recent: RecentProjects | undefined;
  /**
   * Creates a new, empty project at a location that does not hold data yet
   * (`LOCATION_NOT_EMPTY` otherwise: delete an existing file first, after the user agreed).
   */
  create(location: string, options: CreateProjectOptions): Promise<ProjectSession>;
  /**
   * Opens an existing project.
   *
   * - `NOT_FOUND`: there is no such file.
   * - `NOT_A_PROJECT_FILE`: the file is something else.
   * - `NEWER_SCHEMA`: the file was written by a newer Mateo. It is not modified.
   * - `MIGRATION_FAILED`: upgrading an older file failed. It is left as it was.
   * - `CORRUPT_FILE`: the content breaks the format.
   */
  open(location: string, options?: OpenProjectOptions): Promise<ProjectSession>;
}

export function createProjectRepository(options: ProjectRepositoryOptions): ProjectRepository {
  const migrations = options.migrations ?? MIGRATIONS;
  assertMigrationList(migrations);
  const schemaVersion = migrations.length;
  const now = (): string => (options.now?.() ?? new Date()).toISOString();
  const migrationContext = { appVersion: options.appVersion, now };

  const environment: SessionEnvironment = {
    storage: options.storage,
    appVersion: options.appVersion,
    now,
    newId: options.newId ?? randomId,
    onLocated: (session) => {
      options.recent?.add({
        location: session.location,
        name: session.document.info.name,
        openedAt: now(),
      });
    },
  };

  async function connect<T>(
    location: string,
    create: boolean,
    use: (connection: SqlConnection) => Promise<T>,
  ): Promise<T> {
    const connection = await options.storage.open(location, { create });
    try {
      return await use(connection);
    } catch (error) {
      await connection.close().catch(() => undefined);
      throw error;
    }
  }

  async function start(connection: SqlConnection, location: string): Promise<ProjectSession> {
    const session = new ProjectSession(
      environment,
      connection,
      location,
      await loadDocument(connection),
    );
    environment.onLocated(session);
    return session;
  }

  return {
    schemaVersion,
    recent: options.recent,

    create(location, create) {
      const notEmpty = (): ProjectError =>
        new ProjectError(
          'LOCATION_NOT_EMPTY',
          `Cannot create a project at ${location}: a file already exists there.`,
          { location },
        );
      return connect(location, true, async (connection) => {
        const header = await readFileHeader(connection).catch((error: unknown) => {
          if (isProjectError(error, 'NOT_A_PROJECT_FILE')) return null;
          throw error;
        });
        if (
          header === null ||
          header.applicationId !== 0 ||
          header.schemaVersion !== 0 ||
          header.tableCount !== 0
        ) {
          throw notEmpty();
        }
        const id = environment.newId();
        assertValidId(id, 'project');
        const createdAt = now();
        await runMigrations(connection, 0, migrations, migrationContext);
        await connection.transaction([
          statement(
            `INSERT INTO project (singleton, id, name, description, created_at, updated_at, created_with, updated_with)
             VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              create.name,
              create.description ?? '',
              createdAt,
              createdAt,
              options.appVersion,
              options.appVersion,
            ],
          ),
        ]);
        return await start(connection, location);
      }).catch((error: unknown) => {
        // The storage could not even read what is at the location as a database.
        throw isProjectError(error, 'NOT_A_PROJECT_FILE') ? notEmpty() : error;
      });
    },

    open(location, open = {}) {
      return connect(location, false, async (connection) => {
        // Nothing is written until the file is known to be a project this version may
        // modify.
        const header = await readFileHeader(connection);
        if (header.applicationId !== APPLICATION_ID) {
          throw new ProjectError('NOT_A_PROJECT_FILE', `${location} is not a Mateo project.`, {
            location,
          });
        }
        if (header.schemaVersion > schemaVersion) {
          throw new ProjectError(
            'NEWER_SCHEMA',
            `${location} was saved by a newer version of Mateo (file format ${header.schemaVersion}; this version reads up to ${schemaVersion}).`,
            { location, fileVersion: header.schemaVersion, supportedVersion: schemaVersion },
          );
        }
        if (header.schemaVersion < 1) {
          throw new ProjectError('CORRUPT_FILE', `${location} has no file format version.`, {
            location,
          });
        }
        if (header.schemaVersion < schemaVersion) {
          await open.beforeMigrate?.({
            location,
            fromVersion: header.schemaVersion,
            toVersion: schemaVersion,
          });
        }
        await runMigrations(connection, header.schemaVersion, migrations, migrationContext);
        return await start(connection, location);
      });
    },
  };
}
