/**
 * Fuzzy MOORA property and validation tests.
 *
 * NOT YET VERIFIED against a published example (docs/methods/moora.md): the worked example
 * of Brauers, Baležentis and Baležentis (2011) is too large to transcribe, so there is no
 * golden test. These tests check the laws the method must obey: crisp input gives crisp
 * MOORA, every TFN in the trace stays valid, the ranking does not depend on the order of
 * the alternatives, and the hand-computed small example.
 */
import type { WeightVector } from '@mateo/engine';
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
  crispMatrixInput,
  smallMatrix,
  smallTfnMatrix,
  smallTfnWeights,
  smallWeights,
} from '../src/testing/inputs';
import fixture from './fixtures/brauers-2006.json';
import type { FuzzyMooraInput } from './fuzzy-moora';
import { FUZZY_MOORA_ISSUE_CODES, fuzzyMooraMethod } from './fuzzy-moora';
import { mooraMethod } from './moora';

const AUDIT = { operations: TFN_EVALUATORS, requireKnownOperations: true } as const;
const run = (value: FuzzyMooraInput, params = {}) =>
  runMethod(fuzzyMooraMethod, value, params, { verifyTrace: AUDIT });

const t = (l: number, m: number, u: number): TFN => ({ l, m, u });

describe('Fuzzy MOORA: crisp MOORA for (x, x, x) ratings', () => {
  const crisp = crispMatrixInput(fixture.input);
  const degenerate: FuzzyMooraInput = { matrix: asTfnMatrix(crisp.matrix) };
  const crispRecord = runMethod(mooraMethod, crisp);

  it('gives exactly the crisp ratio system, deviations and both rankings', () => {
    const fuzzy = run(degenerate).result;
    expect(fuzzy.ratioSystem).toEqual(crispRecord.result.ratioSystem);
    expect(fuzzy.maxDeviation).toEqual(crispRecord.result.maxDeviation);
    expect(fuzzy.ratioSystemRanking).toEqual(crispRecord.result.ratioSystemRanking);
    expect(fuzzy.referencePointRanking).toEqual(crispRecord.result.referencePointRanking);
  });

  it.each([
    ['TFN weights (w, w, w)', (w: WeightVector) => asTfnWeights(w)],
    ['crisp weights', (w: WeightVector) => w],
  ])('gives exactly the weighted crisp MOORA (%s)', (_name, convert) => {
    const weights = crispWeights(
      fixture.input.criteria.map((c) => c.id),
      [1, 2, 3, 1, 2, 3, 1],
    );
    const fuzzy = run({ ...degenerate, weights: convert(weights) });
    const expected = runMethod(mooraMethod, { ...crisp, weights });
    expect(fuzzy.result.ratioSystem).toEqual(expected.result.ratioSystem);
    expect(fuzzy.result.maxDeviation).toEqual(expected.result.maxDeviation);
  });

  it('agrees with crisp MOORA for random degenerate matrices', () => {
    const cell = fc.integer({ min: 1, max: 500 });
    fc.assert(
      fc.property(
        fc.array(fc.array(cell, { minLength: 3, maxLength: 3 }), { minLength: 2, maxLength: 6 }),
        fc.array(fc.constantFrom('benefit', 'cost'), { minLength: 3, maxLength: 3 }),
        (values, directions) => {
          const matrix = smallMatrix(values, directions);
          const expected = runMethod(mooraMethod, { matrix }).result;
          const fuzzy = run({ matrix: asTfnMatrix(matrix) }).result;
          expect(fuzzy.ratioSystem).toEqual(expected.ratioSystem);
          expect(fuzzy.maxDeviation).toEqual(expected.maxDeviation);
        },
      ),
      { seed: 20261118, numRuns: 100 },
    );
  });
});

