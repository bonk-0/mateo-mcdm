import { describe, expect, it } from 'vitest';
import { statement } from '../sql/types';
import { createTestRepository, fillSample } from '../testing/harness';
import { loadSqlite } from '../testing/sqlite';
import { memoryFileStore, type FileStore } from './file-store';
import { memoryProjectLocks, webProjectLocks, type LockManagerLike } from './locks';
import { createWasmStorage, type Sqlite3Like } from './wasm';

const sqlite3 = async () => (await loadSqlite()) as unknown as Sqlite3Like;

describe('SQLite WebAssembly storage', () => {
  it('loads the SQLite module lazily and only once', async () => {
    let loads = 0;
    const storage = createWasmStorage({
      files: memoryFileStore(),
      sqlite3: () => {
        loads += 1;
        return sqlite3();
      },
    });
    await expect(storage.open('missing.mateo', { create: false })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(loads).toBe(0);
    await (await storage.open('a.mateo', { create: true })).close();
    await (await storage.open('b.mateo', { create: true })).close();
    expect(loads).toBe(1);
  });

  it('writes the whole file after each transaction and nothing before', async () => {
    const files = memoryFileStore();
    const storage = createWasmStorage({ sqlite3: await sqlite3(), files });
    const connection = await storage.open('a.mateo', { create: true });
    expect(await connection.select('SELECT 1 AS one')).toEqual([{ one: 1 }]);
    expect(await files.list()).toEqual([]);
    await connection.transaction([statement('CREATE TABLE t (x TEXT) STRICT')]);
    const first = (await files.read('a.mateo'))!;
    expect(first.length).toBeGreaterThan(0);
    await connection.transaction([statement('INSERT INTO t VALUES (?)', ['x'])]);
    expect(await files.read('a.mateo')).not.toEqual(first);
    await expect(connection.select('SELECT nope')).rejects.toThrow(/no such column/);
    await connection.close();
  });

  it('rolls back a failed transaction', async () => {
    const files = memoryFileStore();
    const storage = createWasmStorage({ sqlite3: await sqlite3(), files });
    const connection = await storage.open('a.mateo', { create: true });
    await connection.transaction([statement('CREATE TABLE t (x TEXT PRIMARY KEY) STRICT')]);
    const stored = await files.read('a.mateo');
    await expect(
      connection.transaction([
        statement('INSERT INTO t VALUES (?)', ['a']),
        statement('INSERT INTO t VALUES (?)', ['a']),
      ]),
    ).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    expect(await connection.select('SELECT count(*) AS n FROM t')).toEqual([{ n: 0 }]);
    expect(await files.read('a.mateo')).toEqual(stored);
    await connection.close();
  });

  it('goes back to the stored state when the file cannot be written', async () => {
    const memory = memoryFileStore();
    let failing = false;
    const files: FileStore = {
      ...memory,
      write: (name, bytes) =>
        failing ? Promise.reject(new Error('QuotaExceededError')) : memory.write(name, bytes),
    };
    const storage = createWasmStorage({ sqlite3: await sqlite3(), files });
    const repository = createTestRepository(storage);
    const session = await repository.create('q.mateo', { name: 'Quota' });
    fillSample(session);
    failing = true;
    await expect(session.save()).rejects.toMatchObject({
      code: 'STORAGE_FAILED',
      message: expect.stringMatching(/QuotaExceededError/) as string,
    });
    expect(session.isDirty).toBe(true);
    await expect(session.saveAs('other.mateo')).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    // Memory and storage agree again, so a later save writes everything.
    failing = false;
    await session.save();
    const model = session.document.model;
    await session.close();
    const reopened = await repository.open('q.mateo');
    expect(reopened.document.model).toEqual(model);
    await reopened.close();
  });

  it('opens a file that another tool left in WAL mode', async () => {
    const files = memoryFileStore();
    const storage = createWasmStorage({ sqlite3: await sqlite3(), files });
    await (await createTestRepository(storage).create('w.mateo', { name: 'WAL' })).close();
    const bytes = (await files.read('w.mateo'))!;
    bytes[18] = 2;
    bytes[19] = 2;
    await files.write('w.mateo', bytes);
    const session = await createTestRepository(storage).open('w.mateo');
    expect(session.document.info.name).toBe('WAL');
    // Reading alone does not rewrite the stored file.
    expect(await files.read('w.mateo')).toEqual(bytes);
    session.setInfo({ name: 'Rollback' });
    await session.save();
    await session.close();
    const saved = (await files.read('w.mateo'))!;
    expect([saved[18], saved[19]]).toEqual([1, 1]);
  });

  it('keeps a project open in one place at a time', async () => {
    const files = memoryFileStore();
    const locks = memoryProjectLocks();
    const tab1 = createTestRepository(
      createWasmStorage({ sqlite3: await sqlite3(), files, locks }),
    );
    const tab2 = createTestRepository(
      createWasmStorage({ sqlite3: await sqlite3(), files, locks }),
    );
    const first = await tab1.create('a.mateo', { name: 'A' });
    await expect(tab2.open('a.mateo')).rejects.toMatchObject({
      code: 'IN_USE',
      details: { location: 'a.mateo' },
    });
    const other = await tab2.create('b.mateo', { name: 'B' });
    // Copying onto a project open elsewhere would be overwritten by its next save.
    await expect(other.saveAs('a.mateo')).rejects.toMatchObject({ code: 'IN_USE' });
    expect(other.location).toBe('b.mateo');
    // Save as moves the lock: the old name is free, the new one taken.
    await first.saveAs('c.mateo');
    const reopened = await tab2.open('a.mateo');
    await reopened.close();
    await expect(tab2.open('c.mateo')).rejects.toMatchObject({ code: 'IN_USE' });
    await first.close();
    await other.close();
    await (await tab2.open('c.mateo')).close();
  });

  it('releases the lock when a file cannot be opened', async () => {
    const files = memoryFileStore({
      'junk.mateo': Uint8Array.from('not SQLite'.repeat(20), (c) => c.charCodeAt(0)),
    });
    const locks = memoryProjectLocks();
    const repository = createTestRepository(
      createWasmStorage({ sqlite3: await sqlite3(), files, locks }),
    );
    await expect(repository.open('missing.mateo')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(repository.open('junk.mateo')).rejects.toMatchObject({
      code: 'NOT_A_PROJECT_FILE',
    });
    expect(await locks.isHeld('missing.mateo')).toBe(false);
    expect(await locks.isHeld('junk.mateo')).toBe(false);
  });
});

describe('Web Locks', () => {
  /** Follows the Web Locks API for exclusive locks requested with `ifAvailable`. */
  function fakeLockManager(): LockManagerLike {
    const held = new Set<string>();
    return {
      async request(name, _options, callback) {
        if (held.has(name)) return await callback(null);
        held.add(name);
        try {
          return await callback({ name });
        } finally {
          held.delete(name);
        }
      },
      query: () => Promise.resolve({ held: [...held].map((name) => ({ name })) }),
    };
  }

  it('holds a lock until it is released and tells whether it is held', async () => {
    const locks = webProjectLocks(fakeLockManager());
    const release = await locks.acquire('a.mateo');
    expect(release).toBeTypeOf('function');
    expect(await locks.acquire('a.mateo')).toBeNull();
    expect(await locks.isHeld('a.mateo')).toBe(true);
    expect(await locks.isHeld('b.mateo')).toBe(false);
    release!();
    await Promise.resolve();
    await Promise.resolve();
    expect(await locks.isHeld('a.mateo')).toBe(false);
    const again = await locks.acquire('a.mateo');
    expect(again).toBeTypeOf('function');
    again!();
  });

  it('passes on a failing lock manager', async () => {
    const locks = webProjectLocks({
      request: () => Promise.reject(new Error('SecurityError')),
      query: () => Promise.resolve({}),
    });
    await expect(locks.acquire('a.mateo')).rejects.toThrow('SecurityError');
    expect(await locks.isHeld('a.mateo')).toBe(false);
  });
});
