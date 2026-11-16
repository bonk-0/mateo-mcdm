import { describe, expect, it } from 'vitest';
import {
  addAlternative,
  addCriterion,
  addDataset,
  addMatrix,
  moveAlternative,
  moveCriterion,
  moveDataset,
  putScale,
  removeAlternatives,
  removeCriteria,
  removeDataset,
  removeMatrix,
  removeScale,
  setCells,
  updateCriterion,
  type ModelCommand,
} from '../history/commands';
import { crispCell, termCell, tfnCell } from '../model/cells';
import type { ProjectModel } from '../model/types';
import { EMPTY_MODEL } from '../model/types';
import {
  createTestRepository,
  createTestStorage,
  fillSample,
  SAMPLE_DATASET,
  SAMPLE_SCALE,
  STORAGE_KINDS,
} from '../testing/harness';
import { planModelSave, planSettingsSave } from './save';

const DS = SAMPLE_DATASET.id;

/** Deterministic pseudo-random numbers (mulberry32). */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random valid edit of the model, or `undefined` when the pick does not apply. */
function randomCommand(
  model: ProjectModel,
  next: () => number,
  serial: number,
): ModelCommand | undefined {
  const pick = <T>(list: readonly T[]): T | undefined => list[Math.floor(next() * list.length)];
  const dataset = pick(model.datasets);
  const kind = Math.floor(next() * 16);
  const position = Math.floor(next() * 4);
  if (kind === 0 || !dataset) {
    return addDataset(
      {
        id: `d${serial}`,
        name: `Dataset ${serial}`,
        description: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        criteria: [],
        alternatives: [],
        matrices: [],
      },
      position,
    );
  }
  const criterion = pick(dataset.criteria);
  const alternative = pick(dataset.alternatives);
  const matrix = pick(dataset.matrices);
  switch (kind) {
    case 1:
      return model.datasets.length > 1 ? removeDataset(dataset.id) : undefined;
    case 2:
      return moveDataset(dataset.id, position);
    case 3:
    case 4:
      return addCriterion(
        dataset.id,
        {
          id: `c${serial}`,
          code: `C${serial}`,
          name: `Criterion ${serial}`,
          description: '',
          unit: '',
          direction: next() < 0.5 ? 'benefit' : 'cost',
          numberType: next() < 0.5 ? 'crisp' : 'tfn',
          scaleId: next() < 0.3 ? (pick(model.scales)?.id ?? null) : null,
        },
        position,
      );
    case 5:
    case 6:
      return addAlternative(
        dataset.id,
        {
          id: `a${serial}`,
          code: `A${serial}`,
          name: `Alternative ${serial}`,
          description: '',
          group: '',
        },
        position,
      );
    case 7:
      return criterion && removeCriteria(dataset.id, [criterion.id]);
    case 8:
      return alternative && removeAlternatives(dataset.id, [alternative.id]);
    case 9:
      return (
        criterion &&
        (next() < 0.5
          ? moveCriterion(dataset.id, criterion.id, position)
          : updateCriterion(dataset.id, criterion.id, { name: `Renamed ${serial}`, scaleId: null }))
      );
    case 10:
      return alternative && moveAlternative(dataset.id, alternative.id, position);
    case 11:
      return next() < 0.7 || !matrix
        ? addMatrix(dataset.id, {
            id: `m${serial}`,
            name: `Matrix ${serial}`,
            role: 'decision',
            cells: {},
          })
        : removeMatrix(dataset.id, matrix.id);
    case 12:
      return next() < 0.6 || model.scales.length === 0
        ? putScale({
            ...SAMPLE_SCALE,
            id: `s${Math.floor(next() * 3)}`,
            name: { text: `Scale ${serial}` },
            terms: SAMPLE_SCALE.terms.slice(0, 1 + Math.floor(next() * 5)),
          })
        : removeScale(pick(model.scales)!.id);
    default: {
      if (!matrix || dataset.criteria.length === 0 || dataset.alternatives.length === 0)
        return undefined;
      const edits = Array.from({ length: 1 + Math.floor(next() * 6) }, () => {
        const r = next();
        return {
          alternativeId: pick(dataset.alternatives)!.id,
          criterionId: pick(dataset.criteria)!.id,
          value:
            r < 0.2
              ? null
              : r < 0.6
                ? crispCell(next() * 1e6 - 5e5)
                : r < 0.9
                  ? tfnCell(next(), next() * 2, next() * 3)
                  : termCell('H'),
        };
      });
      return setCells(dataset.id, matrix.id, edits);
    }
  }
}

