/**
 * ARAS-F property and validation tests.
 *
 * NOT YET VERIFIED against a published example (docs/methods/aras.md): the optimal row of
 * the example of Turskis and Zavadskas (2010) is not legible in the available copy, so
 * there is no golden test. These tests check the laws the method must obey: crisp input
 * gives crisp ARAS, every TFN in the trace stays valid, the order of the alternatives does
 * not matter, and a hand-computed example.
 */
import {
  assertDeterministic,
  crispWeights,
  runMethod,
  validateMethodRun,
  verifyTrace,
} from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import { decodeTfn, TFN_EVALUATORS } from '@mateo/fuzzy';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  asTfnMatrix,
  asTfnWeights,
  crispInput,
  smallMatrix,
  smallTfnMatrix,
  smallTfnWeights,
  smallWeights,
} from '../src/testing/inputs';
import { ARAS_ISSUE_CODES, ARAS_OPTIMAL, arasMethod } from './aras';
import fixture from './fixtures/zavadskas-2010.json';
import type { FuzzyArasInput } from './fuzzy-aras';
import { FUZZY_ARAS_ISSUE_CODES, fuzzyArasMethod } from './fuzzy-aras';

const AUDIT = { operations: TFN_EVALUATORS, requireKnownOperations: true } as const;
const run = (value: FuzzyArasInput, params = {}) =>
  runMethod(fuzzyArasMethod, value, params, { verifyTrace: AUDIT });

const t = (l: number, m: number, u: number): TFN => ({ l, m, u });
const tfnOptimal = (values: TFN[], ids: string[] = values.map((_, j) => `c${j + 1}`)) => ({
  numberType: 'tfn' as const,
  entries: values.map((value, j) => ({ criterionId: ids[j]!, value })),
});

describe('ARAS-F: crisp ARAS for (x, x, x) ratings', () => {
  const crisp = crispInput(fixture.input);
  const ids = fixture.input.criteria.map((c) => c.id);
  const crispOptimal = crispWeights(ids, fixture.input.optimal);
  const degenerate: FuzzyArasInput = {
    matrix: asTfnMatrix(crisp.matrix),
    weights: asTfnWeights(crisp.weights),
  };
  const degenerateOptimal = asTfnWeights(crispOptimal);

  it.each([
    ['entered optimal row, TFN weights', degenerate, degenerateOptimal, crispOptimal],
    [
      'default optimal row, crisp weights',
      { ...degenerate, weights: crisp.weights },
      undefined,
      undefined,
    ],
  ])('gives the crisp utility degrees and ranking (%s)', (_name, value, optimal, crispOpt) => {
    const fuzzy = run({ ...value, ...(optimal === undefined ? {} : { optimal }) }).result;
    const expected = runMethod(arasMethod, {
      ...crisp,
      ...(crispOpt === undefined ? {} : { optimal: crispOpt }),
    }).result;
    fuzzy.utilityDegree.forEach((k, i) => expect(k).toBeCloseTo(expected.utilityDegree[i]!, 12));
    expect(fuzzy.ranking.map((item) => item.rank)).toEqual(
      expected.ranking.map((item) => item.rank),
    );
  });

  it('agrees with crisp ARAS for random degenerate matrices', () => {
    const cell = fc.integer({ min: 1, max: 500 });
    fc.assert(
      fc.property(
        fc.array(fc.array(cell, { minLength: 3, maxLength: 3 }), { minLength: 2, maxLength: 6 }),
        fc.array(fc.constantFrom('benefit', 'cost'), { minLength: 3, maxLength: 3 }),
        (values, directions) => {
          const matrix = smallMatrix(values, directions);
          const weights = smallWeights(0.2, 0.3, 0.5);
          const expected = runMethod(arasMethod, { matrix, weights }).result;
          const fuzzy = run({ matrix: asTfnMatrix(matrix), weights: asTfnWeights(weights) }).result;
          fuzzy.utilityDegree.forEach((k, i) =>
            expect(k).toBeCloseTo(expected.utilityDegree[i]!, 12),
          );
        },
      ),
      { seed: 20261118, numRuns: 100 },
    );
  });
});

