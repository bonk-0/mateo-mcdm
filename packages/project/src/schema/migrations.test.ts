import { verifyTrace } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import fixtureV1Hex from '../__fixtures__/project-v1.mateo?hex';
import { hexToBytes } from '../bytes';
import { sha256HexOfText } from '../hash';
import { getCell } from '../model/cells';
import { statement } from '../sql/types';
import {
  createTestRepository,
  createTestStorage,
  fillSample,
  SAMPLE_CELLS,
  SAMPLE_DATASET,
  SAMPLE_SCALE,
} from '../testing/harness';
import {
  assertMigrationList,
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  type Migration,
} from './migrations';
import { SCHEMA_V1 } from './v1';
import { APPLICATION_ID } from './version';

const fixtureV1 = (): Uint8Array => hexToBytes(fixtureV1Hex);

/** Two made-up later versions, to exercise the machinery on a real v1 file. */
const NOTES_VERSION = CURRENT_SCHEMA_VERSION + 1;
const FUTURE_VERSION = CURRENT_SCHEMA_VERSION + 2;
const FUTURE: readonly Migration[] = [
  ...MIGRATIONS,
  {
    version: NOTES_VERSION,
    name: 'add-criterion-notes',
    up: () => [statement(`ALTER TABLE criteria ADD COLUMN notes TEXT NOT NULL DEFAULT ''`)],
  },
  {
    // A migration that reads data to decide what to write.
    version: FUTURE_VERSION,
    name: 'copy-codes-to-notes',
    up: async (reader) => {
      const rows = await reader.select('SELECT id, code FROM criteria ORDER BY id');
      return rows.map((row) =>
        statement('UPDATE criteria SET notes = ? WHERE id = ?', [
          `was ${String(row['code'])}`,
          row['id'] as string,
        ]),
      );
    },
  },
];

describe('schema history', () => {
  it('never changes a released schema', () => {
    // If this fails you edited the frozen version 1 schema. Revert it and add a migration.
    expect(sha256HexOfText(SCHEMA_V1.join('\n'))).toBe(
      'fcc1a741aad089e6139b759f002c56c5bf12258c164a095935929e9a85d46029',
    );
    expect(MIGRATIONS[0]).toMatchObject({ version: 1, name: 'initial-schema' });
  });

  it('bumps the schema for trace format 2 without changing any table', async () => {
    expect(MIGRATIONS[1]).toMatchObject({ version: 2, name: 'trace-format-2' });
    expect(await MIGRATIONS[1]!.up({ select: () => Promise.resolve([]) })).toEqual([]);
  });

  it('numbers migrations consecutively from 1', () => {
    expect(() => assertMigrationList(MIGRATIONS)).not.toThrow();
    expect(CURRENT_SCHEMA_VERSION).toBe(MIGRATIONS.length);
    expect(() => assertMigrationList([{ version: 2, name: 'x', up: () => [] }])).toThrow(
      /version 1/,
    );
  });
});

