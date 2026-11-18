/**
 * EDAS golden and contract tests.
 *
 * Golden source: Keshavarz Ghorabaee, Zavadskas, Olfat, Turskis (2015), Informatica 26(3),
 * 435-451, Tables 1-3 (47 SKUs, three criteria), read from the publisher's open-access PDF
 * (docs/methods/edas.md). Twenty printed two-decimal values are one unit too high because
 * the paper rounded twice; the fixture lists them as deviations.
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput, smallCrispInput } from '../src/testing/inputs';
import fixture from './fixtures/keshavarz-ghorabaee-2015.json';
import type { EdasInput } from './edas';
import { EDAS_ISSUE_CODES, edasMethod } from './edas';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.averageSolution', step: 'average-solution', kind: 'row' },
  { fixture: 'steps.positiveDistances', step: 'positive-distances', kind: 'matrix' },
  { fixture: 'steps.negativeDistances', step: 'negative-distances', kind: 'matrix' },
  { fixture: 'steps.weightedPositiveSums', step: 'weighted-positive-sums', kind: 'column' },
  { fixture: 'steps.normalizedPositiveSums', step: 'normalized-positive-sums', kind: 'column' },
  { fixture: 'steps.weightedNegativeSums', step: 'weighted-negative-sums', kind: 'column' },
  { fixture: 'steps.normalizedNegativeSums', step: 'normalized-negative-sums', kind: 'column' },
  { fixture: 'result.appraisalScores', step: 'appraisal-scores', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const input = (): EdasInput => crispInput(fixture.input);
const run = (value: EdasInput = input()) =>
  runMethod(edasMethod, value, {}, { verifyTrace: { requireKnownOperations: true } });

describe('EDAS: golden test (Keshavarz Ghorabaee et al. 2015, Tables 1-3)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect([...report.deviationsUsed].sort()).toEqual(
      (fixture.deviations as { path: string }[]).map((d) => d.path).sort(),
    );
    // 3 averages, 2 × 47 × 3 distances, 4 × 47 sums, 47 scores, 47 ranks.
    expect(report.checked).toBe(3 + 2 * 141 + 4 * 47 + 47 + 47);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('puts S2 first with an appraisal score of 1', () => {
    const best = record.result.ranking.find((item) => item.rank === 1);
    expect(best?.alternativeId).toBe('S2');
    expect(best?.score).toBeCloseTo(1, 12);
    expect(record.warnings).toEqual([]);
  });

  it('has the steps of the method in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'average-solution',
      'positive-distances',
      'negative-distances',
      'weighted-positive-sums',
      'weighted-negative-sums',
      'normalized-positive-sums',
      'normalized-negative-sums',
      'appraisal-scores',
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
    assertDeterministic(edasMethod, input());
  });
});

describe('EDAS: hand-checked example', () => {
  // Averages 3 and 6. a1 = (2, 8), a2 = (4, 4), a3 = (3, 6) with a cost second criterion.
  const small = smallCrispInput(
    [
      [2, 8],
      [4, 4],
      [3, 6],
    ],
    ['benefit', 'cost'],
    [0.5, 0.5],
  );

  it('computes PDA, NDA, SP, SN and AS by hand', () => {
    const record = run(small);
    const [a1, a2, a3] = record.result.scores as [number, number, number];
    // PDA: a1 (0, 0), a2 (1/3, 1/3), a3 (0, 0). NDA: a1 (1/3, 1/3), a2 (0, 0), a3 (0, 0).
    // SP = (0, 1/3, 0), SN = (1/3, 0, 0) → NSP = (0, 1, 0), NSN = (0, 1, 1).
    expect(a1).toBeCloseTo(0, 12);
    expect(a2).toBeCloseTo(1, 12);
    expect(a3).toBeCloseTo(0.5, 12);
    expect(record.result.ranking.map((item) => item.rank)).toEqual([3, 1, 2]);
  });
});

describe('EDAS: properties', () => {
  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = base.matrix.alternatives.map((_, i) => (i * 17 + 5) % 47);
    expect(new Set(order).size).toBe(47);
    const shuffled: EdasInput = {
      weights: base.weights,
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
    const expected = byId(run());
    const actual = byId(run(shuffled));
    for (const [id, [rank, score]] of Object.entries(expected)) {
      expect(actual[id]![0]).toBe(rank);
      expect(actual[id]![1]).toBeCloseTo(score!, 12);
    }
  });

  it('does not change when every weight is scaled, and does not warn', () => {
    const base = input();
    const scaled: EdasInput = {
      matrix: base.matrix,
      weights: {
        numberType: 'crisp',
        entries: base.weights.entries.map((entry) => ({ ...entry, value: entry.value * 7 })),
      },
    };
    const record = run(scaled);
    expect(record.warnings).toEqual([]);
    record.result.scores.forEach((score, i) =>
      expect(score).toBeCloseTo(run().result.scores[i]!, 12),
    );
  });

  it('keeps every score in [0, 1]', () => {
    for (const score of run().result.scores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('ranks identical alternatives equally (competition ranking)', () => {
    const value = smallCrispInput(
      [
        [5, 2],
        [3, 4],
        [5, 2],
        [1, 8],
      ],
      ['benefit', 'cost'],
    );
    const ranks = run(value).result.ranking.map((item) => item.rank);
    expect(ranks[0]).toBe(ranks[2]);
    expect([...ranks].sort()).toEqual([1, 1, 3, 4]);
  });

  it('accepts a zero weight: the criterion no longer counts', () => {
    const withZero = smallCrispInput(
      [
        [1, 9],
        [2, 1],
        [3, 5],
      ],
      ['benefit', 'benefit'],
      [1, 0],
    );
    const only = smallCrispInput([[1], [2], [3]], ['benefit'], [1]);
    expect(run(withZero).result.scores).toEqual(run(only).result.scores);
  });
});

describe('EDAS: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(edasMethod, value as EdasInput).errors.map((issue) => issue.code);

  it('accepts the reference input', () => {
    expect(validateMethodRun(edasMethod, input()).ok).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix: input().matrix })).toEqual(['input.malformed']);
  });

  it('rejects negative values', () => {
    expect(
      codes(
        smallCrispInput(
          [
            [1, -2],
            [3, 4],
          ],
          ['benefit', 'benefit'],
        ),
      ),
    ).toEqual(['matrix.negative-value']);
  });

  it('rejects a criterion whose average is zero', () => {
    const result = validateMethodRun(
      edasMethod,
      smallCrispInput(
        [
          [0, 1],
          [0, 3],
        ],
        ['benefit', 'benefit'],
      ),
    );
    expect(result.errors).toMatchObject([
      { code: EDAS_ISSUE_CODES.zeroAverage, location: { column: { id: 'c1' } } },
    ]);
  });

  it('rejects alternatives that are all alike (nothing is above or below the average)', () => {
    expect(
      codes(
        smallCrispInput(
          [
            [2, 3],
            [2, 3],
          ],
          ['benefit', 'cost'],
        ),
      ),
    ).toEqual([EDAS_ISSUE_CODES.zeroPositiveSums, EDAS_ISSUE_CODES.zeroNegativeSums]);
  });

  it('rejects missing and all-zero weights', () => {
    const base = input();
    expect(
      codes({
        matrix: base.matrix,
        weights: { numberType: 'crisp', entries: base.weights.entries.slice(1) },
      }),
    ).toEqual(['weights.missing']);
    expect(
      codes({
        matrix: base.matrix,
        weights: {
          numberType: 'crisp',
          entries: base.weights.entries.map((entry) => ({ ...entry, value: 0 })),
        },
      }),
    ).toEqual(['weights.zero-sum']);
  });
});