describe('ARAS-F: valid TFNs and structure', () => {
  const tfnCell = fc
    .tuple(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 0, max: 50 }),
      fc.integer({ min: 0, max: 50 }),
    )
    .map(([l, dm, du]) => t(l, l + dm, l + dm + du));

  it('keeps l ≤ m ≤ u in every TFN cell of the trace and passes the audit', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(tfnCell, { minLength: 3, maxLength: 3 }), { minLength: 2, maxLength: 5 }),
        fc.array(fc.constantFrom('benefit', 'cost'), { minLength: 3, maxLength: 3 }),
        (values, directions) => {
          const record = run({
            matrix: smallTfnMatrix(values, directions),
            weights: smallTfnWeights(t(0.1, 0.2, 0.3), t(0.2, 0.3, 0.4), t(0.3, 0.4, 0.5)),
          });
          expect(verifyTrace(record.trace, AUDIT)).toEqual([]);
          for (const step of record.trace.steps) {
            for (const row of step.output.cells) {
              for (const cell of row) {
                const value = cell.value;
                if (typeof value === 'object' && value !== null) {
                  const { l, m, u } = value.components as { l: number; m: number; u: number };
                  expect(l).toBeLessThanOrEqual(m);
                  expect(m).toBeLessThanOrEqual(u);
                }
              }
            }
          }
          // With the default optimum no alternative is better than it.
          for (const k of record.result.utilityDegree) expect(k).toBeLessThanOrEqual(1 + 1e-12);
        },
      ),
      { seed: 20261118, numRuns: 60 },
    );
  });

  it('computes a small example by hand', () => {
    // Benefit c1: (2, 3, 4) and (4, 6, 8); optimum (4, 6, 8). Sum over rows 0..2: (10, 15, 20).
    // x̄ = (l / 20, m / 15, u / 10): optimal (0.2, 0.4, 0.8), first (0.1, 0.2, 0.4).
    // One criterion with weight 1: S̃ = x̄, centroids 1.4/3 and 0.7/3, so K = 0.5.
    const record = run({
      matrix: smallTfnMatrix([[t(2, 3, 4)], [t(4, 6, 8)]], ['benefit']),
      weights: smallWeights(1),
    });
    const normalized = record.trace.steps.find((s) => s.id === 'normalized-matrix')!.output.cells;
    expect(decodeTfn(normalized[0]![0]!.value)).toEqual({ l: 0.2, m: 0.4, u: 0.8 });
    expect(decodeTfn(normalized[1]![0]!.value)).toEqual({ l: 0.1, m: 0.2, u: 0.4 });
    expect(record.result.utilityDegree[0]).toBeCloseTo(0.5, 14);
    expect(record.result.utilityDegree[1]).toBeCloseTo(1, 14);
  });

  it('inverts a cost criterion before normalising', () => {
    // Cost c1: (2, 4, 8) and (1, 2, 4); the optimum is the component-wise minimum (1, 2, 4).
    const record = run({
      matrix: smallTfnMatrix([[t(2, 4, 8)], [t(1, 2, 4)]], ['cost']),
      weights: smallWeights(1),
    });
    const inverted = record.trace.steps.find((s) => s.id === 'inverted-matrix')!.output.cells;
    expect(decodeTfn(inverted[0]![0]!.value)).toEqual({ l: 0.25, m: 0.5, u: 1 });
    expect(decodeTfn(inverted[1]![0]!.value)).toEqual({ l: 0.125, m: 0.25, u: 0.5 });
    expect(record.result.utilityDegree[1]).toBeGreaterThan(record.result.utilityDegree[0]!);
  });

  it('has the steps of the method in order, with the entered optimal alternative', () => {
    const matrix = smallTfnMatrix(
      [
        [t(2, 3, 4), t(1, 2, 3)],
        [t(4, 6, 8), t(2, 3, 5)],
      ],
      ['benefit', 'cost'],
    );
    const record = run({
      matrix,
      weights: smallWeights(0.5, 0.5),
      optimal: tfnOptimal([t(5, 7, 9), t(1, 1, 2)]),
    });
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'optimal-alternative',
      'extended-matrix',
      'inverted-matrix',
      'column-sums',
      'normalized-matrix',
      'weighted-matrix',
      'fuzzy-sums',
      'sums',
      'utility-degree',
      'ranking',
    ]);
    const optimal = record.trace.steps.find((s) => s.id === 'optimal-alternative')!;
    expect(decodeTfn(optimal.output.cells[0]![0]!.value)).toEqual(t(5, 7, 9));
    expect(optimal.output.rows[0]).toMatchObject({ id: ARAS_OPTIMAL });
  });

  it('does not depend on the order of the alternatives', () => {
    const values = [
      [t(2, 3, 4), t(5, 6, 8), t(1, 2, 2)],
      [t(4, 6, 8), t(1, 2, 3), t(3, 3, 4)],
      [t(1, 2, 2), t(7, 8, 9), t(2, 4, 5)],
    ];
    const base = smallTfnMatrix(values, ['benefit', 'cost', 'benefit']);
    const weights = smallWeights(0.3, 0.3, 0.4);
    const order = [2, 0, 1];
    const shuffled = {
      ...base,
      alternatives: order.map((i) => base.alternatives[i]!),
      values: order.map((i) => base.values[i]!),
    };
    const byId = (matrix: typeof base) =>
      Object.fromEntries(
        run({ matrix, weights }).result.ranking.map((item) => [item.alternativeId, item.rank]),
      );
    expect(byId(shuffled)).toEqual(byId(base));
  });

  it('uses the graded mean when asked, and records it as its own formula', () => {
    const matrix = smallTfnMatrix([[t(1, 2, 6)], [t(2, 3, 4)]], ['benefit']);
    const weights = smallWeights(1);
    const graded = run({ matrix, weights }, { defuzzification: 'graded-mean' });
    expect(graded.trace.steps.find((s) => s.id === 'sums')!.formulas.map((f) => f.id)).toEqual([
      'defuzzify-graded-mean',
    ]);
    expect(graded.result.utilityDegree[0]).not.toBeCloseTo(
      run({ matrix, weights }).result.utilityDegree[0]!,
      6,
    );
  });

  it('is deterministic', () => {
    const matrix = smallTfnMatrix([[t(2, 3, 4)], [t(4, 6, 8)]], ['benefit']);
    assertDeterministic(fuzzyArasMethod, { matrix, weights: smallWeights(1) });
  });
});

