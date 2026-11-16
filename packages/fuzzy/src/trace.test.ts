import type { DecisionMatrix, OperationNode, Trace, TraceValue } from '@mateo/engine';
import {
  EngineError,
  constant,
  createTraceBuilder,
  crisp,
  getStep,
  term,
  verifyTrace,
} from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import type { TFN } from './index';
import {
  IMF_SWARA_SCALE,
  TFN_EVALUATORS,
  TFN_OPERATIONS,
  decodeTfn,
  encodeTfn,
  fromCrisp,
  isTfnTraceValue,
  termToTfn,
  tfn,
  tfnOps,
} from './index';

const AUDIT = { operations: TFN_EVALUATORS, requireKnownOperations: true } as const;

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof EngineError ? error.code : 'other';
  }
  return undefined;
}

const triple = (l: number, m: number, u: number): TraceValue => ({
  type: 'tfn',
  components: { l, m, u },
});

function sampleMatrix(): DecisionMatrix<TFN> {
  return {
    alternatives: [
      { id: 'a1', name: { text: 'Alpha' } },
      { id: 'a2', name: { text: 'Beta' } },
    ],
    criteria: [
      { id: 'c1', name: { text: 'Quality' }, direction: 'benefit', numberType: 'tfn' },
      { id: 'c2', name: { text: 'Comfort' }, direction: 'benefit', numberType: 'tfn' },
    ],
    values: [
      [tfn(1, 2, 4), tfn(2, 4, 4)],
      [tfn(2, 4, 8), tfn(1, 1, 2)],
    ],
  };
}

/** Input → ideal → normalised by the ideal's upper value → row sums → graded mean. */
function sampleTrace(): Trace {
  const tb = createTraceBuilder({ methodId: 'tfn-sample', methodVersion: '1.0.0' });
  const meta = (id: string) => ({ id, nameKey: `sample.${id}`, explanationKey: `sample.${id}.x` });
  const x = tb.inputMatrix({ ...meta('initial'), matrix: sampleMatrix(), encode: encodeTfn });
  const ideal = tb.rowVector<TFN>({
    ...meta('ideal'),
    items: x.columns,
    cell: (column) => tfnOps.max(x.column(column.index)),
  });
  const normalized = tb.table<TFN>({
    ...meta('normalized'),
    formulas: [
      {
        id: 'benefit',
        template: String.raw`{{n}} = {{x}} / {{x_id}}`,
        terms: [
          { name: 'n', latex: String.raw`\tilde{n}_{ij}` },
          { name: 'x', latex: String.raw`\tilde{x}_{ij}` },
          { name: 'x_id', latex: 'x^u_{id}' },
        ],
      },
    ],
    rows: x.rows,
    columns: x.columns,
    cell: (row, column) =>
      tfnOps.divideByScalar(
        term(x.cell(row.index, column.index), 'x'),
        term(tfnOps.upper(ideal.at(column.index)), 'x_id'),
      ),
  });
  const sums = tb.columnVector<TFN>({
    ...meta('sums'),
    items: x.rows,
    cell: (row) => tfnOps.sum(normalized.row(row.index)),
  });
  tb.columnVector<number>({
    ...meta('crisp'),
    items: x.rows,
    cell: (row) => tfnOps.gradedMean(sums.at(row.index)),
  });
  return tb.build();
}

describe('encoding TFNs for traces', () => {
  it('encodes a TFN as a triple', () => {
    expect(encodeTfn(tfn(1, 2, 3))).toEqual({ type: 'tfn', components: { l: 1, m: 2, u: 3 } });
    expect(Object.is(decodeTfn(encodeTfn({ l: -0, m: 0, u: 0 })).l, 0)).toBe(true);
  });

  it('refuses values that are not valid TFNs', () => {
    expect(errorCode(() => encodeTfn({ l: 1, m: Number.NaN, u: 3 }))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => encodeTfn({ l: 1, m: 2, u: Number.POSITIVE_INFINITY }))).toBe(
      'NON_FINITE_VALUE',
    );
    expect(errorCode(() => encodeTfn({ l: 3, m: 2, u: 1 }))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => encodeTfn(5 as unknown as TFN))).toBe('INVALID_ARGUMENT');
  });

  it('decodes triples and rejects everything else', () => {
    expect(decodeTfn(triple(1, 2, 3))).toEqual({ l: 1, m: 2, u: 3 });
    expect(isTfnTraceValue(triple(1, 2, 3))).toBe(true);
    expect(isTfnTraceValue(5)).toBe(false);
    expect(isTfnTraceValue(null)).toBe(false);
    expect(isTfnTraceValue('tfn')).toBe(false);
    expect(isTfnTraceValue({ type: 'trapezoidal', components: { l: 1, m: 2, u: 3 } })).toBe(false);
    expect(isTfnTraceValue({ type: 'tfn', components: { l: 1, m: 2 } })).toBe(false);
    expect(isTfnTraceValue({ type: 'tfn', components: { l: 1, m: 2, u: 3, x: 4 } })).toBe(false);
    expect(errorCode(() => decodeTfn(5))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => decodeTfn(triple(3, 2, 1)))).toBe('INVALID_ARGUMENT');
  });
});

