import { deepFreeze } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import type { ProjectError } from '../errors';
import { PROJECT_MESSAGES } from '../messages';
import { crispCell, getCell, termCell, tfnCell } from '../model/cells';
import type { ProjectModel } from '../model/types';
import { EMPTY_MODEL } from '../model/types';
import { assertValidModel } from '../model/validate';
import { SAMPLE_CELLS, SAMPLE_DATASET, SAMPLE_SCALE } from '../testing/harness';
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
  renameMatrix,
  setCells,
  updateAlternative,
  updateCriterion,
  updateDataset,
  type ModelCommand,
} from './commands';

const DS = SAMPLE_DATASET.id;

/** Applies commands to a deeply frozen model, so any in-place mutation throws. */
function apply(model: ProjectModel, ...commands: ModelCommand[]): ProjectModel {
  return commands.reduce((state, command) => {
    const next = deepFreeze(command.apply(state));
    assertValidModel(next, 'INVALID_ARGUMENT');
    return next;
  }, deepFreeze(model));
}

const sample = (): ProjectModel =>
  apply(
    EMPTY_MODEL,
    putScale(SAMPLE_SCALE),
    addDataset(SAMPLE_DATASET),
    setCells(DS, 'm-decision', SAMPLE_CELLS),
  );

const matrixOf = (model: ProjectModel) => model.datasets[0]!.matrices[0]!;

