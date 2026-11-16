import { describe, expect, it, vi } from 'vitest';
import { addDataset, removeDataset, setCells, updateCriterion } from '../history/commands';
import { crispCell } from '../model/cells';
import { createRecentProjects } from '../recent';
import { statement } from '../sql/types';
import {
  createTestRepository,
  createTestStorage,
  fillSample,
  runToyMethod,
  SAMPLE_DATASET,
  STORAGE_KINDS,
} from '../testing/harness';

const DS = SAMPLE_DATASET.id;
const edit = (value: number) =>
  setCells(DS, 'm-decision', [
    { alternativeId: 'a-1', criterionId: 'c-price', value: crispCell(value) },
  ]);

function memoryStore() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe.each(STORAGE_KINDS)('project session (%s storage)', (kind) => {
  const setup = async () => {
    const test = await createTestStorage(kind);
    const recent = createRecentProjects(memoryStore());
    const repository = createTestRepository(test.storage, { recent });
    const session = await repository.create('s.mateo', { name: 'Session' });
    fillSample(session);
    await session.save();
    return { test, repository, session, recent };
  };

  it('tracks unsaved changes, including undo back to the saved state', async () => {
    const { session } = await setup();
    const listener = vi.fn();
    session.subscribe(listener);
    expect(session.isDirty).toBe(false);

    session.execute(edit(1));
    expect(session.isDirty).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    session.undo();
    expect(session.isDirty).toBe(false);
    session.redo();
    expect(session.isDirty).toBe(true);
    await session.save();
    expect(session.isDirty).toBe(false);
    // Undo after a save is a change again: the file now holds the edited value.
    session.undo();
    expect(session.isDirty).toBe(true);

    await session.save();
    session.setInfo({ name: 'Session' });
    session.setSetting('k', undefined);
    expect(session.isDirty).toBe(false);
    session.setInfo({ description: 'About' });
    expect(session.isDirty).toBe(true);
    await session.save();
    session.setSetting('k', { a: [1, 2] });
    expect(session.isDirty).toBe(true);
    await session.save();
    session.setSetting('k', { a: [1, 2] });
    expect(session.isDirty).toBe(false);
    session.setSetting('k', undefined);
    expect(session.isDirty).toBe(true);
    expect(() => session.setSetting('', 1)).toThrow(/Invalid setting key/);
    expect(() => session.setSetting('bad', Number.NaN)).toThrow(/non-finite/);
    await session.close();
  });

  it('keeps edits made during a save dirty and writes them with the next save', async () => {
    const test = await createTestStorage(kind);
    // A storage whose writes can be held back, to edit while a save is in flight.
    let hold: Promise<void> | undefined;
    const slow: typeof test.storage = {
      kind: test.storage.kind,
      async open(location, options) {
        const connection = await test.storage.open(location, options);
        return {
          select: (sql, params) => connection.select(sql, params),
          prepareForWriting: () => connection.prepareForWriting(),
          copyTo: (target) => connection.copyTo(target),
          close: () => connection.close(),
          async transaction(statements) {
            await hold;
            await connection.transaction(statements);
          },
        };
      },
    };
    const repository = createTestRepository(slow);
    const session = await repository.create('s.mateo', { name: 'Session' });
    fillSample(session);
    await session.save();

    let release!: () => void;
    hold = new Promise((resolve) => (release = resolve));
    session.execute(edit(1));
    const saving = session.save();
    await Promise.resolve();
    await Promise.resolve();
    session.execute(edit(2));
    hold = undefined;
    release();
    await saving;
    expect(session.isDirty).toBe(true);
    const check = await repository.open('s.mateo');
    expect(check.document.model.datasets[0]!.matrices[0]!.cells['a-1']!['c-price']).toEqual(
      crispCell(1),
    );
    await check.close();
    await session.save();
    expect(session.isDirty).toBe(false);
    await session.close();
    const final = await repository.open('s.mateo');
    expect(final.document.model.datasets[0]!.matrices[0]!.cells['a-1']!['c-price']).toEqual(
      crispCell(2),
    );
    await final.close();
  });

  it('updates the modification stamp only when something was written', async () => {
    const { session } = await setup();
    const stamp = session.document.info.updatedAt;
    await session.save();
    expect(session.document.info.updatedAt).toBe(stamp);
    session.execute(edit(5));
    await session.save();
    expect(session.document.info.updatedAt > stamp).toBe(true);
    expect(session.document.info.createdAt < stamp).toBe(true);
    await session.close();
  });

  it('refuses to save a model that could not be read back, and stays usable', async () => {
    const { session, repository } = await setup();
    session.execute(updateCriterion(DS, 'c-price', { scaleId: 'missing-scale' }));
    await expect(session.save()).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(session.isDirty).toBe(true);
    session.undo();
    session.execute(edit(9));
    await session.save();
    await session.close();
    const check = await repository.open('s.mateo');
    expect(check.document.model.datasets[0]!.criteria[0]!.scaleId).toBeNull();
    await check.close();
  });

  it('deduplicates snapshots by content and keeps them immutable', async () => {
    const { test, session } = await setup();
    const first = await session.createSnapshot(DS);
    const again = await session.createSnapshot(DS);
    expect(again).toEqual(first);
    expect(first.id).toMatch(/^[0-9a-f]{64}$/);
    expect(first.id).toBe(session.snapshotIdOf(DS));

    // Unsaved edits are part of a snapshot: it captures what the user sees.
    session.execute(edit(77));
    const edited = await session.createSnapshot(DS, { label: 'After edit' });
    expect(edited.id).not.toBe(first.id);
    expect(edited.label).toBe('After edit');
    expect(
      (await session.getSnapshot(edited.id)).content.dataset.matrices[0]!.cells['a-1']!['c-price'],
    ).toEqual(crispCell(77));
    expect((await session.getSnapshot(first.id)).content.dataset).toEqual(
      SAMPLE_DATASET_WITH_CELLS(session, first.id),
    );
    expect((await session.listSnapshots()).map((s) => s.id).sort()).toEqual(
      [first.id, edited.id].sort(),
    );
    expect(await session.listSnapshots('other')).toEqual([]);
    // Labelling an existing snapshot later is allowed.
    expect((await session.createSnapshot(DS, { label: 'Renamed' })).label).toBe('Renamed');

    await expect(session.createSnapshot('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(session.getSnapshot('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await session.save();
    await session.close();

    // The file itself refuses to change a snapshot or an analysis record.
    const connection = await test.storage.open('s.mateo', { create: false });
    await expect(
      connection.transaction([
        statement(`UPDATE snapshots SET content = '{}' WHERE id = ?`, [first.id]),
      ]),
    ).rejects.toThrow(/snapshots are immutable/);
    expect(await connection.select('SELECT count(*) AS n FROM snapshots')).toEqual([{ n: 2 }]);
    await connection.close();
  });

  it('detects a snapshot whose content was tampered with', async () => {
    const { test, session, repository } = await setup();
    const snapshot = await session.createSnapshot(DS);
    await session.close();
    const connection = await test.storage.open('s.mateo', { create: false });
    await connection.transaction([
      statement('DROP TRIGGER snapshots_immutable'),
      statement(`UPDATE snapshots SET content = replace(content, 'Alpha', 'Omega')`),
    ]);
    await connection.close();
    const reopened = await repository.open('s.mateo');
    await expect(reopened.getSnapshot(snapshot.id)).rejects.toMatchObject({ code: 'CORRUPT_FILE' });
    await reopened.close();
  });

  it('stores, lists, renames and deletes analyses', async () => {
    const { test, session } = await setup();
    const run = runToyMethod();
    const base = {
      datasetId: DS,
      record: run.record,
      methodInput: run.methodInput,
      numberType: 'crisp',
    };
    const first = await session.addAnalysis({ ...base, name: 'One' });
    const second = await session.addAnalysis({ ...base, variant: 'linear' });
    session.execute(edit(3));
    const third = await session.addAnalysis(base);
    expect(first.snapshotId).toBe(second.snapshotId);
    expect(third.snapshotId).not.toBe(first.snapshotId);
    expect(second).toMatchObject({ name: '', variant: 'linear', traceFormatVersion: 1 });
    expect((await session.listAnalyses()).map((a) => a.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);
    expect(await session.listAnalyses('other')).toEqual([]);
    expect(await session.listAnalyses(DS)).toHaveLength(3);

    await session.renameAnalysis(first.id, 'Renamed');
    expect((await session.getAnalysis(first.id)).name).toBe('Renamed');
    expect((await session.getAnalysis(second.id)).configuration).toEqual({});
    await expect(session.getAnalysis('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });

    // A snapshot goes away with its last analysis, unless it has a label.
    await session.deleteAnalysis(first.id);
    expect(await session.listSnapshots()).toHaveLength(2);
    await session.deleteAnalysis(second.id);
    expect((await session.listSnapshots()).map((s) => s.id)).toEqual([third.snapshotId]);
    await session.createSnapshot(DS, { label: 'Keep' });
    await session.deleteAnalysis(third.id);
    await session.deleteAnalysis(third.id);
    expect((await session.listSnapshots()).map((s) => s.label)).toEqual(['Keep']);
    expect(await session.listAnalyses()).toEqual([]);

    await expect(
      session.addAnalysis({
        ...base,
        record: { ...run.record, trace: { ...run.record.trace, formatVersion: 2 as 1 } },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      session.addAnalysis({ ...base, methodInput: { bad: Number.POSITIVE_INFINITY } }),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(await session.listAnalyses()).toEqual([]);

    // Analyses survive the deletion of their dataset; they carry their own snapshot.
    const kept = await session.addAnalysis(base);
    session.execute(removeDataset(DS));
    await session.save();
    expect((await session.getSnapshot(kept.snapshotId)).content.dataset.id).toBe(DS);
    await expect(session.addAnalysis(base)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await session.close();

    const connection = await test.storage.open('s.mateo', { create: false });
    await expect(
      connection.transaction([
        statement(`UPDATE analyses SET result = '{}' WHERE id = ?`, [kept.id]),
      ]),
    ).rejects.toThrow(/analysis records are immutable/);
    await expect(
      connection.transaction([statement('DELETE FROM snapshots WHERE id = ?', [kept.snapshotId])]),
    ).rejects.toThrow(/FOREIGN KEY/);
    await connection.close();
  });

  it('stores source files, import profiles and the import history', async () => {
    const { session, repository } = await setup();
    const empty = await session.addSourceFile({ name: 'empty.csv', content: new Uint8Array() });
    const big = await session.addSourceFile({
      name: 'büyük dosya.xlsx',
      mediaType: 'application/octet-stream',
      content: Uint8Array.from({ length: 70_000 }, (_, index) => (index * 31 + 7) % 256),
    });
    expect(empty).toMatchObject({
      byteSize: 0,
      mediaType: '',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });
    expect(await session.readSourceFile(empty.id)).toEqual(new Uint8Array());
    expect((await session.readSourceFile(big.id)).length).toBe(70_000);
    await expect(session.readSourceFile('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const profile = await session.saveImportProfile({
      name: 'TR Excel',
      formatVersion: 1,
      definition: { decimal: ',', header: 2 },
    });
    const updated = await session.saveImportProfile({
      id: profile.id,
      name: 'TR Excel v2',
      formatVersion: 2,
      definition: { decimal: ',' },
    });
    expect(updated.createdAt).toBe(profile.createdAt);
    expect(updated.updatedAt > profile.updatedAt).toBe(true);
    expect(await session.listImportProfiles()).toEqual([updated]);

    const record = await session.recordImport({
      datasetId: DS,
      sourceFileId: big.id,
      profileId: profile.id,
      details: { sheet: 'Sayfa1', locale: 'tr-TR' },
      issues: [{ severity: 'warning', code: 'import.empty-cell' }],
    });
    const bare = await session.recordImport({ datasetId: null, sourceFileId: null });
    expect(bare).toMatchObject({ profileId: null, details: {}, issues: [] });
    await session.close();

    const reopened = await repository.open('s.mateo');
    expect(await reopened.listImports()).toEqual([record, bare]);
    expect((await reopened.listSourceFiles()).map((f) => f.name)).toEqual([
      'empty.csv',
      'büyük dosya.xlsx',
    ]);
    // Deleting a file or a profile keeps the history entry, without the dangling link.
    await reopened.deleteSourceFile(big.id);
    await reopened.deleteImportProfile(profile.id);
    expect((await reopened.listImports())[0]).toMatchObject({
      id: record.id,
      sourceFileId: null,
      profileId: null,
      datasetId: DS,
    });
    expect(await reopened.listImportProfiles()).toEqual([]);
    await reopened.close();
  });

  it('saves a copy under a new location and continues there', async () => {
    const { test, session, repository, recent } = await setup();
    const run = runToyMethod();
    const analysis = await session.addAnalysis({
      datasetId: DS,
      record: run.record,
      methodInput: run.methodInput,
      numberType: 'crisp',
    });
    session.execute(edit(11));
    const listener = vi.fn();
    session.subscribe(listener);
    await session.saveAs('copy.mateo');
    expect(session.location).toBe('copy.mateo');
    expect(session.isDirty).toBe(false);
    expect(listener).toHaveBeenCalled();
    const originalBytes = await test.readFile('s.mateo');

    session.execute(edit(12));
    await session.save();
    await session.saveAs('copy.mateo');
    expect(await test.readFile('s.mateo')).toEqual(originalBytes);
    expect(recent.list().map((item) => item.location)).toEqual(['copy.mateo', 's.mateo']);

    // Copying onto an existing file replaces it on the desktop only if the app can delete.
    await session.saveAs('s.mateo');
    expect(session.location).toBe('s.mateo');
    await session.close();

    const copy = await repository.open('copy.mateo');
    expect(copy.document.info.id).toBe(session.document.info.id);
    expect(copy.document.model.datasets[0]!.matrices[0]!.cells['a-1']!['c-price']).toEqual(
      crispCell(12),
    );
    expect((await copy.getAnalysis(analysis.id)).record).toEqual(run.record);
    await copy.close();
    expect(test.fake?.openPools() ?? 0).toBe(0);
  });

  it('keeps the list of recent projects up to date', async () => {
    const { session, repository, recent } = await setup();
    expect(recent.list()).toMatchObject([{ location: 's.mateo', name: 'Session' }]);
    session.setInfo({ name: 'Renamed project' });
    await session.save();
    expect(recent.list()[0]!.name).toBe('Renamed project');
    await session.close();
    const other = await repository.create('other.mateo', { name: 'Other' });
    await other.close();
    await (await repository.open('s.mateo')).close();
    expect(recent.list().map((item) => item.name)).toEqual(['Renamed project', 'Other']);
    expect(repository.recent).toBe(recent);
  });

  it('runs file operations in call order', async () => {
    const { session } = await setup();
    const run = runToyMethod();
    session.execute(
      addDataset({ ...SAMPLE_DATASET, id: 'ds-2', criteria: [], alternatives: [], matrices: [] }),
    );
    const results = await Promise.all([
      session.save(),
      session.addAnalysis({
        datasetId: 'ds-2',
        record: run.record,
        methodInput: run.methodInput,
        numberType: 'crisp',
      }),
      session.listAnalyses(),
      session.createSnapshot(DS),
      session.listSnapshots(),
    ]);
    expect(results[2]).toHaveLength(1);
    expect(results[4]).toHaveLength(2);
    await session.close();
  });
});

function SAMPLE_DATASET_WITH_CELLS(
  session: { document: { model: { datasets: readonly { id: string }[] } } },
  _id: string,
): unknown {
  // The first snapshot was taken before the edit of (a-1, c-price): 0.1 + 0.2.
  const dataset = session.document.model.datasets[0] as typeof SAMPLE_DATASET;
  const matrix = dataset.matrices[0]!;
  return {
    ...dataset,
    matrices: [
      {
        ...matrix,
        cells: {
          ...matrix.cells,
          'a-1': { ...matrix.cells['a-1'], 'c-price': crispCell(0.1 + 0.2) },
        },
      },
    ],
  };
}
