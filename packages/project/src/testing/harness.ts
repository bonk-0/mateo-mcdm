import type { ProjectRepositoryOptions } from '../repository/repository';
import { createProjectRepository, type ProjectRepository } from '../repository/repository';
import type { StorageAdapter } from '../sql/types';
import { memoryFileStore, type FileStore } from '../storage/file-store';
import type { ProjectLocks } from '../storage/locks';
import { createWasmStorage, type Sqlite3Like } from '../storage/wasm';
import { loadSqlite } from './sqlite';

export * from './sample';

/** The storage under test, with direct access to the files behind it. */
export interface TestStorage {
  readonly storage: StorageAdapter;
  readonly files: FileStore;
  readFile(location: string): Promise<Uint8Array | null>;
  writeFile(location: string, bytes: Uint8Array): Promise<void>;
}

/** The real SQLite WebAssembly build over files kept in memory. */
export async function createTestStorage(
  options: { locks?: ProjectLocks } = {},
): Promise<TestStorage> {
  const sqlite3 = (await loadSqlite()) as unknown as Sqlite3Like;
  const files = memoryFileStore();
  return {
    files,
    storage: createWasmStorage({ sqlite3, files, ...options }),
    readFile: (location) => files.read(location),
    writeFile: (location, bytes) => files.write(location, bytes),
  };
}

/** A repository with a deterministic clock and ids. */
export function createTestRepository(
  storage: StorageAdapter,
  options: Partial<ProjectRepositoryOptions> = {},
): ProjectRepository {
  let tick = 0;
  let id = 0;
  return createProjectRepository({
    storage,
    appVersion: '0.1.0-test',
    now: () => new Date(Date.UTC(2026, 0, 1, 12, 0, tick++)),
    newId: () => `id-${String(++id).padStart(4, '0')}`,
    ...options,
  });
}
