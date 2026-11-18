/**
 * CODAS golden and contract tests.
 *
 * Golden source: Keshavarz Ghorabaee, Zavadskas, Turskis, Antucheviciene (2016), Economic
 * Computation and Economic Cybernetics Studies and Research 50(3), 25-44, Section 3.1,
 * Tables 2 and 3 (industrial robot selection), read from the institutional repository copy
 * (docs/methods/codas.md). Table 4 (the relative assessment matrix and H_i) is not in the
 * fixture: the readable copy is not antisymmetric and the typeset page could not be reached,
 * so the H_i below are recomputed values, checked against the printed ranking.
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput, smallCrispInput } from '../src/testing/inputs';
import fixture from './fixtures/keshavarz-ghorabaee-2016.json';
import type { CodasInput } from './codas';
import { CODAS_ISSUE_CODES, codasMethod } from './codas';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.weightedMatrix', step: 'weighted-matrix', kind: 'matrix' },
  { fixture: 'steps.negativeIdeal', step: 'negative-ideal', kind: 'row' },
  { fixture: 'steps.euclideanDistances', step: 'distances', kind: 'column', column: 'euclidean' },
  { fixture: 'steps.taxicabDistances', step: 'distances', kind: 'column', column: 'taxicab' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const input = (): CodasInput => crispInput(fixture.input);
const run = (value: CodasInput = input(), params: Record<string, unknown> = {}) =>
  runMethod(codasMethod, value, params, { verifyTrace: { requireKnownOperations: true } });

/** H_i recomputed with Eq. 9 and τ = 0.02 (docs/methods/codas.md); not a printed table. */
const RECOMPUTED_H = [0.5122, 1.4633, 1.0715, -0.2125, -1.8515, -1.1717, 0.1887];

describe('CODAS: golden test (Keshavarz Ghorabaee et al. 2016, Tables 2 and 3)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual([]);
    // 2 × 35 matrix values, 5 negative-ideal values, 7 E, 7 T, 7 ranks.
    expect(report.checked).toBe(70 + 5 + 7 + 7 + 7);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks the robots A2 > A3 > A1 > A7 > A4 > A6 > A5', () => {
    const order = [...record.result.ranking]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => item.alternativeId);
    expect(order).toEqual(['A2', 'A3', 'A1', 'A7', 'A4', 'A6', 'A5']);
    expect(record.warnings).toEqual([]);
  });

  it('gives the recomputed assessment scores, which reproduce the printed ranking', () => {
    record.result.scores.forEach((score, i) => expect(score).toBeCloseTo(RECOMPUTED_H[i]!, 4));
  });

  it('has the steps of the method in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'normalized-weights',
      'normalized-matrix',
      'weighted-matrix',
      'negative-ideal',
      'deviations',
      'distances',
      'threshold',
      'relative-assessment',
      'assessment-scores',
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
    assertDeterministic(codasMethod, input());
    assertDeterministic(codasMethod, input(), { tau: 0.05, normalizeWeights: false });
  });
});

describe('CODAS: hand-checked example', () => {
  // Benefit columns with maxima 2 and 4, weights 1/2: r = (1/4, 1/2), (1/2, 1/2), (1/2, 1/4),
  // ns = (1/4, 1/4), E = (1/4, √(1/8), 1/4), T = (1/4, 1/2, 1/4).
  const small = smallCrispInput(
    [
      [1, 4],
      [2, 4],
      [2, 2],
    ],
    ['benefit', 'benefit'],
  );
  const root = Math.sqrt(0.125);

  it('computes the relative assessment matrix with the threshold rule', () => {
    const record = run(small);
    const step = record.trace.steps.find((s) => s.id === 'relative-assessment')!;
    const h = step.output.cells.map((row) => row.map((cell) => cell.value as number));
    // |E_1 − E_3| = 0 < τ: no taxicab term. Elsewhere |ΔE| ≥ τ and the taxicab term counts.
    const expected = [
      [0, -root, 0],
      [root, 0, root],
      [0, -root, 0],
    ];
    h.forEach((row, i) =>
      row.forEach((value, k) => expect(value).toBeCloseTo(expected[i]![k]!, 12)),
    );
    expect(record.result.scores[1]).toBeCloseTo(2 * root, 12);
    expect(record.result.ranking.map((item) => item.rank)).toEqual([2, 1, 2]);
  });

  it('takes the Euclidean difference alone when τ is above every difference', () => {
    const record = run(small, { tau: 0.5 });
    const [a, b, c] = record.result.scores as [number, number, number];
    // H_i = Σ_k (E_i − E_k) = 3 E_i − ΣE.
    expect(b - a).toBeCloseTo(3 * (root - 0.25), 12);
    expect(a).toBeCloseTo(c, 12);
  });

  it('always adds the taxicab difference when τ is 0', () => {
    const record = run(small, { tau: 0 });
    const step = record.trace.steps.find((s) => s.id === 'relative-assessment')!;
    const h13 = step.output.cells[0]![2]!;
    expect(h13.value).toBe(0);
    expect(h13.derivation).toMatchObject({ kind: 'operation', operation: 'add' });
  });
});

