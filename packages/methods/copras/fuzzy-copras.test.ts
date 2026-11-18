/**
 * Fuzzy COPRAS golden, property and validation tests.
 *
 * Golden source: Yazdani, Alidoosti, Zavadskas (2011), Economic Research 24(4), 27-40,
 * Tables 4-7 (docs/methods/copras.md): centroid defuzzification, then crisp COPRAS.
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import { TFN_EVALUATORS } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import {
  asTfnMatrix,
  asTfnWeights,
  crispInput,
  smallMatrix,
  smallTfnMatrix,
  smallTfnWeights,
  smallWeights,
  tfnInput,
} from '../src/testing/inputs';
import { coprasMethod } from './copras';
import fixture from './fixtures/yazdani-2011-fuzzy.json';
import podvezko from './fixtures/podvezko-2011.json';
import type { FuzzyCoprasInput } from './fuzzy-copras';
import { FUZZY_COPRAS_ISSUE_CODES, fuzzyCoprasMethod } from './fuzzy-copras';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.crispWeights', step: 'defuzzified-weights', kind: 'row' },
  { fixture: 'result.relativeSignificance', step: 'relative-significance', kind: 'column' },
  { fixture: 'result.utilityDegree', step: 'utility-degree', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const AUDIT = { operations: TFN_EVALUATORS, requireKnownOperations: true } as const;
const input = (): FuzzyCoprasInput => tfnInput(fixture.input);
const run = (value: FuzzyCoprasInput = input(), params = {}) =>
  runMethod(fuzzyCoprasMethod, value, params, { verifyTrace: AUDIT });

const t = (l: number, m: number, u: number): TFN => ({ l, m, u });

describe('Fuzzy COPRAS: golden test (Yazdani et al. 2011, Tables 4-7)', () => {
  const record = run();

  it('reproduces the crisp weights, Q, N and the ranking within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    // The weight of VH is printed 0.916 for 0.91667 (docs/methods/copras.md).
    expect(report.deviationsUsed).toEqual(['steps.crispWeights.values[2]']);
    expect(report.checked).toBe(5 + 8 + 8 + 8);
  });

  it('reproduces the weighted normalized matrix of Table 6 for criteria C1-C4', () => {
    // The C5 column of Table 6 is not reproducible from Table 5 and is marked null (fixture).
    const printed = fixture.steps.weightedNormalizedMatrix.values;
    const step = record.trace.steps.find((s) => s.id === 'weighted-normalized-matrix')!;
    let checked = 0;
    printed.forEach((row, i) =>
      row.forEach((value, j) => {
        if (value === null) return;
        checked += 1;
        // Table 6 is printed to six decimals and computed with the weight 0.916 for VH.
        expect(step.output.cells[i]![j]!.value as number).toBeCloseTo(value, j === 2 ? 3 : 5);
      }),
    );
    expect(checked).toBe(8 * 4);
  });

  it('covers every table the paper prints', () => {
    expect([...SPECS.map((spec) => spec.fixture), 'steps.weightedNormalizedMatrix'].sort()).toEqual(
      fixtureTables(fixture).sort(),
    );
  });

  it('ranks SY first and RST last', () => {
    const byRank = [...record.result.ranking].sort((a, b) => a.rank - b.rank);
    expect(byRank[0]).toMatchObject({ alternativeId: 'SY', rank: 1 });
    expect(byRank[0]!.score).toBeCloseTo(100, 10);
    expect(byRank.at(-1)).toMatchObject({ alternativeId: 'RST', rank: 8 });
  });

  it('shows the two stages: defuzzification first, then the steps of COPRAS', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'defuzzified-matrix',
      'defuzzified-weights',
      'column-sums',
      'weighted-normalized-matrix',
      'sums',
      'relative-significance',
      'utility-degree',
      'ranking',
    ]);
    const defuzzified = record.trace.steps.find((s) => s.id === 'defuzzified-matrix')!;
    // RPP rated C1 (5, 7.5, 10): centroid 7.5.
    expect(defuzzified.output.cells[0]![0]!.value).toBe(7.5);
  });

  it('stores fuzzy cells as triples and passes the trace audit', () => {
    expect(verifyTrace(record.trace, AUDIT)).toEqual([]);
    const initial = record.trace.steps.find((s) => s.id === 'initial-matrix')!;
    expect(initial.output.cells[0]![0]!.value).toEqual({
      type: 'tfn',
      components: { l: 5, m: 7.5, u: 10 },
    });
  });

  it('is deterministic', () => {
    assertDeterministic(fuzzyCoprasMethod, input());
  });
});

describe('Fuzzy COPRAS: crisp COPRAS after defuzzification', () => {
  const crisp = crispInput(podvezko.input);
  const degenerate: FuzzyCoprasInput = {
    matrix: asTfnMatrix(crisp.matrix),
    weights: asTfnWeights(crisp.weights),
  };
  const crispRecord = runMethod(coprasMethod, crisp);

  it.each([
    ['TFN weights (w, w, w)', degenerate],
    ['crisp weights', { ...degenerate, weights: crisp.weights }],
  ])('gives exactly the crisp utility degrees for (x, x, x) ratings (%s)', (_name, value) => {
    const fuzzy = run(value).result;
    expect(fuzzy.utilityDegree).toEqual(crispRecord.result.utilityDegree);
    expect(fuzzy.relativeSignificance).toEqual(crispRecord.result.relativeSignificance);
    expect(fuzzy.ranking.map((item) => item.rank)).toEqual(
      crispRecord.result.ranking.map((item) => item.rank),
    );
  });

  it('is crisp COPRAS on the centroids of the ratings', () => {
    const fuzzy = input();
    const defuzzified = {
      matrix: {
        ...fuzzy.matrix,
        criteria: fuzzy.matrix.criteria.map((c) => ({ ...c, numberType: 'crisp' as const })),
        values: fuzzy.matrix.values.map((row) => row.map((x) => (x.l + x.m + x.u) / 3)),
      },
      weights: {
        numberType: 'crisp' as const,
        entries: (fuzzy.weights.entries as { criterionId: string; value: TFN }[]).map((e) => ({
          criterionId: e.criterionId,
          value: (e.value.l + e.value.m + e.value.u) / 3,
        })),
      },
    };
    const expected = runMethod(coprasMethod, defuzzified).result;
    const actual = run(fuzzy).result;
    actual.utilityDegree.forEach((n, i) => expect(n).toBeCloseTo(expected.utilityDegree[i]!, 10));
  });

  it('uses the graded mean when asked, and records it as its own formula', () => {
    const graded = run(input(), { defuzzification: 'graded-mean' });
    const step = graded.trace.steps.find((s) => s.id === 'defuzzified-matrix')!;
    expect(step.formulas.map((f) => f.id)).toEqual(['defuzzify-graded-mean']);
    // (5 + 4 · 7.5 + 10) / 6 = 7.5 for a symmetric TFN, but VG (7.5, 10, 10) gives 9.583.
    expect(step.output.cells[0]![3]!.value).toBeCloseTo((7.5 + 40 + 10) / 6, 12);
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [5, 2, 7, 0, 3, 1, 6, 4];
    const shuffled: FuzzyCoprasInput = {
      weights: base.weights,
      matrix: {
        criteria: base.matrix.criteria,
        alternatives: order.map((i) => base.matrix.alternatives[i]!),
        values: order.map((i) => base.matrix.values[i]!),
      },
    };
    const byId = (record: ReturnType<typeof run>) =>
      Object.fromEntries(record.result.ranking.map((item) => [item.alternativeId, item.rank]));
    expect(byId(run(shuffled))).toEqual(byId(run()));
  });
});

describe('Fuzzy COPRAS: validation', () => {
  const codes = (value: unknown, params = {}) =>
    validateMethodRun(fuzzyCoprasMethod, value as FuzzyCoprasInput, params).errors.map(
      (issue) => issue.code,
    );
  const small = (values: TFN[][], directions: ('benefit' | 'cost')[]) => ({
    matrix: smallTfnMatrix(values, directions),
    weights: smallWeights(0.5, 0.5),
  });

  it('accepts the reference input', () => {
    expect(validateMethodRun(fuzzyCoprasMethod, input()).ok).toBe(true);
  });

  it('rejects malformed input and unsupported weights', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    const value = small(
      [
        [t(1, 2, 3), t(1, 2, 3)],
        [t(1, 2, 3), t(2, 3, 4)],
      ],
      ['benefit', 'cost'],
    );
    expect(codes({ matrix: value.matrix })).toEqual(['input.malformed']);
    expect(
      codes({ matrix: value.matrix, weights: { numberType: 'trapezoidal', entries: [] } }),
    ).toEqual([FUZZY_COPRAS_ISSUE_CODES.unsupportedWeights]);
  });

  it('rejects invalid and negative TFNs', () => {
    expect(
      codes(
        small(
          [
            [t(3, 2, 1), t(1, 2, 3)],
            [t(1, 2, 3), t(1, 2, 3)],
          ],
          ['benefit', 'cost'],
        ),
      ),
    ).toEqual(['tfn.invalid-order']);
    expect(
      codes(
        small(
          [
            [t(-1, 2, 3), t(1, 2, 3)],
            [t(1, 2, 3), t(1, 2, 3)],
          ],
          ['benefit', 'cost'],
        ),
      ),
    ).toEqual(['tfn.negative-value']);
  });

  it('rejects ratings that defuzzify to a zero column or a zero cost sum', () => {
    const zero = t(0, 0, 0);
    expect(
      codes(
        small(
          [
            [t(1, 2, 3), zero],
            [t(2, 3, 4), zero],
          ],
          ['benefit', 'cost'],
        ),
      ),
    ).toEqual(['copras.zero-column-sum']);
  });

  it('accepts TFN weights, and crisp weights that do not sum to 1', () => {
    const matrix = smallTfnMatrix(
      [
        [t(1, 2, 3), t(1, 2, 3)],
        [t(2, 3, 4), t(2, 3, 5)],
      ],
      ['benefit', 'cost'],
    );
    expect(codes({ matrix, weights: smallTfnWeights(t(0.2, 0.4, 0.6), t(0.1, 0.2, 0.3)) })).toEqual(
      [],
    );
    expect(codes({ matrix, weights: smallWeights(3, 5) })).toEqual([]);
    expect(smallMatrix([[1]], ['benefit']).values).toEqual([[1]]);
  });
});