describe('model commands', () => {
  it('has a translated label for every command', () => {
    const commands = [
      addDataset(SAMPLE_DATASET),
      updateDataset(DS, {}),
      removeDataset(DS),
      moveDataset(DS, 0),
      addCriterion(DS, SAMPLE_DATASET.criteria[0]!),
      updateCriterion(DS, 'c', {}),
      removeCriteria(DS, []),
      moveCriterion(DS, 'c', 0),
      addAlternative(DS, SAMPLE_DATASET.alternatives[0]!),
      updateAlternative(DS, 'a', {}),
      removeAlternatives(DS, []),
      moveAlternative(DS, 'a', 0),
      addMatrix(DS, SAMPLE_DATASET.matrices[0]!),
      renameMatrix(DS, 'm', 'x'),
      removeMatrix(DS, 'm'),
      setCells(DS, 'm', []),
      putScale(SAMPLE_SCALE),
      removeScale('s'),
    ];
    const labels = new Set(commands.map((command) => command.labelKey));
    expect(labels.size).toBe(commands.length);
    for (const label of labels) expect(PROJECT_MESSAGES.en).toHaveProperty([label]);
    const commandKeys = Object.keys(PROJECT_MESSAGES.en).filter((key) =>
      key.startsWith('project.command.'),
    );
    expect(commandKeys.sort()).toEqual([...labels].sort());
  });

  it('sets, replaces and clears cells without touching unchanged rows', () => {
    const before = sample();
    const after = apply(
      before,
      setCells(DS, 'm-decision', [
        { alternativeId: 'a-1', criterionId: 'c-price', value: crispCell(42) },
        { alternativeId: 'a-3', criterionId: 'c-quality', value: tfnCell(1, 2, 3) },
        { alternativeId: 'a-2', criterionId: 'c-service', value: null },
      ]),
    );
    expect(getCell(matrixOf(after), 'a-1', 'c-price')).toEqual(crispCell(42));
    expect(getCell(matrixOf(after), 'a-3', 'c-quality')).toEqual(tfnCell(1, 2, 3));
    expect(getCell(matrixOf(after), 'a-2', 'c-service')).toBeUndefined();
    expect(getCell(matrixOf(after), 'a-2', 'c-price')).toEqual(SAMPLE_CELLS[3]!.value);
    // The original is untouched and shares everything that did not change.
    expect(getCell(matrixOf(before), 'a-1', 'c-price')).toEqual(SAMPLE_CELLS[0]!.value);
    expect(after.scales).toBe(before.scales);
    expect(after.datasets[0]!.criteria).toBe(before.datasets[0]!.criteria);
  });

  it('applies edits in order and drops rows that become empty', () => {
    const model = apply(
      sample(),
      setCells(DS, 'm-decision', [
        { alternativeId: 'a-1', criterionId: 'c-price', value: null },
        { alternativeId: 'a-1', criterionId: 'c-quality', value: null },
        { alternativeId: 'a-1', criterionId: 'c-service', value: null },
        { alternativeId: 'a-2', criterionId: 'c-price', value: crispCell(1) },
        { alternativeId: 'a-2', criterionId: 'c-price', value: crispCell(2) },
        { alternativeId: 'a-2', criterionId: 'c-price', value: null },
        { alternativeId: 'a-2', criterionId: 'c-price', value: crispCell(3) },
      ]),
    );
    expect(Object.keys(matrixOf(model).cells).sort()).toEqual(['a-2', 'a-3']);
    expect(getCell(matrixOf(model), 'a-2', 'c-price')).toEqual(crispCell(3));
  });

  it('returns the same model when an edit changes nothing', () => {
    const model = sample();
    const same = [
      setCells(DS, 'm-decision', [
        { alternativeId: 'a-1', criterionId: 'c-service', value: termCell('H') },
      ]),
      setCells(DS, 'm-decision', [{ alternativeId: 'a-3', criterionId: 'c-quality', value: null }]),
      setCells(DS, 'm-decision', []),
      updateCriterion(DS, 'c-price', { name: 'Fiyat', direction: 'cost' }),
      updateAlternative(DS, 'a-1', { group: 'Local' }),
      updateDataset(DS, { name: SAMPLE_DATASET.name }),
      renameMatrix(DS, 'm-decision', 'Decision matrix'),
      moveCriterion(DS, 'c-price', 0),
      moveAlternative(DS, 'a-3', 99),
      moveDataset(DS, 0),
      removeCriteria(DS, ['nope']),
      removeAlternatives(DS, []),
      putScale(model.scales[0]!),
    ];
    for (const command of same) expect(command.apply(model)).toBe(model);
    // 0 and -0 are different values and are both kept.
    const zero = apply(
      model,
      setCells(DS, 'm-decision', [
        { alternativeId: 'a-3', criterionId: 'c-price', value: crispCell(0) },
      ]),
    );
    expect(zero).not.toBe(model);
  });

  it('removes the cells of removed criteria and alternatives', () => {
    const model = apply(
      sample(),
      removeCriteria(DS, ['c-quality']),
      removeAlternatives(DS, ['a-2']),
    );
    expect(model.datasets[0]!.criteria.map((c) => c.id)).toEqual(['c-price', 'c-service']);
    expect(model.datasets[0]!.alternatives.map((a) => a.id)).toEqual(['a-1', 'a-3']);
    expect(matrixOf(model).cells).toEqual({
      'a-1': { 'c-price': SAMPLE_CELLS[0]!.value, 'c-service': termCell('H') },
      'a-3': { 'c-price': crispCell(-0), 'c-service': tfnCell(-2.5, 0, 1e21) },
    });
    const emptied = apply(model, removeCriteria(DS, ['c-price', 'c-service']));
    expect(matrixOf(emptied).cells).toEqual({});
  });

  it('adds, updates, moves and removes criteria, alternatives, matrices and datasets', () => {
    const model = apply(
      sample(),
      addCriterion(DS, { ...SAMPLE_DATASET.criteria[0]!, id: 'c-new', code: 'C0' }, 0),
      addAlternative(DS, { ...SAMPLE_DATASET.alternatives[0]!, id: 'a-new', code: 'A4' }),
      updateCriterion(DS, 'c-new', {
        name: 'Teslim süresi',
        direction: 'benefit',
        scaleId: 'scale-5',
      }),
      updateAlternative(DS, 'a-new', { name: 'Delta', group: 'Abroad' }),
      moveCriterion(DS, 'c-new', 2),
      moveAlternative(DS, 'a-new', 0),
      addMatrix(DS, { id: 'm-2', name: 'Second', role: 'decision', cells: {} }),
      renameMatrix(DS, 'm-2', 'Expert 2'),
      updateDataset(DS, { description: 'Updated' }),
      addDataset({
        ...SAMPLE_DATASET,
        id: 'ds-2',
        name: 'Empty',
        criteria: [],
        alternatives: [],
        matrices: [],
      }),
      moveDataset('ds-2', 0),
    );
    expect(model.datasets.map((d) => d.id)).toEqual(['ds-2', DS]);
    const dataset = model.datasets[1]!;
    expect(dataset.description).toBe('Updated');
    expect(dataset.criteria.map((c) => c.id)).toEqual([
      'c-price',
      'c-quality',
      'c-new',
      'c-service',
    ]);
    expect(dataset.criteria[2]).toMatchObject({
      id: 'c-new',
      name: 'Teslim süresi',
      direction: 'benefit',
      scaleId: 'scale-5',
    });
    expect(dataset.alternatives.map((a) => a.id)).toEqual(['a-new', 'a-1', 'a-2', 'a-3']);
    expect(dataset.alternatives[0]).toMatchObject({ name: 'Delta', group: 'Abroad', code: 'A4' });
    expect(dataset.matrices.map((m) => m.name)).toEqual(['Decision matrix', 'Expert 2']);

    const less = apply(model, removeMatrix(DS, 'm-2'), removeDataset('ds-2'));
    expect(less.datasets.map((d) => d.id)).toEqual([DS]);
    expect(less.datasets[0]!.matrices).toHaveLength(1);
  });

  it('replaces a scale and clears references when a scale is removed', () => {
    const renamed = { ...SAMPLE_SCALE, name: { text: 'Benim ölçeğim' } };
    const model = apply(sample(), putScale(renamed));
    expect(model.scales).toEqual([renamed]);
    const without = apply(model, removeScale('scale-5'));
    expect(without.scales).toEqual([]);
    expect(without.datasets[0]!.criteria.map((c) => c.scaleId)).toEqual([null, null, null]);
    // Cells are kept: validation reports them, nothing is silently deleted.
    expect(getCell(matrixOf(without), 'a-1', 'c-service')).toEqual(termCell('H'));
    const unrelated = apply(
      apply(sample(), putScale({ ...SAMPLE_SCALE, id: 'unused' })),
      removeScale('unused'),
    );
    expect(unrelated.datasets[0]!.criteria[2]!.scaleId).toBe('scale-5');
  });

  it('rejects references to things that do not exist and duplicate ids', () => {
    const model = sample();
    const bad = [
      addDataset(SAMPLE_DATASET),
      removeDataset('nope'),
      moveDataset('nope', 0),
      updateDataset('nope', { name: 'x' }),
      addCriterion('nope', SAMPLE_DATASET.criteria[0]!),
      addCriterion(DS, SAMPLE_DATASET.criteria[0]!),
      updateCriterion(DS, 'nope', { name: 'x' }),
      moveCriterion(DS, 'nope', 0),
      addAlternative(DS, SAMPLE_DATASET.alternatives[0]!),
      updateAlternative(DS, 'nope', { name: 'x' }),
      moveAlternative(DS, 'nope', 0),
      addMatrix(DS, SAMPLE_DATASET.matrices[0]!),
      renameMatrix(DS, 'nope', 'x'),
      removeMatrix(DS, 'nope'),
      setCells(DS, 'nope', [{ alternativeId: 'a-1', criterionId: 'c-price', value: null }]),
      setCells(DS, 'm-decision', [{ alternativeId: 'nope', criterionId: 'c-price', value: null }]),
      setCells(DS, 'm-decision', [
        { alternativeId: 'a-1', criterionId: 'constructor', value: crispCell(1) },
      ]),
      removeScale('nope'),
    ];
    for (const command of bad) {
      expect(() => command.apply(model)).toThrow(
        expect.objectContaining({ code: 'INVALID_ARGUMENT' }) as ProjectError,
      );
    }
  });

  it('merges repeated edits of one cell or one field only', () => {
    const one = (value: number) =>
      setCells(DS, 'm', [{ alternativeId: 'a', criterionId: 'c', value: crispCell(value) }]);
    expect(one(1).mergeKey).toBe(one(2).mergeKey);
    expect(one(1).mergeKey).toBeDefined();
    expect(setCells(DS, 'm', [...SAMPLE_CELLS]).mergeKey).toBeUndefined();
    expect(updateCriterion(DS, 'c', { name: 'a' }).mergeKey).toBe(
      updateCriterion(DS, 'c', { name: 'ab' }).mergeKey,
    );
    expect(updateCriterion(DS, 'c', { name: 'a' }).mergeKey).not.toBe(
      updateCriterion(DS, 'c', { unit: 'a' }).mergeKey,
    );
    expect(addCriterion(DS, SAMPLE_DATASET.criteria[0]!).mergeKey).toBeUndefined();
  });
});

