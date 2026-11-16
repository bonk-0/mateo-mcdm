/**
 * MARCOS golden and contract tests.
 *
 * Golden source: Damjanović, Stević, Stanimirović, Tanackov, Marinković (2022), Facta
 * Universitatis, Series: Mechanical Engineering 20(1), 177-197, Section 4, Tables 5-8
 * (scenario S1), read from the open-access copy https://core.ac.uk/download/524099176.pdf.
 * This is a substitute for the paywalled original paper (Stević et al. 2020), chosen in P1.4
 * (docs/methods/marcos.md); it is co-authored by the method's first author.
 */
import type { DecisionMatrix, WeightVector } from '@mateo/engine';
import {
  assertDeterministic,
  crispWeights,
  runMethod,
  textLiteral,
  validateMethodRun,
  verifyTrace,
} from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput } from '../src/testing/inputs';
import fixture from './fixtures/damjanovic-2022-s1.json';
import type { MarcosInput } from './marcos';
import { MARCOS_ISSUE_CODES, marcosMethod } from './marcos';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.extendedMatrix', step: 'extended-matrix', kind: 'matrix' },
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.weightedMatrix', step: 'weighted-matrix', kind: 'matrix' },
  { fixture: 'steps.sums', step: 'sums', kind: 'column' },
  { fixture: 'steps.kMinus', step: 'utility-degrees', kind: 'column', column: 'k-minus' },
  { fixture: 'steps.kPlus', step: 'utility-degrees', kind: 'column', column: 'k-plus' },
  { fixture: 'steps.fKMinus', step: 'utility-functions', kind: 'column', column: 'f-k-minus' },
  { fixture: 'steps.fKPlus', step: 'utility-functions', kind: 'column', column: 'f-k-plus' },
  { fixture: 'steps.fK', step: 'final-utility', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const input = (): MarcosInput => crispInput(fixture.input);
const run = (value: MarcosInput = input(), params = {}) =>
  runMethod(marcosMethod, value, params, { verifyTrace: { requireKnownOperations: true } });

function smallInput(values: number[][], directions: ('benefit' | 'cost')[], weights: number[]) {
  const matrix: DecisionMatrix<number> = {
    alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`A${i + 1}`) })),
    criteria: directions.map((direction, j) => ({
      id: `c${j + 1}`,
      name: textLiteral(`C${j + 1}`),
      direction,
      numberType: 'crisp',
    })),
    values,
  };
  const w: WeightVector = crispWeights(
    matrix.criteria.map((c) => c.id),
    weights,
  );
  return { matrix, weights: w };
}

describe('MARCOS: golden test (Damjanović et al. 2022, scenario S1, Tables 5-8)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual(
      (fixture.deviations as { path: string }[]).map((d) => d.path),
    );
    // 10 × 4 cells in each of three matrices, 10 sums, 5 × 8 alternative values, 8 ranks.
    expect(report.checked).toBe(3 * 40 + 10 + 5 * 8 + 8);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks 2018 first with f(K) = 0.697', () => {
    const best = record.result.ranking.find((item) => item.rank === 1);
    expect(best?.alternativeId).toBe('2018');
    expect(best?.score).toBeCloseTo(0.697, 3);
    expect(record.warnings).toEqual([]);
  });

  it('has the steps of docs/plan.md §8.3 in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'extended-matrix',
      'normalized-matrix',
      'weighted-matrix',
      'sums',
      'utility-degrees',
      'utility-functions',
      'final-utility',
      'ranking',
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
    assertDeterministic(marcosMethod, input());
    assertDeterministic(marcosMethod, input(), { normalizeWeights: true });
  });
});