describe('migrations', () => {
  it('opens the version 1 fixture file with the current schema', async () => {
    const test = await createTestStorage();
    await test.writeFile('old.mateo', fixtureV1());
    const repository = createTestRepository(test.storage);
    const session = await repository.open('old.mateo');

    expect(session.document.info).toMatchObject({
      name: 'Schema v1 fixture',
      createdWith: '0.1.0-test',
    });
    const dataset = session.document.model.datasets[0]!;
    expect({ ...dataset, matrices: [] }).toEqual({ ...SAMPLE_DATASET, matrices: [] });
    for (const cell of SAMPLE_CELLS) {
      expect(getCell(dataset.matrices[0]!, cell.alternativeId, cell.criterionId)).toEqual(
        cell.value,
      );
    }
    expect(session.document.model.scales).toEqual([SAMPLE_SCALE]);
    expect(session.document.settings).toEqual({ 'editor.precision': 4 });

    const [analysis] = await session.listAnalyses();
    expect(analysis).toMatchObject({ name: 'Stored run', methodId: 'toy-weighted-sum' });
    const stored = await session.getAnalysis(analysis!.id);
    expect((stored.record.result as { scores: number[] }).scores).toHaveLength(2);
    // Its trace was written in format 1 and is read as it is.
    expect(stored.traceFormatVersion).toBe(1);
    expect(stored.record.trace.steps.length).toBeGreaterThan(0);
    expect(verifyTrace(stored.record.trace)).toEqual([]);
    expect((await session.getSnapshot(stored.snapshotId)).content.dataset).toEqual(dataset);
    expect((await session.listSnapshots()).map((snapshot) => snapshot.label)).toContain('Baseline');
    const [file] = await session.listSourceFiles();
    expect(String.fromCharCode(...(await session.readSourceFile(file!.id)))).toBe('A;B\n1,5;2\n');
    expect(await session.listImportProfiles()).toMatchObject([{ name: 'Semicolon CSV' }]);
    await session.close();
  });

  it('upgrades the version 1 fixture file step by step and keeps its data', async () => {
    const test = await createTestStorage();
    await test.writeFile('old.mateo', fixtureV1());
    const seen: unknown[] = [];
    const repository = createTestRepository(test.storage, { migrations: FUTURE });
    expect(repository.schemaVersion).toBe(FUTURE_VERSION);

    const session = await repository.open('old.mateo', {
      beforeMigrate: (info) => {
        seen.push(info);
      },
    });
    expect(seen).toEqual([{ location: 'old.mateo', fromVersion: 1, toVersion: FUTURE_VERSION }]);
    expect(session.document.model.datasets[0]!.criteria.map((c) => c.code)).toEqual([
      'C1',
      'C2',
      'C3',
    ]);
    await session.close();

    // The file itself is now at the last version, with the new column filled from old data.
    const check = await test.storage.open('old.mateo', { create: false });
    expect(await check.select('PRAGMA user_version')).toEqual([{ user_version: FUTURE_VERSION }]);
    expect(await check.select('SELECT code, notes FROM criteria ORDER BY code')).toEqual([
      { code: 'C1', notes: 'was C1' },
      { code: 'C2', notes: 'was C2' },
      { code: 'C3', notes: 'was C3' },
    ]);
    expect(
      await check.select('SELECT version, name FROM schema_migrations ORDER BY version'),
    ).toEqual([
      { version: 1, name: 'initial-schema' },
      { version: 2, name: 'trace-format-2' },
      { version: NOTES_VERSION, name: 'add-criterion-notes' },
      { version: FUTURE_VERSION, name: 'copy-codes-to-notes' },
    ]);
    await check.close();

    // Opening again does not migrate again.
    const again = await repository.open('old.mateo', {
      beforeMigrate: () => {
        throw new Error('must not be called');
      },
    });
    await again.close();
  });

  it('gives a migrated file the same schema as a newly created one', async () => {
    const test = await createTestStorage();
    const repository = createTestRepository(test.storage, { migrations: FUTURE });
    await test.writeFile('old.mateo', fixtureV1());
    await (await repository.open('old.mateo')).close();
    await (await repository.create('new.mateo', { name: 'New' })).close();

    const schemaOf = async (location: string): Promise<unknown> => {
      const connection = await test.storage.open(location, { create: false });
      const rows = await connection.select(
        `SELECT type, name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name`,
      );
      await connection.close();
      return rows;
    };
    expect(await schemaOf('old.mateo')).toEqual(await schemaOf('new.mateo'));
  });

  it('refuses a file from a newer version and leaves it byte for byte as it was', async () => {
    const test = await createTestStorage();
    // A file written by a "future" Mateo with a later schema version.
    const future = createTestRepository(test.storage, { migrations: FUTURE });
    const written = await future.create('future.mateo', { name: 'From the future' });
    fillSample(written);
    await written.save();
    await written.close();
    const bytes = (await test.readFile('future.mateo'))!;

    const current = createTestRepository(test.storage);
    const error = await current.open('future.mateo').then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(error).toMatchObject({
      name: 'ProjectError',
      code: 'NEWER_SCHEMA',
      messageKey: 'project.error.NEWER_SCHEMA',
      details: {
        location: 'future.mateo',
        fileVersion: FUTURE_VERSION,
        supportedVersion: CURRENT_SCHEMA_VERSION,
      },
    });
    expect((error as Error).message).toMatch(/newer version of Mateo/);
    expect(await test.readFile('future.mateo')).toEqual(bytes);

    // The newer Mateo still opens it.
    const reopened = await future.open('future.mateo');
    expect(reopened.document.model.datasets).toHaveLength(1);
    await reopened.close();
  });

  it('leaves the file untouched when a migration fails or is cancelled', async () => {
    const test = await createTestStorage();
    await test.writeFile('old.mateo', fixtureV1());
    const broken: readonly Migration[] = [
      ...FUTURE.slice(0, NOTES_VERSION),
      {
        version: FUTURE_VERSION,
        name: 'broken',
        up: () => [
          statement(`UPDATE criteria SET notes = 'changed'`),
          statement('INSERT INTO no_such_table VALUES (1)'),
        ],
      },
    ];
    const repository = createTestRepository(test.storage, { migrations: broken });

    await expect(
      repository.open('old.mateo', {
        beforeMigrate: () => {
          throw new Error('user cancelled');
        },
      }),
    ).rejects.toThrow('user cancelled');
    expect(await test.readFile('old.mateo')).toEqual(fixtureV1());

    await expect(repository.open('old.mateo')).rejects.toMatchObject({
      code: 'MIGRATION_FAILED',
      details: { fromVersion: NOTES_VERSION, toVersion: FUTURE_VERSION },
    });
    // The steps before were applied completely, the broken one not at all: the file is a
    // valid file of the version before it.
    const check = await test.storage.open('old.mateo', { create: false });
    expect(await check.select('PRAGMA user_version')).toEqual([{ user_version: NOTES_VERSION }]);
    expect(
      await check.select(`SELECT count(*) AS n FROM criteria WHERE notes = 'changed'`),
    ).toEqual([{ n: 0 }]);
    await check.close();

    // With the fixed migration the same file upgrades.
    const fixed = await createTestRepository(test.storage, { migrations: FUTURE }).open(
      'old.mateo',
    );
    await fixed.close();
  });

  it('marks new files with the application id and the current version', async () => {
    const test = await createTestStorage();
    await (await createTestRepository(test.storage).create('n.mateo', { name: 'N' })).close();
    const connection = await test.storage.open('n.mateo', { create: false });
    expect(await connection.select('PRAGMA application_id')).toEqual([
      { application_id: APPLICATION_ID },
    ]);
    expect(await connection.select('PRAGMA user_version')).toEqual([
      { user_version: CURRENT_SCHEMA_VERSION },
    ]);
    expect(await connection.select('PRAGMA foreign_key_check')).toEqual([]);
    expect(await connection.select('PRAGMA integrity_check')).toEqual([{ integrity_check: 'ok' }]);
    await connection.close();
  });

  it('reports a project file without a version or without its project row as corrupt', async () => {
    const test = await createTestStorage();
    await (await createTestRepository(test.storage).create('x.mateo', { name: 'X' })).close();
    const connection = await test.storage.open('x.mateo', { create: false });
    await connection.transaction([statement('DELETE FROM project')]);
    await connection.close();
    await expect(createTestRepository(test.storage).open('x.mateo')).rejects.toMatchObject({
      code: 'CORRUPT_FILE',
    });

    const second = await test.storage.open('x.mateo', { create: false });
    await second.transaction([statement('PRAGMA user_version = 0')]);
    await second.close();
    await expect(createTestRepository(test.storage).open('x.mateo')).rejects.toMatchObject({
      code: 'CORRUPT_FILE',
    });
  });
});