describe('traced TFN operations', () => {
  const a = constant(tfn(2, 4, 8), undefined, encodeTfn);
  const b = constant(tfn(1, 2, 4), undefined, encodeTfn);

  it('compute the value and record the derivation in one step', () => {
    const quotient = tfnOps.divide(a, b);
    expect(quotient.value).toEqual({ l: 0.5, m: 2, u: 8 });
    expect(quotient.node).toEqual({
      kind: 'operation',
      operation: 'tfn.divide',
      operands: [
        { kind: 'constant', value: triple(2, 4, 8) },
        { kind: 'constant', value: triple(1, 2, 4) },
      ],
      value: triple(0.5, 2, 8),
    });
  });

  it('cover every arithmetic, aggregation and defuzzification function', () => {
    expect(tfnOps.add(a, b).value).toEqual({ l: 3, m: 6, u: 12 });
    expect(tfnOps.subtract(a, b).value).toEqual({ l: -2, m: 2, u: 7 });
    expect(tfnOps.multiply(a, b).value).toEqual({ l: 2, m: 8, u: 32 });
    expect(tfnOps.addScalar(a, 1).value).toEqual({ l: 3, m: 5, u: 9 });
    expect(tfnOps.subtractScalar(a, 1).value).toEqual({ l: 1, m: 3, u: 7 });
    expect(tfnOps.scalarMinus(8, a).value).toEqual({ l: 0, m: 4, u: 6 });
    expect(tfnOps.multiplyByScalar(a, 0.5).value).toEqual({ l: 1, m: 2, u: 4 });
    expect(tfnOps.divideByScalar(a, 2).value).toEqual({ l: 1, m: 2, u: 4 });
    expect(tfnOps.scalarDividedBy(8, a).value).toEqual({ l: 1, m: 2, u: 4 });
    expect(tfnOps.sum([a, b]).value).toEqual({ l: 3, m: 6, u: 12 });
    expect(tfnOps.min([a, b]).value).toEqual({ l: 1, m: 2, u: 4 });
    expect(tfnOps.max([a, b]).value).toEqual({ l: 2, m: 4, u: 8 });
    expect(tfnOps.arithmeticMean([a, b]).value).toEqual({ l: 1.5, m: 3, u: 6 });
    expect(tfnOps.minMeanMax([a, b]).value).toEqual({ l: 1, m: 3, u: 8 });
    expect(tfnOps.geometricMean([a, a]).value.m).toBeCloseTo(4, 14);
    // (2 + 16 + 8) / 6 and (2 + 4 + 8) / 3
    expect(tfnOps.gradedMean(a).value).toBeCloseTo(26 / 6, 14);
    expect(tfnOps.centroid(a).value).toBeCloseTo(14 / 3, 14);
    expect(tfnOps.lower(a).value).toBe(2);
    expect(tfnOps.modal(a).value).toBe(4);
    expect(tfnOps.upper(a).value).toBe(8);
    expect(tfnOps.fromCrisp(crisp.add(1, 2)).value).toEqual({ l: 3, m: 3, u: 3 });
    expect(Object.keys(tfnOps).length).toBe(Object.keys(TFN_OPERATIONS).length + 1);
  });

  it('record a defuzzification chosen by id as that formula', () => {
    expect(tfnOps.defuzzify('graded-mean', a).node).toMatchObject({ operation: 'tfn.graded-mean' });
    expect(tfnOps.defuzzify('centroid', a).node).toMatchObject({ operation: 'tfn.centroid' });
    expect(errorCode(() => tfnOps.defuzzify('other' as 'centroid', a))).toBe('INVALID_ARGUMENT');
  });

  it('accept bare TFNs and numbers as constants', () => {
    const result = tfnOps.addScalar(tfn(1, 2, 3), 1);
    expect(result.value).toEqual({ l: 2, m: 3, u: 4 });
    expect((result.node as OperationNode).operands).toEqual([
      { kind: 'constant', value: triple(1, 2, 3) },
      { kind: 'constant', value: 1 },
    ]);
    expect(errorCode(() => tfnOps.add({ l: 3, m: 2, u: 1 }, b))).toBe('INVALID_ARGUMENT');
  });

  it('throw instead of recording a value that is not a finite TFN', () => {
    expect(errorCode(() => tfnOps.divide(a, tfn(0, 1, 2)))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnOps.divideByScalar(a, 0))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnOps.multiplyByScalar(tfn(1, 2, 1e200), 1e200))).toBe(
      'NON_FINITE_VALUE',
    );
    expect(errorCode(() => tfnOps.sum([]))).toBe('INVALID_ARGUMENT');
  });
});