describe('Fuzzy MOORA: valid TFNs and structure', () => {
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
        },
      ),
      { seed: 20261118, numRuns: 60 },
    );
  });

  it('computes the small example by hand', () => {
    // One benefit criterion, two alternatives: (2, 3, 4) and (4, 6, 8).
    // Norm: (√(4 + 16), √(9 + 36), √(16 + 64)) = (4.4721, 6.7082, 8.9443).
    // x̃* = (l / n_u, m / n_m, u / n_l): (2/8.9443, 3/6.7082, 4/4.4721) for the first.
    const record = run({ matrix: smallTfnMatrix([[t(2, 3, 4)], [t(4, 6, 8)]], ['benefit']) });
    const first = decodeTfn(
      record.trace.steps.find((s) => s.id === 'normalized-matrix')!.output.cells[0]![0]!.value,
    );
    expect(first.l).toBeCloseTo(2 / Math.sqrt(80), 12);
    expect(first.m).toBeCloseTo(3 / Math.sqrt(45), 12);
    expect(first.u).toBeCloseTo(4 / Math.sqrt(20), 12);
    // One benefit criterion: ỹ = x̃*, so the centroid of the larger TFN is larger.
    expect(record.result.ratioSystem[1]!).toBeGreaterThan(record.result.ratioSystem[0]!);
  });

  it('does not depend on the order of the alternatives', () => {
    const values = [
      [t(2, 3, 4), t(5, 6, 8), t(1, 2, 2)],
      [t(4, 6, 8), t(1, 2, 3), t(3, 3, 4)],
      [t(1, 2, 2), t(7, 8, 9), t(2, 4, 5)],
    ];
    const directions = ['benefit', 'cost', 'benefit'] as const;
    const base = smallTfnMatrix(values, directions);
    const order = [2, 0, 1];
    const shuffled = {
      ...base,
      alternatives: order.map((i) => base.alternatives[i]!),
      values: order.map((i) => base.values[i]!),
    };
    for (const rankBy of ['ratio-system', 'reference-point']) {
      const byId = (matrix: typeof base) =>
        Object.fromEntries(
          run({ matrix }, { rankBy }).result.ranking.map((item) => [item.alternativeId, item.rank]),
        );
      expect(byId(shuffled)).toEqual(byId(base));
    }
  });

  it('reports the selected ranking and the other one', () => {
    const matrix = smallTfnMatrix(
      [
        [t(2, 3, 4), t(1, 2, 3)],
        [t(4, 6, 8), t(5, 6, 7)],
        [t(3, 4, 5), t(2, 3, 9)],
      ],
      ['benefit', 'benefit'],
    );
    const byRatio = run({ matrix }).result;
    const byPoint = run({ matrix }, { rankBy: 'reference-point' }).result;
    expect(byRatio.scores).toEqual(byRatio.ratioSystem);
    expect(byPoint.scores).toEqual(byPoint.maxDeviation);
    expect(byPoint.ratioSystemRanking).toEqual(byRatio.ratioSystemRanking);
  });

  it('defuzzifies the ratio system with the graded mean on request', () => {
    const matrix = smallTfnMatrix([[t(1, 2, 6)], [t(2, 3, 4)]], ['benefit']);
    const centroid = run({ matrix }).result.ratioSystem;
    const graded = run({ matrix }, { defuzzification: 'graded-mean' }).result.ratioSystem;
    expect(graded[0]).not.toBeCloseTo(centroid[0]!, 6);
  });

  it('is deterministic', () => {
    const matrix = smallTfnMatrix([[t(2, 3, 4)], [t(4, 6, 8)]], ['benefit']);
    assertDeterministic(fuzzyMooraMethod, { matrix });
    assertDeterministic(fuzzyMooraMethod, { matrix }, { rankBy: 'reference-point' });
  });
});

describe('Fuzzy MOORA: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(fuzzyMooraMethod, value as FuzzyMooraInput).errors.map((issue) => issue.code);
  const matrix = smallTfnMatrix(
    [
      [t(1, 2, 3), t(2, 3, 4)],
      [t(2, 3, 4), t(1, 2, 3)],
    ],
    ['benefit', 'cost'],
  );

  it('accepts input with and without weights', () => {
    expect(codes({ matrix })).toEqual([]);
    expect(codes({ matrix, weights: smallWeights(2, 3) })).toEqual([]);
    expect(codes({ matrix, weights: smallTfnWeights(t(0.1, 0.2, 0.3), t(0.3, 0.4, 0.5)) })).toEqual(
      [],
    );
  });

  it('rejects malformed input, unsupported weights, invalid and negative TFNs', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix, weights: { numberType: 'trapezoidal', entries: [] } })).toEqual([
      FUZZY_MOORA_ISSUE_CODES.unsupportedWeights,
    ]);
    expect(codes({ matrix, weights: 5 })).toEqual(['input.malformed']);
    expect(codes({ matrix: smallTfnMatrix([[t(3, 2, 1)], [t(1, 2, 3)]], ['benefit']) })).toEqual([
      'tfn.invalid-order',
    ]);
    expect(codes({ matrix: smallTfnMatrix([[t(-1, 2, 3)], [t(1, 2, 3)]], ['benefit']) })).toEqual([
      'tfn.negative-value',
    ]);
  });

  it('rejects a criterion whose lower values are all 0 (the norm has a zero lower bound)', () => {
    const result = validateMethodRun(fuzzyMooraMethod, {
      matrix: smallTfnMatrix([[t(0, 1, 2)], [t(0, 2, 3)]], ['benefit']),
    });
    expect(result.errors).toMatchObject([
      { code: FUZZY_MOORA_ISSUE_CODES.zeroColumnNorm, location: { column: { id: 'c1' } } },
    ]);
  });
});
