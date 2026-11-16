import type { ProjectRepositoryOptions } from '../repository/repository';
import { createProjectRepository, type ProjectRepository } from '../repository/repository';
import type { StorageAdapter } from '../sql/types';
import { memoryFileStore, type FileStore } from '../storage/file-store';
import { createTauriStorage } from '../storage/tauri';
import { createWasmStorage, type Sqlite3Like } from '../storage/wasm';
import { createFakeTauri, type FakeTauri } from './fake-tauri';
import { loadSqlite } from './sqlite';

export * from './sample';

/** One storage adapter under test, with direct access to the files behind it. */
export interface TestStorage {
  readonly kind: 'wasm' | 'tauri';
  readonly storage: StorageAdapter;
  readFile(location: string): Promise<Uint8Array | null>;
  writeFile(location: string, bytes: Uint8Array): Promise<void>;
  /** Only for `tauri`. */
  readonly fake?: FakeTauri;
  /** Only for `wasm`. */
  readonly files?: FileStore;
}

export const STORAGE_KINDS = ['wasm', 'tauri'] as const;

export async function createTestStorage(kind: 'wasm' | 'tauri'): Promise<TestStorage> {
  const sqlite3 = await loadSqlite();
  if (kind === 'wasm') {
    const files = memoryFileStore();
    return {
      kind,
      files,
      storage: createWasmStorage({ sqlite3: sqlite3 as unknown as Sqlite3Like, files }),
      readFile: (location) => files.read(location),
      writeFile: (location, bytes) => files.write(location, bytes),
    };
  }
  const fake = createFakeTauri(sqlite3);
  return {
    kind,
    fake,
    storage: createTauriStorage(fake),
    readFile: (location) => Promise.resolve(fake.disk.get(location)?.slice() ?? null),
    writeFile: (location, bytes) => {
      fake.disk.set(location, bytes.slice());
      fake.journalModes.set(location, 'delete');
      return Promise.resolve();
    },
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
