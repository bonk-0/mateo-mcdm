import { describe, expect, it } from 'vitest';
import { statement } from '../sql/types';
import { createFakeTauri } from '../testing/fake-tauri';
import { createTestRepository, fillSample } from '../testing/harness';
import { loadSqlite } from '../testing/sqlite';
import { createTauriStorage, tauriConnectionString } from './tauri';

const setup = async () => {
  const fake = createFakeTauri(await loadSqlite());
  return { fake, storage: createTauriStorage(fake) };
};

describe('Tauri storage', () => {
  it('escapes the characters sqlx would misread in a file path', () => {
    expect(tauriConnectionString('/home/ayşe/My Projects/a.mateo')).toBe(
      'sqlite:/home/ayşe/My Projects/a.mateo',
    );
    expect(tauriConnectionString('C:\\Users\\a\\100% done?#1.mateo')).toBe(
      'sqlite:C:\\Users\\a\\100%25 done%3F%231.mateo',
    );
  });

  it('handles paths with special characters end to end', async () => {
    const { fake, storage } = await setup();
    const path = '/data/100% done?#1.mateo';
    await (await createTestRepository(storage).create(path, { name: 'Odd path' })).close();
    expect([...fake.disk.keys()]).toEqual([path]);
    await (await createTestRepository(storage).open(path)).close();
  });

  it('sends each transaction as one call and never issues BEGIN or COMMIT on their own', async () => {
    const { fake, storage } = await setup();
    const session = await createTestRepository(storage).create('/p.mateo', { name: 'P' });
    fillSample(session);
    await session.save();
    await session.close();
    const writes = fake.calls.filter((call) => call.kind === 'execute');
    expect(writes.length).toBeGreaterThan(2);
    for (const call of writes) {
      expect(call.query.startsWith('BEGIN IMMEDIATE;\n')).toBe(true);
      expect(call.query.endsWith(';\nCOMMIT')).toBe(true);
    }
  });

  it('switches a new file from WAL to the rollback journal before the first write', async () => {
    const { fake, storage } = await setup();
    const session = await createTestRepository(storage).create('/p.mateo', { name: 'P' });
    expect(fake.journalModes.get('/p.mateo')).toBe('delete');
    const first = fake.calls.findIndex((call) => call.kind === 'execute');
    expect(fake.calls.slice(0, first).map((call) => call.query)).toContain(
      'PRAGMA journal_mode = DELETE',
    );
    await session.close();
    expect(fake.openPools()).toBe(0);
  });

  it('folds the WAL back after every write when the journal mode cannot be changed', async () => {
    const { fake, storage } = await setup();
    fake.lockJournalMode = true;
    const session = await createTestRepository(storage).create('/p.mateo', { name: 'P' });
    expect(fake.journalModes.get('/p.mateo')).toBe('wal');
    fake.calls.length = 0;
    session.setInfo({ name: 'Q' });
    await session.save();
    expect(fake.calls.map((call) => call.query.split(/[;\n]/)[0])).toEqual([
      'BEGIN IMMEDIATE',
      'PRAGMA wal_checkpoint(TRUNCATE)',
    ]);
    await session.close();
  });

  it('recovers from a failed transaction by reloading the pool', async () => {
    const { fake, storage } = await setup();
    await (await createTestRepository(storage).create('/p.mateo', { name: 'P' })).close();
    const connection = await storage.open('/p.mateo', { create: false });
    await connection.prepareForWriting();
    await expect(
      connection.transaction([
        statement('INSERT INTO settings (key, value) VALUES (?, ?)', ['a', '1']),
        statement('INSERT INTO settings (key, value) VALUES (?, ?)', ['b', 'not json']),
      ]),
    ).rejects.toMatchObject({
      code: 'STORAGE_FAILED',
      message: expect.stringMatching(/CHECK constraint/) as string,
    });
    // The connection is usable again and nothing of the failed transaction is visible.
    expect(await connection.select('SELECT count(*) AS n FROM settings')).toEqual([{ n: 0 }]);
    await connection.transaction([
      statement('INSERT INTO settings (key, value) VALUES (?, ?)', ['a', '1']),
    ]);
    expect(await connection.select('SELECT key FROM settings')).toEqual([{ key: 'a' }]);
    await connection.close();
    expect(fake.openPools()).toBe(0);
  });

  it('copies onto an existing file only when the app can delete it', async () => {
    const { fake, storage } = await setup();
    const repository = createTestRepository(storage);
    await (await repository.create('/a.mateo', { name: 'A' })).close();
    await (await repository.create('/b.mateo', { name: 'B' })).close();

    const strict = createTauriStorage({ load: fake.load });
    const session = await createTestRepository(strict).open('/a.mateo');
    await expect(session.saveAs('/b.mateo')).rejects.toMatchObject({ code: 'LOCATION_NOT_EMPTY' });
    expect(session.location).toBe('/a.mateo');
    await session.saveAs('/c.mateo');
    await session.close();
    expect((await repository.open('/b.mateo')).document.info.name).toBe('B');
    expect((await repository.open('/c.mateo')).document.info.name).toBe('A');

    const failing = createTauriStorage({
      load: fake.load,
      removeFile: () => Promise.reject(new Error('permission denied')),
    });
    const second = await createTestRepository(failing).open('/a.mateo');
    await expect(second.saveAs('/d.mateo')).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    await second.close();
  });

  it('reports a failing load as a storage error', async () => {
    const storage = createTauriStorage({
      load: () => Promise.reject(new Error('permission denied (os error 13)')),
    });
    await expect(storage.open('/x.mateo', { create: true })).rejects.toMatchObject({
      code: 'STORAGE_FAILED',
      message: expect.stringMatching(/permission denied/) as string,
    });
    await expect(storage.open('/x.mateo', { create: false })).rejects.toMatchObject({
      code: 'STORAGE_FAILED',
    });
  });
});
