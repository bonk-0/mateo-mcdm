import { canonicalJson, verifyTrace } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { ProjectError } from '../errors';
import { getCell } from '../model/cells';
import {
  createTestRepository,
  createTestStorage,
  fillSample,
  runToyMethod,
  SAMPLE_CELLS,
  SAMPLE_DATASET,
  SAMPLE_SCALE,
  STORAGE_KINDS,
} from '../testing/harness';

describe.each(STORAGE_KINDS)('project round trip (%s storage)', (kind) => {
  it('saves and reopens crisp and TFN data and an analysis unchanged', async () => {
    const test = await createTestStorage(kind);
    const repository = createTestRepository(test.storage);

    const created = await repository.create('suppliers.mateo', {
      name: 'Tedarikçi projesi',
      description: 'Round trip',
    });
    fillSample(created);
    created.setSetting('editor.precision', 4);
    created.setSetting('workspace.marcos', { weights: [0.1, 0.2, 0.7], note: null });
    expect(created.isDirty).toBe(true);
    await created.save();
    expect(created.isDirty).toBe(false);

    const run = runToyMethod();
    const stored = await created.addAnalysis({
      name: 'First run',
      datasetId: SAMPLE_DATASET.id,
      record: run.record,
      methodInput: run.methodInput,
      numberType: 'crisp',
      configuration: { matrixId: 'm-decision', weightSource: { kind: 'manual' } },
    });
    const source = await created.addSourceFile({
      name: 'tedarikçiler.xlsx',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: Uint8Array.from({ length: 1000 }, (_, index) => (index * 7) % 256),
    });
    const before = created.document;
    await created.close();

    const reopened = await repository.open('suppliers.mateo');
    // Deep-equal data, with strict number identity: -0 stays -0, no digit is lost.
    expect(canonicalJson(reopened.document)).toBe(canonicalJson(before));
    expect(reopened.document).toEqual(before);
    expect(reopened.isDirty).toBe(false);

    const matrix = reopened.document.model.datasets[0]!.matrices[0]!;
    for (const cell of SAMPLE_CELLS) {
      expect(getCell(matrix, cell.alternativeId, cell.criterionId)).toEqual(cell.value);
    }
    expect(Object.is((getCell(matrix, 'a-3', 'c-price') as { value: number }).value, -0)).toBe(
      true,
    );
    expect(getCell(matrix, 'a-3', 'c-quality')).toBeUndefined();
    expect(reopened.document.model.scales).toEqual([SAMPLE_SCALE]);
    expect(reopened.document.settings).toEqual({
      'editor.precision': 4,
      'workspace.marcos': { weights: [0.1, 0.2, 0.7], note: null },
    });

    // The analysis: identical record, input and trace, and the trace still verifies.
    expect(await reopened.listAnalyses()).toEqual([stored]);
    const analysis = await reopened.getAnalysis(stored.id);
    expect(canonicalJson(analysis.record)).toBe(canonicalJson(run.record));
    expect(canonicalJson(analysis.methodInput)).toBe(canonicalJson(run.methodInput));
    expect(analysis).toMatchObject({
      name: 'First run',
      methodId: 'toy-weighted-sum',
      methodVersion: '1.2.3',
      numberType: 'crisp',
      variant: null,
      appVersion: '0.1.0-test',
      configuration: { matrixId: 'm-decision', weightSource: { kind: 'manual' } },
    });
    expect(analysis.record.warnings).toHaveLength(1);
    expect(verifyTrace(analysis.record.trace, { requireKnownOperations: true })).toEqual([]);

    // The analysis points at an immutable snapshot of the model it was run on.
    const snapshot = await reopened.getSnapshot(analysis.snapshotId);
    expect(snapshot.content.dataset).toEqual(before.model.datasets[0]);
    expect(snapshot.content.scales).toEqual([SAMPLE_SCALE]);
    expect(reopened.snapshotIdOf(SAMPLE_DATASET.id)).toBe(analysis.snapshotId);

    // The original file, byte for byte.
    expect(await reopened.listSourceFiles()).toEqual([source]);
    expect(await reopened.readSourceFile(source.id)).toEqual(
      Uint8Array.from({ length: 1000 }, (_, index) => (index * 7) % 256),
    );
    await reopened.close();
  });

  it('reports a missing file and refuses to create over an existing one', async () => {
    const test = await createTestStorage(kind);
    const repository = createTestRepository(test.storage);
    await expect(repository.open('missing.mateo')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await test.readFile('missing.mateo')).toBeNull();

    await (await repository.create('a.mateo', { name: 'A' })).close();
    const bytes = await test.readFile('a.mateo');
    await expect(repository.create('a.mateo', { name: 'B' })).rejects.toMatchObject({
      code: 'LOCATION_NOT_EMPTY',
    });
    expect(await test.readFile('a.mateo')).toEqual(bytes);
  });

  it('rejects files that are not Mateo projects without touching them', async () => {
    const test = await createTestStorage(kind);
    const repository = createTestRepository(test.storage);
    const junk = Uint8Array.from(
      'This is definitely not an SQLite database file. '.repeat(40),
      (c) => c.charCodeAt(0),
    );
    await test.writeFile('junk.mateo', junk);
    await expect(repository.open('junk.mateo')).rejects.toMatchObject({
      code: 'NOT_A_PROJECT_FILE',
    });
    expect(await test.readFile('junk.mateo')).toEqual(junk);
    await expect(repository.create('junk.mateo', { name: 'X' })).rejects.toMatchObject({
      code: 'LOCATION_NOT_EMPTY',
    });
    expect(await test.readFile('junk.mateo')).toEqual(junk);
    expect(test.fake?.openPools() ?? 0).toBe(0);
  });

  it('writes one portable file that the other storage can open', async () => {
    const test = await createTestStorage(kind);
    const session = await createTestRepository(test.storage).create('p.mateo', {
      name: 'Portable',
    });
    fillSample(session);
    await session.save();
    const document = session.document;
    await session.close();
    const bytes = (await test.readFile('p.mateo'))!;
    // An SQLite file using the rollback journal: no -wal side file is needed to read it.
    expect(String.fromCharCode(...bytes.subarray(0, 15))).toBe('SQLite format 3');
    expect([bytes[18], bytes[19]]).toEqual([1, 1]);
    expect(test.fake?.journalModes.get('p.mateo') ?? 'delete').toBe('delete');

    const other = await createTestStorage(kind === 'wasm' ? 'tauri' : 'wasm');
    await other.writeFile('copy.mateo', bytes);
    const opened = await createTestRepository(other.storage).open('copy.mateo');
    expect(opened.document).toEqual(document);
    await opened.close();
  });

  it('fails with PROJECT_CLOSED after close', async () => {
    const test = await createTestStorage(kind);
    const session = await createTestRepository(test.storage).create('c.mateo', { name: 'C' });
    await session.close();
    await session.close();
    expect(session.isClosed).toBe(true);
    await expect(session.save()).rejects.toBeInstanceOf(ProjectError);
    await expect(session.listAnalyses()).rejects.toMatchObject({ code: 'PROJECT_CLOSED' });
    expect(() => session.setInfo({ name: 'D' })).toThrow(ProjectError);
    expect(test.fake?.openPools() ?? 0).toBe(0);
  });
});
