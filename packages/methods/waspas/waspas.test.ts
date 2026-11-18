/**
 * WASPAS golden and contract tests.
 *
 * Golden source: Zavadskas, Turskis, Antucheviciene, Zakarevicius (2012), Elektronika ir
 * Elektrotechnika 122(6), 3-6, Tables 1-4 (building facades, twelve criteria), with the raw
 * matrix and weights of Zavadskas et al. (2013), Table 2 (docs/methods/waspas.md). The
 * fixture lists the printed values that do not reproduce, and why, as deviations.
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput, smallCrispInput } from '../src/testing/inputs';
import fixture from './fixtures/zavadskas-2012.json';
import type { WaspasInput } from './waspas';
import { WASPAS_ISSUE_CODES, waspasMethod } from './waspas';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.wsm', step: 'wsm', kind: 'column' },
  { fixture: 'steps.wpm', step: 'wpm', kind: 'column' },
  { fixture: 'steps.optimalLambda', step: 'lambda', kind: 'column' },
  { fixture: 'result.jointCriterion', step: 'joint-criterion', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const input = (): WaspasInput => crispInput(fixture.input);
const run = (value: WaspasInput = input(), params: Record<string, unknown> = {}) =>
  runMethod(waspasMethod, value, params, { verifyTrace: { requireKnownOperations: true } });
/** The paper's setting: optimal λ with a 5 % relative error, weights as printed. */
const PAPER = { lambdaRule: 'optimal', relativeError: 0.05 } as const;

describe('WASPAS: golden test (Zavadskas et al. 2012, Tables 1-4)', () => {
  const record = run(input(), PAPER);

  it('reproduces every printed table, applying the listed deviations', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect([...report.deviationsUsed].sort()).toEqual(
      (fixture.deviations as { path: string }[]).map((d) => d.path).sort(),
    );
    // 48 normalized values, 4 WSM, 4 WPM, 4 λ, 4 scores, 4 ranks.
    expect(report.checked).toBe(48 + 4 + 4 + 4 + 4 + 4);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks a4 > a2 > a3 > a1', () => {
    const order = [...record.result.ranking]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => item.alternativeId);
    expect(order).toEqual(['a4', 'a2', 'a3', 'a1']);
  });

  it('warns that the printed weights sum to 1.0001', () => {
    expect(record.warnings.map((w) => w.code)).toEqual(['weights.not-normalized']);
  });

  it('has the steps of the method in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'normalized-matrix',
      'wsm-terms',
      'wpm-terms',
      'wsm',
      'wpm',
      'normalized-variances',
      'wsm-variance',
      'wpm-variance',
      'lambda',
      'joint-criterion',
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
    assertDeterministic(waspasMethod, input(), PAPER);
    assertDeterministic(waspasMethod, input(), { lambdaRule: 'pooled', normalizeWeights: true });
  });
});

describe('WASPAS: lambda', () => {
  // Maxima 4 and 2: x̄ = (1, 1), (1/2, 1), (1/4, 1/2) for equal weights 1/2.
  const small = smallCrispInput(
    [
      [4, 2],
      [2, 2],
      [1, 1],
    ],
    ['benefit', 'benefit'],
  );
  const half = Math.sqrt(0.5);

  it('is fixed at 0.5 by default: Q = (Q1 + Q2) / 2', () => {
    const record = run(small);
    expect(record.result.wsm).toEqual([1, 0.75, 0.375]);
    expect(record.result.wpm[0]).toBe(1);
    expect(record.result.wpm[1]).toBeCloseTo(half, 12);
    expect(record.result.wpm[2]).toBeCloseTo(half / 2, 12);
    expect(record.result.lambda).toEqual([0.5, 0.5, 0.5]);
    record.result.scores.forEach((q, i) =>
      expect(q).toBeCloseTo((record.result.wsm[i]! + record.result.wpm[i]!) / 2, 12),
    );
    const step = record.trace.steps.find((s) => s.id === 'lambda')!;
    expect(step.output.cells[0]![0]!.derivation).toMatchObject({
      kind: 'parameter',
      name: 'lambda',
    });
  });

  it('is the WSM for λ = 1 and the WPM for λ = 0', () => {
    expect(run(small, { lambda: 1 }).result.scores).toEqual(run(small).result.wsm);
    expect(run(small, { lambda: 0 }).result.scores).toEqual(run(small).result.wpm);
  });

  it('is pooled: one value, Σ Q2 / (Σ Q1 + Σ Q2)', () => {
    const record = run(small, { lambdaRule: 'pooled' });
    const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
    const expected = sum(record.result.wpm) / (sum(record.result.wsm) + sum(record.result.wpm));
    expect(record.result.lambda).toEqual([expected, expected, expected]);
    const step = record.trace.steps.find((s) => s.id === 'lambda')!;
    expect(step.output.cells).toHaveLength(1);
  });

  it('is optimal per alternative: σ²(Q2) / (σ²(Q1) + σ²(Q2)) with the relative error ε', () => {
    const epsilon = 0.1;
    const record = run(small, { lambdaRule: 'optimal', relativeError: epsilon });
    const weights = [0.5, 0.5];
    const maxima = [4, 2];
    small.matrix.values.forEach((row, i) => {
      const normalized = row.map((value, j) => value / maxima[j]!);
      const q2 = record.result.wpm[i]!;
      let v1 = 0;
      let v2 = 0;
      normalized.forEach((value, j) => {
        const variance = (epsilon * value) ** 2;
        v1 += weights[j]! ** 2 * variance;
        v2 += ((q2 * weights[j]!) / value) ** 2 * variance;
      });
      expect(record.result.lambda[i]).toBeCloseTo(v2 / (v1 + v2), 12);
    });
  });

  it('needs a relative error above 0 and a λ in [0, 1]', () => {
    for (const params of [{ relativeError: 0 }, { relativeError: 1.5 }, { lambda: 1.1 }]) {
      expect(validateMethodRun(waspasMethod, small, params).errors.map((e) => e.code)).toEqual([
        'parameter.out-of-range',
      ]);
    }
  });
});