describe('CODAS: properties', () => {
  it('has an antisymmetric relative assessment matrix, so the scores sum to 0', () => {
    const record = run();
    const step = record.trace.steps.find((s) => s.id === 'relative-assessment')!;
    const h = step.output.cells.map((row) => row.map((cell) => cell.value as number));
    h.forEach((row, i) => row.forEach((value, k) => expect(value).toBe(-h[k]![i]! + 0)));
    expect(record.result.scores.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 12);
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [4, 6, 1, 3, 0, 5, 2];
    const shuffled: CodasInput = {
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

  it('normalizes the weights by default, so the scale of the weights does not matter', () => {
    const base = input();
    const scaled: CodasInput = {
      matrix: base.matrix,
      weights: {
        numberType: 'crisp',
        entries: base.weights.entries.map((entry) => ({ ...entry, value: entry.value * 4 })),
      },
    };
    const record = run(scaled);
    expect(record.warnings).toEqual([]);
    record.result.scores.forEach((score, i) =>
      expect(score).toBeCloseTo(run().result.scores[i]!, 12),
    );
  });

  it('warns and keeps the scale when normalization is off (τ then compares with other numbers)', () => {
    const base = input();
    const scaled: CodasInput = {
      matrix: base.matrix,
      weights: {
        numberType: 'crisp',
        entries: base.weights.entries.map((entry) => ({ ...entry, value: entry.value * 4 })),
      },
    };
    const record = run(scaled, { normalizeWeights: false });
    expect(record.warnings.map((w) => w.code)).toEqual(['weights.not-normalized']);
    expect(record.trace.steps.map((s) => s.id)).not.toContain('normalized-weights');
  });

  it('ranks identical alternatives equally (competition ranking)', () => {
    const ranks = run(
      smallCrispInput(
        [
          [5, 2],
          [3, 4],
          [5, 2],
          [1, 8],
        ],
        ['benefit', 'cost'],
      ),
    ).result.ranking.map((item) => item.rank);
    expect(ranks[0]).toBe(ranks[2]);
    expect([...ranks].sort()).toEqual([1, 1, 3, 4]);
  });

  it('rejects a threshold outside [0, 1]', () => {
    const result = validateMethodRun(codasMethod, input(), { tau: -0.01 });
    expect(result.errors.map((e) => e.code)).toEqual(['parameter.out-of-range']);
  });
});

describe('CODAS: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(codasMethod, value as CodasInput).errors.map((issue) => issue.code);

  it('accepts the reference input', () => {
    expect(validateMethodRun(codasMethod, input()).ok).toBe(true);
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

  it('rejects a zero in a cost criterion (zero denominator)', () => {
    const result = validateMethodRun(
      codasMethod,
      smallCrispInput(
        [
          [1, 0],
          [3, 4],
        ],
        ['benefit', 'cost'],
      ),
    );
    expect(result.errors).toMatchObject([
      {
        code: CODAS_ISSUE_CODES.zeroCostValue,
        location: { row: { id: 'a1' }, column: { id: 'c2' } },
      },
    ]);
  });

  it('rejects a benefit criterion whose values are all zero', () => {
    expect(
      codes(
        smallCrispInput(
          [
            [1, 0],
            [3, 0],
          ],
          ['benefit', 'benefit'],
        ),
      ),
    ).toEqual([CODAS_ISSUE_CODES.zeroIdealValue]);
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
