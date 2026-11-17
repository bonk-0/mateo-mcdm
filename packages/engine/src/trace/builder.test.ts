import { describe, expect, it } from 'vitest';
import { sampleMatrix, sampleWeights } from '../__fixtures__/sample';
import { EngineError } from '../errors';
import { crispWeights } from '../model/weights';
import type { StepMeta } from './builder';
import { alternativeAxis, createTraceBuilder, criterionAxis } from './builder';
import { crisp } from './crisp-ops';
import { constant, empty, parameter, term } from './tracked';
import type { TraceAxisItem, TraceValue } from './types';

const meta = (id: string): StepMeta => ({
  id,
  nameKey: `steps.${id}.name`,
  explanationKey: `steps.${id}.explanation`,
});

const builder = () => createTraceBuilder({ methodId: 'test', methodVersion: '1.0.0' });

const errorCode = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return error instanceof EngineError ? error.code : `other: ${String(error)}`;
  }
  return undefined;
};

const items = (...ids: string[]): TraceAxisItem[] => ids.map((id) => ({ id, label: { text: id } }));

describe('TraceBuilder input steps', () => {
  it('echoes a decision matrix with input derivations', () => {
    const tb = builder();
    const x = tb.inputMatrix({ ...meta('initial'), matrix: sampleMatrix() });
    const trace = tb.build();

    expect(trace).toMatchObject({
      methodId: 'test',
      methodVersion: '1.0.0',
    });
    const step = trace.steps[0];
    expect(step).toMatchObject({
      id: 'initial',
      index: 0,
      role: 'input',
      nameKey: 'steps.initial.name',
      explanationKey: 'steps.initial.explanation',
      formulas: [],
      sources: [{ kind: 'input', input: 'matrix' }],
      visualization: { view: 'matrix' },
    });
    expect(step?.output.shape).toBe('matrix');
    expect(step?.output.rows).toEqual(alternativeAxis(sampleMatrix().alternatives));
    expect(step?.output.columns).toEqual(criterionAxis(sampleMatrix().criteria));
    expect(step?.output.cells[1]?.[0]).toEqual({
      value: 20,
      derivation: {
        kind: 'input',
        source: { input: 'matrix', row: 'a2', column: 'c1' },
        value: 20,
      },
    });
    expect(x.values()).toEqual(sampleMatrix().values);
  });

  it('keeps a one-row decision matrix a matrix', () => {
    const matrix = sampleMatrix();
    const tb = builder();
    const x = tb.inputMatrix({
      ...meta('initial'),
      input: 'data',
      matrix: { ...matrix, alternatives: [matrix.alternatives[0]!], values: [[10, 4]] },
    });
    expect(x.shape).toBe('matrix');
    expect(tb.build().steps[0]?.sources).toEqual([{ kind: 'input', input: 'data' }]);
  });

  it('echoes weights as a row vector in criterion order', () => {
    const tb = builder();
    const w = tb.inputWeights({
      ...meta('weights'),
      weights: crispWeights(['c2', 'c1'], [0.4, 0.6]),
      criteria: sampleMatrix().criteria,
    });
    expect(w.shape).toBe('row-vector');
    expect(w.rows).toEqual([{ id: 'w', label: { key: 'trace.axis.weight' }, kind: 'quantity' }]);
    expect(w.at(0).value).toBe(0.6);
    expect(w.at('c2').value).toBe(0.4);
    expect(w.at('c2').node).toEqual({
      kind: 'ref',
      ref: { step: 'weights', row: 'w', column: 'c2' },
      value: 0.4,
    });
  });

  it('refuses a weight vector that does not cover the criteria', () => {
    const tb = builder();
    expect(
      errorCode(() =>
        tb.inputWeights({
          ...meta('weights'),
          weights: crispWeights(['c1'], [1]),
          criteria: sampleMatrix().criteria,
          row: { id: 'weights', label: { text: 'w' } },
        }),
      ),
    ).toBe('INVALID_TRACE');
  });

  it('infers the shape of generic input and accepts other number types', () => {
    const tb = builder();
    type Pair = readonly [number, number];
    const encode = ([a, b]: Pair): TraceValue => ({ type: 'pair', components: { a, b } });
    const pairs = tb.input<Pair>({
      ...meta('pairs'),
      input: 'pairs',
      rows: items('r1', 'r2'),
      columns: items('only'),
      values: [[[1, 2]], [[3, 4]]],
      encode,
    });
    expect(pairs.shape).toBe('column-vector');
    expect(pairs.at(1).value).toEqual([3, 4]);
    expect(pairs.at(1).node.value).toEqual({ type: 'pair', components: { a: 3, b: 4 } });

    expect(
      tb.input({ ...meta('one'), input: 'k', rows: items('r'), columns: items('c'), values: [[7]] })
        .shape,
    ).toBe('scalar');
    expect(
      tb.input({
        ...meta('row'),
        input: 'k',
        rows: items('r'),
        columns: items('a', 'b'),
        values: [[7, 8]],
      }).shape,
    ).toBe('row-vector');
    expect(
      tb.input({
        ...meta('grid'),
        input: 'k',
        rows: items('r', 's'),
        columns: items('a', 'b'),
        values: [
          [7, 8],
          [9, 1],
        ],
      }).shape,
    ).toBe('matrix');
  });

  it('rejects ragged input and non-finite input values', () => {
    expect(
      errorCode(() =>
        builder().input({
          ...meta('x'),
          input: 'k',
          rows: items('r', 's'),
          columns: items('a'),
          values: [[1]],
        }),
      ),
    ).toBe('INVALID_TRACE');
    expect(
      errorCode(() =>
        builder().input({
          ...meta('x'),
          input: 'k',
          rows: items('r'),
          columns: items('a', 'b'),
          values: [[1]],
        }),
      ),
    ).toBe('INVALID_TRACE');
    expect(
      errorCode(() =>
        builder().input({
          ...meta('x'),
          input: 'k',
          rows: items('r'),
          columns: items('a'),
          values: [[Number.NaN]],
        }),
      ),
    ).toBe('NON_FINITE_VALUE');
  });
});