describe('assertValidModel', () => {
  const REMOVE = Symbol('remove');
  type Path = readonly (string | number)[];

  /** A deep copy of a small valid model with the value at `path` replaced or removed. */
  const broken = (path: Path, value: unknown): ProjectModel => {
    const matrix = {
      ...SAMPLE_DATASET.matrices[0]!,
      cells: { 'a-1': { 'c-price': crispCell(1) } },
    };
    const model = JSON.parse(
      JSON.stringify({
        datasets: [{ ...SAMPLE_DATASET, matrices: [matrix] }],
        scales: [SAMPLE_SCALE],
      }),
    ) as Record<string | number, unknown>;
    let target = model;
    for (const key of path.slice(0, -1)) target = target[key] as Record<string | number, unknown>;
    const last = path.at(-1)!;
    if (value === REMOVE) delete target[last];
    else target[last] = value;
    return model as unknown as ProjectModel;
  };

  it('accepts the sample model', () => {
    expect(() => assertValidModel(sample(), 'INVALID_ARGUMENT')).not.toThrow();
    expect(() =>
      assertValidModel(broken(['datasets', 0, 'name'], 'Other'), 'CORRUPT_FILE'),
    ).not.toThrow();
  });

  const cell: Path = ['datasets', 0, 'matrices', 0, 'cells', 'a-1', 'c-price'];
  const cases: [string, Path, unknown][] = [
    ['duplicate id', ['datasets', 0, 'alternatives', 1, 'id'], 'a-1'],
    ['id shared between kinds', ['datasets', 0, 'alternatives', 0, 'id'], 'c-price'],
    ['invalid id', ['datasets', 0, 'criteria', 0, 'id'], '__proto__'],
    ['unknown direction', ['datasets', 0, 'criteria', 0, 'direction'], 'max'],
    ['unknown number type', ['datasets', 0, 'criteria', 0, 'numberType'], 'trapezoidal'],
    ['missing scale', ['datasets', 0, 'criteria', 0, 'scaleId'], 'gone'],
    ['missing text', ['datasets', 0, 'criteria', 0, 'name'], 5],
    ['missing alternative text', ['datasets', 0, 'alternatives', 0, 'group'], REMOVE],
    ['missing dataset text', ['datasets', 0, 'createdAt'], REMOVE],
    ['unknown matrix role', ['datasets', 0, 'matrices', 0, 'role'], 'expert'],
    ['cell of unknown alternative', ['datasets', 0, 'matrices', 0, 'cells', 'a-9'], {}],
    [
      'cell of unknown criterion',
      ['datasets', 0, 'matrices', 0, 'cells', 'a-1', 'c-9'],
      crispCell(1),
    ],
    ['non-finite cell', cell, { kind: 'crisp', value: null }],
    ['malformed tfn', cell, { kind: 'tfn', value: { l: 1, m: 2 } }],
    ['bad term id', cell, { kind: 'term', termId: '' }],
    ['unknown cell kind', cell, { kind: 'interval' }],
    ['not a cell', cell, 5],
    ['duplicate term', ['scales', 0, 'terms', 1, 'id'], 'VL'],
    ['invalid term id', ['scales', 0, 'terms', 1, 'id'], 'a b'],
    ['bad term value', ['scales', 0, 'terms', 0, 'value'], [0, 0, 1]],
    ['bad term label', ['scales', 0, 'terms', 0, 'label'], { key: 'a', text: 'b' }],
    ['missing abbreviation', ['scales', 0, 'terms', 0, 'abbreviation'], REMOVE],
    ['bad scale name', ['scales', 0, 'name'], 'Scale'],
    ['bad scale source', ['scales', 0, 'sourceId'], 5],
    ['unknown scale number type', ['scales', 0, 'numberType'], 'crisp'],
    ['malformed structure', ['datasets'], {}],
  ];

  it.each(cases)('rejects a model with %s', (_, path, value) => {
    expect(() => assertValidModel(broken(path, value), 'CORRUPT_FILE')).toThrow(
      expect.objectContaining({ code: 'CORRUPT_FILE' }) as ProjectError,
    );
  });
});