describe('MARCOS: properties', () => {
  it('has the same f(K⁻) and f(K⁺) for every alternative', () => {
    const step = run().trace.steps.find((s) => s.id === 'utility-functions')!;
    const first = step.output.cells[0]!.map((cell) => cell.value as number);
    for (const row of step.output.cells) {
      row.forEach((cell, c) => expect(cell.value as number).toBeCloseTo(first[c]!, 12));
    }
  });

  it('ranks the same way as the sums S_i', () => {
    const record = run();
    const sums = record.trace.steps.find((s) => s.id === 'sums')!;
    const s = sums.output.cells.slice(1, -1).map((row) => row[0]!.value as number);
    const order = (xs: readonly number[]) => xs.map((_, i) => i).sort((a, b) => xs[b]! - xs[a]!);
    expect(order(record.result.scores)).toEqual(order(s));
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [3, 0, 7, 5, 1, 6, 2, 4];
    const shuffled: MarcosInput = {
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

  it('ranks identical alternatives equally (competition ranking)', () => {
    const value = smallInput(
      [
        [5, 2],
        [3, 4],
        [5, 2],
        [1, 8],
      ],
      ['benefit', 'cost'],
      [0.5, 0.5],
    );
    const ranks = run(value).result.ranking.map((item) => item.rank);
    expect(ranks[0]).toBe(ranks[2]);
    expect([...ranks].sort()).toEqual([1, 1, 3, 4]);
  });
});

describe('MARCOS: weights', () => {
  const scaled = (factor: number): MarcosInput => {
    const base = input();
    return {
      matrix: base.matrix,
      weights: {
        numberType: 'crisp',
        entries: base.weights.entries.map((e) => ({ ...e, value: e.value * factor })),
      },
    };
  };

  it('warns when the weights do not sum to 1 and still ranks the same', () => {
    const record = run(scaled(2));
    expect(record.warnings.map((w) => w.code)).toEqual(['weights.not-normalized']);
    expect(record.result.ranking).toEqual(
      run().result.ranking.map((item, i) => ({
        ...item,
        score: record.result.scores[i],
      })),
    );
    // K, f(K) are invariant: only S_i doubles.
    record.result.scores.forEach((score, i) =>
      expect(score).toBeCloseTo(run().result.scores[i]!, 12),
    );
  });

  it('normalizes the weights on request, as an extra traced step', () => {
    const record = run(scaled(2), { normalizeWeights: true });
    expect(record.warnings).toEqual([]);
    const ids = record.trace.steps.map((step) => step.id);
    expect(ids.slice(0, 4)).toEqual([
      'initial-matrix',
      'weights',
      'normalized-weights',
      'extended-matrix',
    ]);
    const weights = record.trace.steps.find((s) => s.id === 'normalized-weights')!;
    const values = weights.output.cells[0]!.map((cell) => cell.value as number);
    values.forEach((w, j) => expect(w).toBeCloseTo(fixture.input.weights[j]!, 12));
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
  });

  it('reports missing weights as errors', () => {
    const base = input();
    const result = validateMethodRun(marcosMethod, {
      matrix: base.matrix,
      weights: { numberType: 'crisp', entries: base.weights.entries.slice(1) },
    });
    expect(result.errors.map((e) => e.code)).toEqual(['weights.missing']);
  });
});

describe('MARCOS: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(marcosMethod, value as MarcosInput).errors.map((issue) => issue.code);

  it('accepts the reference input', () => {
    expect(validateMethodRun(marcosMethod, input()).ok).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix: input().matrix })).toEqual(['input.malformed']);
  });

  it('rejects negative values', () => {
    expect(
      codes(
        smallInput(
          [
            [1, -2],
            [3, 4],
          ],
          ['benefit', 'benefit'],
          [0.5, 0.5],
        ),
      ),
    ).toEqual(['matrix.negative-value']);
  });

  it('rejects a zero in a cost criterion (zero denominator)', () => {
    const result = validateMethodRun(
      marcosMethod,
      smallInput(
        [
          [1, 0],
          [3, 4],
        ],
        ['benefit', 'cost'],
        [0.5, 0.5],
      ),
    );
    expect(result.errors).toMatchObject([
      {
        code: MARCOS_ISSUE_CODES.zeroCostValue,
        location: { row: { id: 'a1' }, column: { id: 'c2' } },
      },
    ]);
  });

  it('rejects a benefit criterion whose values are all zero (zero ideal)', () => {
    expect(
      codes(
        smallInput(
          [
            [1, 0],
            [3, 0],
          ],
          ['benefit', 'benefit'],
          [0.5, 0.5],
        ),
      ),
    ).toEqual([MARCOS_ISSUE_CODES.zeroIdealValue]);
  });

  it('rejects an anti-ideal whose sum is zero', () => {
    expect(
      codes(
        smallInput(
          [
            [0, 1],
            [3, 0],
          ],
          ['benefit', 'benefit'],
          [0.5, 0.5],
        ),
      ),
    ).toEqual([MARCOS_ISSUE_CODES.zeroAntiIdealSum]);
  });

  it('rejects an alternative whose sum is zero', () => {
    // a1 is 0 on the only weighted criterion, so its S_i and its utility functions are 0.
    const result = validateMethodRun(
      marcosMethod,
      smallInput(
        [
          [0, 1],
          [3, 2],
        ],
        ['benefit', 'benefit'],
        [1, 0],
      ),
    );
    expect(result.errors.map((e) => [e.code, e.location?.row?.id])).toEqual([
      [MARCOS_ISSUE_CODES.zeroAntiIdealSum, undefined],
      [MARCOS_ISSUE_CODES.zeroSum, 'a1'],
    ]);
  });

  it('rejects alternative ids that clash with the AAI and AI rows', () => {
    const value = smallInput(
      [
        [1, 2],
        [3, 4],
      ],
      ['benefit', 'cost'],
      [0.5, 0.5],
    );
    const matrix = {
      ...value.matrix,
      alternatives: [
        { id: 'AAI', name: textLiteral('x') },
        { id: 'AI', name: textLiteral('y') },
      ],
    };
    expect(codes({ ...value, matrix })).toEqual([
      MARCOS_ISSUE_CODES.reservedAlternativeId,
      MARCOS_ISSUE_CODES.reservedAlternativeId,
    ]);
  });

  it('rejects TFN criteria', () => {
    const value = smallInput(
      [
        [1, 2],
        [3, 4],
      ],
      ['benefit', 'cost'],
      [0.5, 0.5],
    );
    const matrix = {
      ...value.matrix,
      criteria: value.matrix.criteria.map((c) => ({ ...c, numberType: 'tfn' })),
    };
    expect(codes({ ...value, matrix })).toContain('matrix.unsupported-number-type');
  });

  it('runs a single alternative (AAI = AI = the alternative)', () => {
    const record = run(smallInput([[2, 3]], ['benefit', 'cost'], [0.4, 0.6]));
    expect(record.result.ranking).toMatchObject([{ alternativeId: 'a1', rank: 1 }]);
  });
});