describe('WASPAS: properties', () => {
  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [2, 0, 3, 1];
    const shuffled: WaspasInput = {
      weights: base.weights,
      matrix: {
        criteria: base.matrix.criteria,
        alternatives: order.map((i) => base.matrix.alternatives[i]!),
        values: order.map((i) => base.matrix.values[i]!),
      },
    };
    for (const params of [{}, PAPER, { lambdaRule: 'pooled' }]) {
      const byId = (record: ReturnType<typeof run>) =>
        Object.fromEntries(
          record.result.ranking.map((item) => [item.alternativeId, [item.rank, item.score]]),
        );
      const expected = byId(run(base, params));
      const actual = byId(run(shuffled, params));
      for (const [id, [rank, score]] of Object.entries(expected)) {
        expect(actual[id]![0]).toBe(rank);
        expect(actual[id]![1]).toBeCloseTo(score!, 12);
      }
    }
  });

  it('normalizes the weights on request, as an extra traced step', () => {
    const base = input();
    const scaled: WaspasInput = {
      matrix: base.matrix,
      weights: {
        numberType: 'crisp',
        entries: base.weights.entries.map((entry) => ({ ...entry, value: entry.value * 2 })),
      },
    };
    const record = run(scaled, { normalizeWeights: true });
    expect(record.warnings).toEqual([]);
    expect(record.trace.steps.map((s) => s.id).slice(0, 3)).toEqual([
      'initial-matrix',
      'weights',
      'normalized-weights',
    ]);
    // Scores equal those of weights that sum to exactly 1.
    const unit = run(base, { normalizeWeights: true });
    record.result.scores.forEach((q, i) => expect(q).toBeCloseTo(unit.result.scores[i]!, 12));
  });

  it('keeps every score between the smaller and the larger of Q1 and Q2', () => {
    const record = run();
    record.result.scores.forEach((q, i) => {
      const [low, high] = [record.result.wsm[i]!, record.result.wpm[i]!].sort((a, b) => a - b);
      expect(q).toBeGreaterThanOrEqual(low! - 1e-12);
      expect(q).toBeLessThanOrEqual(high! + 1e-12);
    });
  });

  it('never lets the weighted product exceed the weighted sum (AM-GM)', () => {
    const record = run(input(), { normalizeWeights: true });
    record.result.wpm.forEach((q2, i) =>
      expect(q2).toBeLessThanOrEqual(record.result.wsm[i]! + 1e-12),
    );
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
});

describe('WASPAS: validation', () => {
  const codes = (value: unknown, params: Record<string, unknown> = {}) =>
    validateMethodRun(waspasMethod, value as WaspasInput, params).errors.map((issue) => issue.code);

  it('accepts the reference input', () => {
    expect(validateMethodRun(waspasMethod, input(), PAPER).ok).toBe(true);
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
      waspasMethod,
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
        code: WASPAS_ISSUE_CODES.zeroCostValue,
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
    ).toEqual([WASPAS_ISSUE_CODES.zeroIdealValue]);
  });

  it('accepts a zero benefit value, except for the optimal λ (it divides by x̄)', () => {
    const value = smallCrispInput(
      [
        [0, 2],
        [3, 4],
      ],
      ['benefit', 'benefit'],
    );
    expect(codes(value)).toEqual([]);
    expect(codes(value, { lambdaRule: 'optimal' })).toEqual(['matrix.non-positive-value']);
    expect(run(value).result.wpm[0]).toBe(0);
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
