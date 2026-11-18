/**
 * @mateo/project — the `.mateo` project file: format, storage and editing state.
 *
 * - `model`: the in-memory shape of a project (datasets, criteria, alternatives, matrices
 *   with crisp, TFN and linguistic cells, scales).
 * - `repository`: `createProjectRepository` to create and open files, and the
 *   `ProjectSession` of an open project (save, snapshots, analyses, source files...).
 * - `storage`: SQLite WebAssembly storage, browser file stores and project locks.
 * - `schema`: schema version and migrations.
 * - `history`: undo/redo and the model edit commands.
 * - `autosave`, `recent`: the autosave hook and the recent projects list.
 *
 * The file format is documented in `docs/project-file.md`; the package README shows how
 * the pieces are used.
 */
export const PACKAGE_NAME = '@mateo/project';

export * from './autosave';
export * from './errors';
export * from './history';
export type { JsonObject, JsonValue } from './json';
export * from './messages';
export * from './model';
export * from './recent';
export * from './repository';
export * from './schema';
export type {
  OpenConnectionOptions,
  SqlConnection,
  SqlRow,
  SqlStatement,
  SqlValue,
  StorageAdapter,
} from './sql';
export * from './storage';