describe.each(STORAGE_KINDS)('incremental save (%s storage)', (kind) => {
  it('stores exactly the model after any sequence of edits, saves, undos and redos', async () => {
    const test = await createTestStorage(kind);
    const repository = createTestRepository(test.storage);
    for (const seed of [1, 2, 3]) {
      const next = random(seed);
      const location = `random-${seed}.mateo`;
      let session = await repository.create(location, { name: `Random ${seed}` });
      for (let step = 0; step < 160; step += 1) {
        const roll = next();
        if (roll < 0.08) session.undo();
        else if (roll < 0.12) session.redo();
        else {
          const command = randomCommand(session.document.model, next, step);
          if (command) session.execute(command);
        }
        if (next() < 0.15) {
          await session.save();
          expect(session.isDirty).toBe(false);
          // What is in the file is what is in memory, checked by reading the file afresh.
          const check = await repository.open(location);
          expect(check.document.model).toEqual(session.document.model);
          await check.close();
        }
        if (next() < 0.04) {
          // Closing without saving loses the unsaved edits, nothing else.
          await session.save();
          const model = session.document.model;
          await session.close();
          session = await repository.open(location);
          expect(session.document.model).toEqual(model);
        }
      }
      await session.save();
      const model = session.document.model;
      await session.close();
      const final = await repository.open(location);
      expect(final.document.model).toEqual(model);
      await final.close();
      const connection = await test.storage.open(location, { create: false });
      expect(await connection.select('PRAGMA foreign_key_check')).toEqual([]);
      expect(await connection.select('PRAGMA integrity_check')).toEqual([
        { integrity_check: 'ok' },
      ]);
      await connection.close();
    }
  });
});

describe('save plans', () => {
  const sample = async () => {
    const test = await createTestStorage('wasm');
    const session = await createTestRepository(test.storage).create('p.mateo', { name: 'P' });
    fillSample(session);
    return session;
  };

  it('plans nothing when nothing changed', async () => {
    const session = await sample();
    const model = session.document.model;
    expect(planModelSave(model, model)).toEqual([]);
    expect(planSettingsSave(session.document.settings, session.document.settings)).toEqual([]);
  });

  it('writes only the edited row for a single cell edit', async () => {
    const session = await sample();
    const before = session.document.model;
    session.execute(
      setCells(DS, 'm-decision', [
        { alternativeId: 'a-2', criterionId: 'c-price', value: crispCell(7) },
      ]),
    );
    const plan = planModelSave(before, session.document.model);
    // The dataset list (tiny), the matrix list (tiny), then one row deleted and rewritten.
    expect(plan.map((item) => item.sql.split(' ').slice(0, 3).join(' '))).toEqual([
      'INSERT INTO datasets',
      'INSERT INTO matrices',
      'DELETE FROM cells',
      'INSERT INTO cells',
    ]);
    expect(plan[2]!.params).toEqual(['m-decision', '["a-2"]']);
    const rows = JSON.parse(plan[3]!.params[0] as string) as string[][];
    expect(rows.map((row) => row.slice(0, 3).join('/'))).toEqual([
      'm-decision/a-2/c-price',
      'm-decision/a-2/c-quality',
      'm-decision/a-2/c-service',
    ]);
    expect(rows[0]).toEqual(['m-decision', 'a-2', 'c-price', 'crisp', '7']);
  });

  it('plans a full write from an empty model', async () => {
    const session = await sample();
    const plan = planModelSave(EMPTY_MODEL, session.document.model);
    expect(plan.map((item) => item.sql.split(' ')[2])).toEqual([
      'scales',
      'scale_terms',
      'scale_terms',
      'datasets',
      'criteria',
      'alternatives',
      'matrices',
      'cells',
      'cells',
    ]);
    // Removing everything again is a handful of deletes; foreign keys cascade.
    expect(
      planModelSave(session.document.model, EMPTY_MODEL).map((item) => item.sql.split(' ')[2]),
    ).toEqual(['scales', 'datasets', 'matrices', 'criteria', 'alternatives']);
  });

  it('plans settings changes key by key', () => {
    const plan = planSettingsSave({ a: 1, b: [1], c: 'x' }, { a: 1, b: [2], d: null });
    expect(plan.map((item) => item.params)).toEqual([['["c"]'], ['[["b","[2]"],["d","null"]]']]);
  });
});
