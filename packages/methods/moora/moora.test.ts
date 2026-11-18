/**
 * MOORA golden, property and validation tests.
 *
 * Golden source: Brauers and Zavadskas (2006), Control and Cybernetics 35(2), 445-469,
 * Section 2 and Table 1 (docs/methods/moora.md). The original method has no weights.
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispMatrixInput, smallMatrix, smallWeights } from '../src/testing/inputs';
import fixture from './fixtures/brauers-2006.json';
import type { MooraInput } from './moora';
import { MOORA_ISSUE_CODES, mooraMethod } from './moora';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.squareRoots', step: 'norms', kind: 'row' },
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.deviations', step: 'deviations', kind: 'matrix' },
  { fixture: 'result.ratioSystem', step: 'ratio-system', kind: 'column' },
  {
    fixture: 'result.ratioSystemRanking',
    step: 'ratio-system-ranking',
    kind: 'column',
    exact: true,
  },
  { fixture: 'result.maxDeviation', step: 'max-deviation', kind: 'column' },
  {
    fixture: 'result.referencePointRanking',
    step: 'reference-point-ranking',
    kind: 'column',
    exact: true,
  },
];

const input = (): MooraInput => crispMatrixInput(fixture.input);
const run = (value: MooraInput = input(), params = {}) =>
  runMethod(mooraMethod, value, params, { verifyTrace: { requireKnownOperations: true } });

describe('MOORA: golden test (Brauers and Zavadskas 2006, Table 1)', () => {
  const record = run();

  it('reproduces every printed value within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    // The maximal deviation of B is printed truncated (0.25174 for 0.25175).
    expect(report.deviationsUsed).toEqual(['result.maxDeviation.values[1]']);
    expect(report.checked).toBe(7 + 21 + 21 + 3 + 3 + 3 + 3);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks A, B, C by the ratio system and by the reference point', () => {
    expect(record.result.ratioSystemRanking).toEqual([1, 2, 3]);
    expect(record.result.referencePointRanking).toEqual([1, 2, 3]);
    expect(record.result.ratioSystem[0]).toBeCloseTo(3.16759, 5);
    expect(record.warnings).toEqual([]);
  });

  it('has the steps of the method in order, without weight steps', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'norms',
      'normalized-matrix',
      'ratio-sums',
      'ratio-system',
      'ratio-system-ranking',
      'reference-point',
      'deviations',
      'max-deviation',
      'reference-point-ranking',
    ]);
  });

  it('gives every output cell a derivation and passes the trace audit', () => {
    expect(verifyTrace(record.trace, { requireKnownOperations: true })).toEqual([]);
    for (const step of record.trace.steps) {
      for (const row of step.output.cells) {
        for (const cell of row) expect(cell.derivation).toBeDefined();
      }
    }
  });

  it('is deterministic', () => {
    assertDeterministic(mooraMethod, input());
    assertDeterministic(mooraMethod, input(), { rankBy: 'reference-point' });
  });
});

describe('MOORA: parameter rankBy', () => {
  it('reports the ratio system by default and the reference point on request', () => {
    const byRatio = run().result;
    expect(byRatio.scores).toEqual(byRatio.ratioSystem);
    expect(byRatio.ranking.map((item) => item.rank)).toEqual(byRatio.ratioSystemRanking);
    const byPoint = run(input(), { rankBy: 'reference-point' }).result;
    expect(byPoint.scores).toEqual(byPoint.maxDeviation);
    expect(byPoint.ranking.map((item) => item.rank)).toEqual(byPoint.referencePointRanking);
    // Both rankings are always in the trace and in the result.
    expect(byPoint.ratioSystem).toEqual(byRatio.ratioSystem);
  });

  it('rejects an unknown value', () => {
    const result = validateMethodRun(mooraMethod, input(), { rankBy: 'multiplicative' as never });
    expect(result.errors.map((e) => e.code)).toEqual(['parameter.invalid-option']);
  });
});

describe('MOORA: properties', () => {
  const sample = (values: number[][], directions: ('benefit' | 'cost')[], weights?: number[]) => ({
    matrix: smallMatrix(values, directions),
    ...(weights === undefined ? {} : { weights: smallWeights(...weights) }),
  });

  it('subtracts the minimised objectives from the maximised ones', () => {
    // Columns have norms 5 (3, 4) and 10 (6, 8): x* = 0.6, 0.8 and 0.6, 0.8.
    const record = run(
      sample(
        [
          [3, 6],
          [4, 8],
        ],
        ['benefit', 'cost'],
      ),
    );
    expect(record.result.ratioSystem[0]).toBeCloseTo(0.6 - 0.6, 14);
    expect(record.result.ratioSystem[1]).toBeCloseTo(0.8 - 0.8, 14);
    const record2 = run(
      sample(
        [
          [3, 8],
          [4, 6],
        ],
        ['benefit', 'cost'],
      ),
    );
    expect(record2.result.ratioSystem[0]).toBeCloseTo(0.6 - 0.8, 14);
    expect(record2.result.ratioSystem[1]).toBeCloseTo(0.8 - 0.6, 14);
  });

  it('has a deviation of 0 from the reference point exactly where an alternative is the best', () => {
    const record = run(
      sample(
        [
          [3, 6],
          [4, 8],
        ],
        ['benefit', 'benefit'],
      ),
    );
    const deviations = record.trace.steps.find((s) => s.id === 'deviations')!.output.cells;
    expect(deviations[1]!.map((cell) => cell.value)).toEqual([0, 0]);
    expect(record.result.maxDeviation[1]).toBe(0);
    expect(record.result.referencePointRanking).toEqual([2, 1]);
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [2, 0, 1];
    const shuffled: MooraInput = {
      matrix: {
        criteria: base.matrix.criteria,
        alternatives: order.map((i) => base.matrix.alternatives[i]!),
        values: order.map((i) => base.matrix.values[i]!),
      },
    };
    const byId = (record: ReturnType<typeof run>) =>
      Object.fromEntries(
        record.result.ranking.map((item) => [item.alternativeId, [item.rank, item.score]]),
      );
    const a = byId(run(shuffled));
    const b = byId(run());
    for (const id of Object.keys(b)) {
      expect(a[id]![0]).toBe(b[id]![0]);
      expect(a[id]![1]).toBeCloseTo(b[id]![1]!, 12);
    }
  });

  it('ranks identical alternatives equally, in both rankings', () => {
    const record = run(
      sample(
        [
          [5, 2],
          [3, 4],
          [5, 2],
          [1, 8],
        ],
        ['benefit', 'cost'],
      ),
    );
    expect(record.result.ratioSystemRanking[0]).toBe(record.result.ratioSystemRanking[2]);
    expect(record.result.referencePointRanking[0]).toBe(record.result.referencePointRanking[2]);
  });

  it('is invariant to a positive scale of one criterion (vector normalisation)', () => {
    const a = run(
      sample(
        [
          [3, 6],
          [4, 8],
          [5, 1],
        ],
        ['benefit', 'cost'],
      ),
    ).result;
    const b = run(
      sample(
        [
          [3, 6000],
          [4, 8000],
          [5, 1000],
        ],
        ['benefit', 'cost'],
      ),
    ).result;
    b.ratioSystem.forEach((y, i) => expect(y).toBeCloseTo(a.ratioSystem[i]!, 12));
    expect(b.referencePointRanking).toEqual(a.referencePointRanking);
  });
});

describe('MOORA: weights (optional)', () => {
  const values = [
    [3, 6],
    [4, 8],
    [5, 1],
  ];
  const unweighted = run({ matrix: smallMatrix(values, ['benefit', 'benefit']) }).result;

  it('equal weights of 1 give the unweighted result and add the weight steps', () => {
    const weighted = run({
      matrix: smallMatrix(values, ['benefit', 'benefit']),
      weights: smallWeights(1, 1),
    });
    expect(weighted.result.ratioSystem).toEqual(unweighted.ratioSystem);
    expect(weighted.trace.steps.map((s) => s.id).slice(0, 5)).toEqual([
      'initial-matrix',
      'weights',
      'norms',
      'normalized-matrix',
      'weighted-matrix',
    ]);
  });

  it('scales both measures with the weights and leaves both rankings unchanged', () => {
    const scaled = run({
      matrix: smallMatrix(values, ['benefit', 'benefit']),
      weights: smallWeights(0.3, 0.3),
    });
    scaled.result.ratioSystem.forEach((y, i) =>
      expect(y).toBeCloseTo(0.3 * unweighted.ratioSystem[i]!, 12),
    );
    expect(scaled.result.ratioSystemRanking).toEqual(unweighted.ratioSystemRanking);
    expect(scaled.result.referencePointRanking).toEqual(unweighted.referencePointRanking);
    expect(scaled.warnings).toEqual([]);
  });

  it('lets an important criterion decide', () => {
    const matrix = smallMatrix(
      [
        [10, 1],
        [1, 10],
      ],
      ['benefit', 'benefit'],
    );
    expect(run({ matrix, weights: smallWeights(0.9, 0.1) }).result.ratioSystemRanking).toEqual([
      1, 2,
    ]);
    expect(run({ matrix, weights: smallWeights(0.1, 0.9) }).result.ratioSystemRanking).toEqual([
      2, 1,
    ]);
  });
});

describe('MOORA: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(mooraMethod, value as MooraInput).errors.map((issue) => issue.code);

  it('accepts the reference input and input with weights', () => {
    expect(validateMethodRun(mooraMethod, input()).ok).toBe(true);
    expect(
      validateMethodRun(mooraMethod, {
        matrix: smallMatrix(
          [
            [1, 2],
            [3, 4],
          ],
          ['benefit', 'cost'],
        ),
        weights: smallWeights(2, 3),
      }).ok,
    ).toBe(true);
  });

  it('rejects malformed input and bad weights', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(
      codes({
        matrix: smallMatrix(
          [
            [1, 2],
            [3, 4],
          ],
          ['benefit', 'cost'],
        ),
        weights: smallWeights(1),
      }),
    ).toEqual(['weights.missing']);
  });

  it('rejects a criterion whose values are all zero', () => {
    const result = validateMethodRun(mooraMethod, {
      matrix: smallMatrix(
        [
          [0, 2],
          [0, 3],
        ],
        ['benefit', 'cost'],
      ),
    });
    expect(result.errors).toMatchObject([
      { code: MOORA_ISSUE_CODES.zeroColumnNorm, location: { column: { id: 'c1' } } },
    ]);
  });

  it('accepts negative values, which vector normalisation handles', () => {
    expect(
      validateMethodRun(mooraMethod, {
        matrix: smallMatrix(
          [
            [-1, 2],
            [3, 4],
          ],
          ['benefit', 'cost'],
        ),
      }).ok,
    ).toBe(true);
  });
});