describe('ARAS-F: validation', () => {
  const codes = (value: unknown, params = {}) =>
    validateMethodRun(fuzzyArasMethod, value as FuzzyArasInput, params).errors.map(
      (issue) => issue.code,
    );
  const matrix = smallTfnMatrix(
    [
      [t(1, 2, 3), t(2, 3, 4)],
      [t(2, 3, 4), t(1, 2, 3)],
    ],
    ['benefit', 'cost'],
  );
  const weights = smallWeights(0.5, 0.5);

  it('accepts input with and without an optimal alternative, and TFN weights', () => {
    expect(codes({ matrix, weights })).toEqual([]);
    expect(codes({ matrix, weights: smallTfnWeights(t(0.1, 0.2, 0.3), t(0.3, 0.4, 0.5)) })).toEqual(
      [],
    );
    expect(codes({ matrix, weights, optimal: tfnOptimal([t(3, 4, 5), t(1, 1, 2)]) })).toEqual([]);
  });

  it('rejects malformed input and unsupported weights', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix })).toEqual(['input.malformed']);
    expect(codes({ matrix, weights: { numberType: 'trapezoidal', entries: [] } })).toEqual([
      FUZZY_ARAS_ISSUE_CODES.unsupportedWeights,
    ]);
  });

  it('rejects an alternative that uses the id of the optimal row', () => {
    const reserved = {
      ...matrix,
      alternatives: matrix.alternatives.map((a, i) => (i === 0 ? { ...a, id: ARAS_OPTIMAL } : a)),
    };
    expect(codes({ matrix: reserved, weights })).toEqual([ARAS_ISSUE_CODES.reservedAlternativeId]);
  });

  it('rejects an incomplete or invalid optimal alternative', () => {
    expect(codes({ matrix, weights, optimal: tfnOptimal([t(3, 4, 5)]) })).toEqual([
      ARAS_ISSUE_CODES.optimalMismatch,
    ]);
    expect(codes({ matrix, weights, optimal: tfnOptimal([t(3, 4, 5), t(5, 4, 3)]) })).toEqual([
      ARAS_ISSUE_CODES.invalidOptimalValue,
    ]);
    expect(codes({ matrix, weights, optimal: crispWeights(['c1', 'c2'], [3, 1]) })).toEqual([
      'input.malformed',
    ]);
  });

  it('rejects a cost TFN with l = 0, in the data or in the optimal row', () => {
    const result = validateMethodRun(fuzzyArasMethod, {
      matrix: smallTfnMatrix(
        [
          [t(1, 2, 3), t(0, 3, 4)],
          [t(2, 3, 4), t(1, 2, 3)],
        ],
        ['benefit', 'cost'],
      ),
      weights,
    });
    expect(result.errors).toMatchObject([
      {
        code: FUZZY_ARAS_ISSUE_CODES.zeroCostValue,
        location: { row: { id: 'a1' }, column: { id: 'c2' } },
      },
    ]);
    expect(codes({ matrix, weights, optimal: tfnOptimal([t(3, 4, 5), t(0, 1, 2)]) })).toEqual([
      FUZZY_ARAS_ISSUE_CODES.zeroCostValue,
    ]);
  });

  it('rejects a benefit criterion whose lower values are all 0 (the sum has a zero lower bound)', () => {
    expect(
      codes({
        matrix: smallTfnMatrix([[t(0, 1, 2)], [t(0, 2, 3)]], ['benefit']),
        weights: smallWeights(1),
        optimal: tfnOptimal([t(0, 3, 4)]),
      }),
    ).toEqual([FUZZY_ARAS_ISSUE_CODES.zeroBenefitLowerSum]);
  });

  it('rejects an optimal alternative whose weighted sum is 0', () => {
    expect(
      codes({
        matrix: smallTfnMatrix([[t(1, 2, 3)], [t(2, 3, 4)]], ['benefit']),
        weights: smallWeights(1),
        optimal: tfnOptimal([t(0, 0, 0)]),
      }),
    ).toEqual([FUZZY_ARAS_ISSUE_CODES.zeroOptimalSum]);
  });

  it('warns for an entered optimum worse than the best alternative, and still runs', () => {
    const optimal = tfnOptimal([t(1, 1, 2), t(3, 4, 5)]);
    const result = validateMethodRun(fuzzyArasMethod, { matrix, weights, optimal });
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toEqual([
      ARAS_ISSUE_CODES.optimalWorseThanAlternative,
      ARAS_ISSUE_CODES.optimalWorseThanAlternative,
    ]);
  });
});