describe('TFN cells in a step trace', () => {
  it('renders fuzzy cells as triples in cells and derivations', () => {
    const trace = sampleTrace();
    expect(getStep(trace, 'initial').output.cells[0]?.[0]).toEqual({
      value: triple(1, 2, 4),
      derivation: {
        kind: 'input',
        source: { input: 'matrix', row: 'a1', column: 'c1' },
        value: triple(1, 2, 4),
      },
    });
    // Ideal: the component-wise maximum of each column.
    expect(getStep(trace, 'ideal').output.cells[0]?.map((cell) => cell.value)).toEqual([
      triple(2, 4, 8),
      triple(2, 4, 4),
    ]);
    // a1/c1: (1, 2, 4) / 8.
    const cell = getStep(trace, 'normalized').output.cells[0]?.[0];
    expect(cell?.value).toEqual(triple(0.125, 0.25, 0.5));
    expect(cell?.derivation).toEqual({
      kind: 'operation',
      operation: 'tfn.divide-by-scalar',
      operands: [
        {
          kind: 'ref',
          ref: { step: 'initial', row: 'a1', column: 'c1' },
          value: triple(1, 2, 4),
          term: 'x',
        },
        {
          kind: 'operation',
          operation: 'tfn.upper',
          operands: [
            {
              kind: 'ref',
              ref: { step: 'ideal', row: 'ideal', column: 'c1' },
              value: triple(2, 4, 8),
            },
          ],
          value: 8,
          term: 'x_id',
        },
      ],
      value: triple(0.125, 0.25, 0.5),
    });
    // a1: (0.125, 0.25, 0.5) + (0.5, 1, 1) = (0.625, 1.25, 1.5); graded mean 7.125 / 6.
    expect(getStep(trace, 'sums').output.cells[0]?.[0]?.value).toEqual(triple(0.625, 1.25, 1.5));
    expect(getStep(trace, 'crisp').output.cells[0]?.[0]?.value).toBeCloseTo(1.1875, 14);
    expect(getStep(trace, 'normalized').sources).toEqual([
      { kind: 'step', step: 'initial' },
      { kind: 'step', step: 'ideal' },
    ]);
  });

  it('passes the trace auditor, which recomputes every TFN operation', () => {
    const trace = sampleTrace();
    expect(verifyTrace(trace, AUDIT)).toEqual([]);
    expect(verifyTrace(JSON.parse(JSON.stringify(trace)) as Trace, AUDIT)).toEqual([]);
    // Without the evaluators the operations are unknown to the engine.
    expect(
      verifyTrace(trace, { requireKnownOperations: true }).every(
        (problem) => problem.code === 'unknown-operation',
      ),
    ).toBe(true);
    expect(verifyTrace(trace, { requireKnownOperations: true }).length).toBeGreaterThan(0);
  });

  it('lets the auditor catch a TFN that was changed after the run', () => {
    const tampered = JSON.parse(JSON.stringify(sampleTrace())) as {
      steps: { output: { cells: { value: unknown; derivation: { value: unknown } }[][] } }[];
    };
    const cell = tampered.steps[3]?.output.cells[0]?.[0];
    if (cell === undefined) throw new Error('missing cell');
    cell.value = triple(0.625, 1.3, 1.5);
    cell.derivation.value = triple(0.625, 1.3, 1.5);
    const codes = verifyTrace(tampered as unknown as Trace, AUDIT).map((problem) => problem.code);
    expect(codes).toContain('operation-mismatch');
  });

  it('reproduces IMF SWARA scenario S1 of Damjanović et al. (2022) with traced operations', () => {
    // Assessments (–, WLS, ES, WLS). Exact values: q̃ = (1,1,1), (7/9, 4/5, 9/11) twice,
    // (49/81, 16/25, 81/121); Σq̃ = (256/81, 81/25, 400/121).
    const assessments = [null, 'WLS', 'ES', 'WLS'];
    const one = fromCrisp(1);
    const q: ReturnType<typeof tfnOps.add>[] = [];
    assessments.forEach((assessment, index) => {
      if (assessment === null) {
        q.push(constant(one, undefined, encodeTfn));
        return;
      }
      const k = tfnOps.addScalar(termToTfn(IMF_SWARA_SCALE, assessment), 1);
      q.push(tfnOps.divide(q[index - 1] as (typeof q)[number], k));
    });
    const total = tfnOps.sum(q);
    const weights = q.map((item) => tfnOps.divide(item, total));
    const crispWeights = weights.map((weight) => tfnOps.defuzzify('graded-mean', weight).value);

    const close = (actual: TFN, expected: [number, number, number]): void => {
      expect(actual.l).toBeCloseTo(expected[0], 12);
      expect(actual.m).toBeCloseTo(expected[1], 12);
      expect(actual.u).toBeCloseTo(expected[2], 12);
    };
    close((q[1] as (typeof q)[number]).value, [7 / 9, 4 / 5, 9 / 11]);
    close((q[3] as (typeof q)[number]).value, [49 / 81, 16 / 25, 81 / 121]);
    close(total.value, [256 / 81, 81 / 25, 400 / 121]);
    // w̃₁ = (1, 1, 1) ⊘ Σq̃ = (121/400, 25/81, 81/256)
    close((weights[0] as (typeof q)[number]).value, [121 / 400, 25 / 81, 81 / 256]);
    // Printed in Table 4 (2 decimals) and in docs/methods/swara.md (4 decimals).
    [0.3089, 0.247, 0.247, 0.1975].forEach((printed, index) => {
      expect(crispWeights[index]).toBeCloseTo(printed, 4);
    });
    // Not exactly 1: defuzzification is not additive across normalised fuzzy weights.
    expect(crispWeights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1.0003, 4);
  });
});