describe('TraceBuilder calculation steps', () => {
  const setup = () => {
    const tb = builder();
    const x = tb.inputMatrix({ ...meta('initial'), matrix: sampleMatrix() });
    return { tb, x };
  };

  it('records a table whose cells reference their operands', () => {
    const { tb, x } = setup();
    const columnMax = [0, 1].map((j) => crisp.max(x.column(j)));
    const n = tb.table({
      ...meta('normalized'),
      rows: x.rows,
      columns: x.columns,
      cell: (row, column) => crisp.divide(x.cell(row.id, column.id), columnMax[column.index]!),
    });
    expect(n.values()).toEqual([
      [0.5, 0.5],
      [1, 0.25],
      [0.25, 1],
    ]);
    const step = tb.build().steps[1];
    expect(step?.role).toBe('intermediate');
    expect(step?.sources).toEqual([{ kind: 'step', step: 'initial' }]);
    expect(step?.output.cells[0]?.[1]).toEqual({
      value: 0.5,
      derivation: {
        kind: 'operation',
        operation: 'divide',
        operands: [
          { kind: 'ref', ref: { step: 'initial', row: 'a1', column: 'c2' }, value: 4 },
          {
            kind: 'operation',
            operation: 'max',
            operands: [{ kind: 'range', ref: { step: 'initial', rows: 'all', columns: ['c2'] } }],
            value: 8,
          },
        ],
        value: 0.5,
      },
    });
  });

  it('records vectors, scalars, parameters and carried-over values', () => {
    const { tb, x } = setup();
    const rowSums = tb.columnVector({
      ...meta('row-sums'),
      items: x.rows,
      cell: (item) => crisp.sum(x.row(item.index)),
    });
    expect(rowSums.shape).toBe('column-vector');
    expect(rowSums.columns).toEqual([
      { id: 'row-sums', label: { key: 'steps.row-sums.name' }, kind: 'quantity' },
    ]);
    expect(rowSums.values()).toEqual([[14], [22], [13]]);

    const columnMeans = tb.rowVector({
      ...meta('column-means'),
      items: x.columns,
      row: { id: 'mean', label: { text: 'Mean' } },
      cell: (item) => crisp.mean(x.column(item.id)),
    });
    expect(columnMeans.shape).toBe('row-vector');
    expect(columnMeans.at('c2').value).toBeCloseTo(14 / 3, 12);

    const total = tb.scalar({
      ...meta('total'),
      role: 'result',
      visualization: { view: 'value', basedOn: 'row-sums' },
      value: crisp.multiply(crisp.sum(rowSums.all()), parameter('scale', 2)),
    });
    expect(total.shape).toBe('scalar');
    expect(total.at().value).toBe(98);

    const copy = tb.columnVector({
      ...meta('copy'),
      items: rowSums.rows,
      column: { id: 'copied', label: { text: 'Copied' } },
      cell: (item) => rowSums.at(item.id),
    });
    expect(copy.at(0).value).toBe(14);

    const steps = tb.build().steps;
    expect(steps.map((step) => [step.id, step.index, step.role, step.visualization.view])).toEqual([
      ['initial', 0, 'input', 'matrix'],
      ['row-sums', 1, 'intermediate', 'bars'],
      ['column-means', 2, 'intermediate', 'bars'],
      ['total', 3, 'result', 'value'],
      ['copy', 4, 'intermediate', 'bars'],
    ]);
    expect(steps[3]?.sources).toEqual([
      { kind: 'step', step: 'row-sums' },
      { kind: 'parameter', name: 'scale' },
    ]);
    // A carried-over value is a bare reference to the cell it came from.
    expect(steps[4]?.output.cells[0]?.[0]?.derivation).toEqual({
      kind: 'ref',
      ref: { step: 'row-sums', row: 'a1', column: 'row-sums' },
      value: 14,
    });
  });

  it('addresses cells by position or id and selects ranges', () => {
    const { x } = setup();
    expect(x.cell(2, 'c2').value).toBe(8);
    expect(x.cell('a3', 1).value).toBe(8);
    expect(x.row('a2').items.map((item) => item.value)).toEqual([20, 2]);
    expect(x.column(0).node.ref).toEqual({ step: 'initial', rows: 'all', columns: ['c1'] });
    expect(x.all().items).toHaveLength(6);
    expect(x.all().node.ref).toEqual({ step: 'initial', rows: 'all', columns: 'all' });
    const block = x.range({ rows: ['a1', 2], columns: [1] });
    expect(block.items.map((item) => item.value)).toEqual([4, 8]);
    expect(block.node.ref).toEqual({ step: 'initial', rows: ['a1', 'a3'], columns: ['c2'] });
    expect(x.range({}).items).toHaveLength(6);
    expect(term(x.column(0), 'x').node.term).toBe('x');
    expect(term(x.column(0), 'x').items).toHaveLength(3);
  });

  it('rejects unknown rows, columns and misuse of at()', () => {
    const { x } = setup();
    expect(errorCode(() => x.cell(3, 0))).toBe('UNKNOWN_REFERENCE');
    expect(errorCode(() => x.cell('zz', 0))).toBe('UNKNOWN_REFERENCE');
    expect(errorCode(() => x.cell(0, 1.5))).toBe('UNKNOWN_REFERENCE');
    expect(errorCode(() => x.column('zz'))).toBe('UNKNOWN_REFERENCE');
    expect(errorCode(() => x.at(0))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => x.at())).toBe('INVALID_ARGUMENT');
  });

  it('returns copies of the raw values', () => {
    const { x } = setup();
    x.values()[0]![0] = 999;
    expect(x.cell(0, 0).value).toBe(10);
  });

  it('attaches formulas to cells and checks their terms', () => {
    const { tb, x } = setup();
    const formulas = [
      {
        id: 'double',
        template: '{{y}} = 2 {{x}}',
        terms: [
          { name: 'y', latex: 'y' },
          { name: 'x', latex: 'x' },
        ],
      },
    ];
    tb.table({
      ...meta('doubled'),
      formulas,
      explanationParams: { factor: 2 },
      rows: x.rows,
      columns: x.columns,
      cell: (row, column) => ({
        tracked: crisp.multiply(2, term(x.cell(row.index, column.index), 'x')),
        formula: 'double',
      }),
    });
    const step = tb.build().steps[1];
    expect(step?.formulas).toEqual(formulas);
    expect(step?.explanationParams).toEqual({ factor: 2 });
    expect(step?.output.cells[0]?.[0]?.formula).toBe('double');

    const bad = (
      cell: () =>
        ReturnType<typeof constant> | { tracked: ReturnType<typeof constant>; formula: string },
    ) => errorCode(() => tb.scalar({ ...meta('bad'), formulas, value: cell() }));
    expect(bad(() => ({ tracked: constant(1), formula: 'missing' }))).toBe('INVALID_TRACE');
    expect(bad(() => term(constant(1), 'typo'))).toBe('INVALID_TRACE');
    // Without formulas, terms are free-form.
    expect(
      errorCode(() => tb.scalar({ ...meta('free'), value: term(constant(1), 'anything') })),
    ).toBeUndefined();
  });

  it('rejects malformed formula definitions', () => {
    const { tb } = setup();
    const f = { id: 'f', template: '{{a}}', terms: [{ name: 'a', latex: 'a' }] };
    expect(
      errorCode(() => tb.scalar({ ...meta('s1'), formulas: [f, f], value: constant(1) })),
    ).toBe('INVALID_TRACE');
    expect(
      errorCode(() =>
        tb.scalar({
          ...meta('s2'),
          formulas: [{ id: 'g', template: '{{b}}', terms: [] }],
          value: constant(1),
        }),
      ),
    ).toBe('INVALID_TRACE');
  });

  it('allows intentionally empty cells', () => {
    const { tb, x } = setup();
    const s = tb.columnVector<number | null>({
      ...meta('gaps'),
      items: x.rows,
      cell: (item) => (item.index === 0 ? empty('first-row') : x.cell(item.index, 0)),
    });
    expect(s.values()).toEqual([[null], [20], [5]]);
    expect(tb.build().steps[1]?.output.cells[0]?.[0]).toEqual({
      value: null,
      derivation: { kind: 'empty', value: null, reasonKey: 'first-row' },
    });
  });

  it('rejects duplicate and empty ids and empty outputs', () => {
    const { tb, x } = setup();
    expect(errorCode(() => tb.scalar({ ...meta('initial'), value: constant(1) }))).toBe(
      'DUPLICATE_ID',
    );
    expect(errorCode(() => tb.scalar({ ...meta(''), value: constant(1) }))).toBe('INVALID_TRACE');
    expect(
      errorCode(() => tb.columnVector({ ...meta('none'), items: [], cell: () => constant(1) })),
    ).toBe('INVALID_TRACE');
    expect(
      errorCode(() =>
        tb.table({
          ...meta('dup-rows'),
          rows: items('a', 'a'),
          columns: x.columns,
          cell: () => constant(1),
        }),
      ),
    ).toBe('DUPLICATE_ID');
    expect(
      errorCode(() =>
        tb.table({
          ...meta('dup-cols'),
          rows: x.rows,
          columns: items('a', 'a'),
          cell: () => constant(1),
        }),
      ),
    ).toBe('DUPLICATE_ID');
    // A failed step leaves no trace behind.
    expect(tb.build().steps.map((step) => step.id)).toEqual(['initial']);
  });

  it('rejects operands of a step this trace has not recorded', () => {
    const other = builder();
    const foreign = other.inputMatrix({ ...meta('foreign'), matrix: sampleMatrix() });
    const { tb } = setup();
    expect(errorCode(() => tb.scalar({ ...meta('s'), value: foreign.cell(0, 0) }))).toBe(
      'UNKNOWN_REFERENCE',
    );
    expect(errorCode(() => tb.scalar({ ...meta('t'), value: crisp.sum(foreign.all()) }))).toBe(
      'UNKNOWN_REFERENCE',
    );
  });

  it('rejects cells that are not tracked values', () => {
    const { tb } = setup();
    expect(errorCode(() => tb.scalar({ ...meta('raw'), value: 5 as never }))).toBe('INVALID_TRACE');
  });

  it('locates a non-finite result at its step and cell', () => {
    const { tb, x } = setup();
    try {
      tb.table({
        ...meta('broken'),
        rows: x.rows,
        columns: x.columns,
        cell: (row, column) =>
          crisp.divide(x.cell(row.index, column.index), row.index === 1 ? 0 : 1),
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).code).toBe('NON_FINITE_VALUE');
      expect((error as EngineError).details).toMatchObject({
        step: 'broken',
        row: 'a2',
        column: 'c1',
      });
    }
    expect(() =>
      tb.scalar({
        ...meta('other'),
        get value(): never {
          throw new TypeError('x');
        },
      }),
    ).toThrow(TypeError);
  });

  it('build() returns a snapshot', () => {
    const { tb } = setup();
    const before = tb.build();
    tb.scalar({ ...meta('later'), value: constant(1) });
    expect(before.steps).toHaveLength(1);
    expect(tb.build().steps).toHaveLength(2);
  });

  it('uses the weights fixture', () => {
    const { tb } = setup();
    const w = tb.inputWeights({
      ...meta('weights'),
      weights: sampleWeights(),
      criteria: sampleMatrix().criteria,
    });
    expect(w.values()).toEqual([[0.6, 0.4]]);
  });
});