describe('TFN evaluators', () => {
  const evaluate = (operation: string, args: readonly TraceValue[]) => {
    const evaluator = TFN_EVALUATORS[operation];
    if (evaluator === undefined) throw new Error(`no evaluator for ${operation}`);
    return evaluator(args, {});
  };

  it('exist for every operation and use ids that cannot clash with crisp operations', () => {
    expect(Object.keys(TFN_EVALUATORS).sort()).toEqual(Object.keys(TFN_OPERATIONS).sort());
    expect(Object.keys(TFN_OPERATIONS).every((id) => id.startsWith('tfn.'))).toBe(true);
  });

  it('recompute values from trace values', () => {
    expect(evaluate('tfn.add', [triple(1, 2, 3), triple(1, 1, 1)])).toEqual({
      value: triple(2, 3, 4),
    });
    expect(evaluate('tfn.scalar-divided-by', [1, triple(1, 2, 4)])).toEqual({
      value: triple(0.25, 0.5, 1),
    });
    expect(evaluate('tfn.sum', [triple(1, 2, 3), triple(1, 1, 1), triple(0, 0, 1)])).toEqual({
      value: triple(2, 3, 5),
    });
    expect(evaluate('tfn.graded-mean', [triple(1, 2, 9)])).toEqual({ value: 3 });
    expect(evaluate('tfn.from-crisp', [2])).toEqual({ value: triple(2, 2, 2) });
  });

  it('report a wrong number or kind of operands instead of throwing', () => {
    expect(evaluate('tfn.add', [triple(1, 2, 3)])).toMatchObject({ kind: 'arity' });
    expect(evaluate('tfn.sum', [])).toMatchObject({ kind: 'arity' });
    expect(evaluate('tfn.add', [triple(1, 2, 3), 1])).toMatchObject({ kind: 'operand' });
    expect(evaluate('tfn.add-scalar', [triple(1, 2, 3), triple(1, 1, 1)])).toMatchObject({
      kind: 'operand',
    });
    expect(evaluate('tfn.add', [triple(1, 2, 3), triple(3, 2, 1)])).toMatchObject({
      kind: 'operand',
    });
    expect(evaluate('tfn.divide', [triple(1, 2, 3), triple(0, 1, 2)])).toMatchObject({
      kind: 'operand',
    });
    expect(evaluate('tfn.lower', [null])).toMatchObject({ kind: 'operand' });
  });
});
