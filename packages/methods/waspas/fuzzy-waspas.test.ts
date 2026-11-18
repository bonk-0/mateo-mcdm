/**
 * Fuzzy WASPAS (WASPAS-F) golden and contract tests.
 *
 * Golden source: Turskis, Zavadskas, Antucheviciene, Kosareva (2015), International Journal
 * of Computers Communications & Control 10(6), 873-888, Tables 3-8 (construction site
 * selection), read from the open-access PDF (docs/methods/waspas.md). Every printed value
 * is reproduced at two decimals, with no deviations.
 */
import {
  assertDeterministic,
  crispWeights,
  runMethod,
  validateMethodRun,
  verifyTrace,
} from '@mateo/engine';
import { TFN_EVALUATORS } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { smallCrispInput, smallTfnInput, tfnInput } from '../src/testing/inputs';
import fixture from './fixtures/turskis-2015-fuzzy.json';
import type { FuzzyWaspasInput } from './fuzzy-waspas';
import { FUZZY_WASPAS_ISSUE_CODES, fuzzyWaspasMethod } from './fuzzy-waspas';
import { waspasMethod } from './waspas';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.wsmMatrix', step: 'wsm-matrix', kind: 'matrix' },
  { fixture: 'steps.wpmMatrix', step: 'wpm-matrix', kind: 'matrix' },
  { fixture: 'steps.crispWsm', step: 'defuzzified-scores', kind: 'column', column: 'q' },
  { fixture: 'steps.crispWpm', step: 'defuzzified-scores', kind: 'column', column: 'p' },
  { fixture: 'steps.lambda', step: 'lambda', kind: 'scalar' },
  { fixture: 'result.jointCriterion', step: 'joint-criterion', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const input = (): FuzzyWaspasInput => tfnInput(fixture.input);
const run = (value: FuzzyWaspasInput = input(), params: Record<string, unknown> = {}) =>
  runMethod(fuzzyWaspasMethod, value, params, {
    verifyTrace: { operations: TFN_EVALUATORS, requireKnownOperations: true },
  });

describe('Fuzzy WASPAS: golden test (Turskis et al. 2015, Tables 3-8)', () => {
  const record = run();

  it('reproduces every printed table at two decimals', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual([]);
    // Three 4 × 8 TFN matrices, 4 Q, 4 P, λ, 4 scores, 4 ranks.
    expect(report.checked).toBe(3 * 4 * 8 * 3 + 4 + 4 + 1 + 4 + 4);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks A3 > A2 > A1 > A4 with λ = 0.49', () => {
    const order = [...record.result.ranking]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => item.alternativeId);
    expect(order).toEqual(['A3', 'A2', 'A1', 'A4']);
    expect(record.result.lambda).toBeCloseTo(0.49, 2);
    expect(record.warnings).toEqual([]);
  });

  it('has the steps of the method in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'normalized-matrix',
      'wsm-matrix',
      'wpm-matrix',
      'wsm-sums',
      'wpm-products',
      'defuzzified-scores',
      'lambda',
      'joint-criterion',
      'ranking',
    ]);
  });

  it('gives every output cell a derivation and passes the trace audit', () => {
    expect(
      verifyTrace(record.trace, { operations: TFN_EVALUATORS, requireKnownOperations: true }),
    ).toEqual([]);
    for (const step of record.trace.steps) {
      for (const row of step.output.cells) {
        for (const cell of row) expect(cell.derivation).toBeDefined();
      }
    }
  });

  it('is deterministic', () => {
    assertDeterministic(fuzzyWaspasMethod, input());
    assertDeterministic(fuzzyWaspasMethod, input(), {
      lambdaRule: 'fixed',
      defuzzification: 'graded-mean',
    });
  });
});

describe('Fuzzy WASPAS: parameters', () => {
  it('uses the graded mean instead of the centroid on request', () => {
    const centroid = run();
    const graded = run(input(), { defuzzification: 'graded-mean' });
    expect(graded.result.wsm).not.toEqual(centroid.result.wsm);
    const step = graded.trace.steps.find((s) => s.id === 'defuzzified-scores')!;
    expect(step.output.cells[0]![0]!.derivation).toMatchObject({ operation: 'tfn.graded-mean' });
  });

  it('uses a fixed λ: K = λ Q + (1 − λ) P', () => {
    const record = run(input(), { lambdaRule: 'fixed', lambda: 0.3 });
    expect(record.result.lambda).toBe(0.3);
    record.result.scores.forEach((k, i) =>
      expect(k).toBeCloseTo(0.3 * record.result.wsm[i]! + 0.7 * record.result.wpm[i]!, 12),
    );
  });

  it('has no optimal λ rule', () => {
    expect(
      validateMethodRun(fuzzyWaspasMethod, input(), { lambdaRule: 'optimal' } as unknown as {
        lambdaRule: 'pooled';
      }).errors.map((e) => e.code),
    ).toEqual(['parameter.invalid-option']);
  });
});

describe('Fuzzy WASPAS: crisp data gives the crisp method', () => {
  const values = [
    [4, 2, 30],
    [2, 2, 10],
    [1, 1, 20],
    [3, 2, 20],
  ];
  const directions = ['benefit', 'benefit', 'cost'] as const;
  const weights = [0.5, 0.3, 0.2];
  const degenerate = smallTfnInput(
    values.map((row) => row.map((x) => [x, x, x])),
    directions,
    weights.map((w) => [w, w, w]),
  );

  it('with degenerate TFNs and pooled λ', () => {
    const fuzzy = run(degenerate);
    const classic = runMethod(waspasMethod, smallCrispInput(values, directions, weights), {
      lambdaRule: 'pooled',
    });
    fuzzy.result.scores.forEach((k, i) => expect(k).toBeCloseTo(classic.result.scores[i]!, 12));
    fuzzy.result.wsm.forEach((q, i) => expect(q).toBeCloseTo(classic.result.wsm[i]!, 12));
    fuzzy.result.wpm.forEach((p, i) => expect(p).toBeCloseTo(classic.result.wpm[i]!, 12));
    expect(fuzzy.result.lambda).toBeCloseTo(classic.result.lambda[0]!, 12);
    expect(fuzzy.result.ranking.map((r) => r.rank)).toEqual(
      classic.result.ranking.map((r) => r.rank),
    );
  });

  it('with crisp weights, which become degenerate TFNs in a step of their own', () => {
    const crisp = {
      matrix: degenerate.matrix,
      weights: crispWeights(
        degenerate.matrix.criteria.map((c) => c.id),
        weights,
      ),
    };
    const record = run(crisp);
    expect(record.trace.steps.map((s) => s.id).slice(0, 3)).toEqual([
      'initial-matrix',
      'weights',
      'fuzzy-weights',
    ]);
    const fuzzy = run(degenerate);
    record.result.scores.forEach((k, i) => expect(k).toBeCloseTo(fuzzy.result.scores[i]!, 12));
    expect(record.warnings).toEqual([]);
  });

  it('normalizes crisp weights on request', () => {
    const crisp = {
      matrix: degenerate.matrix,
      weights: crispWeights(
        degenerate.matrix.criteria.map((c) => c.id),
        weights.map((w) => w * 5),
      ),
    };
    const record = run(crisp, { normalizeWeights: true });
    expect(record.trace.steps.map((s) => s.id).slice(0, 4)).toEqual([
      'initial-matrix',
      'weights',
      'normalized-weights',
      'fuzzy-weights',
    ]);
    const fuzzy = run(degenerate);
    record.result.scores.forEach((k, i) => expect(k).toBeCloseTo(fuzzy.result.scores[i]!, 12));
  });
});

describe('Fuzzy WASPAS: properties', () => {
  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [3, 1, 0, 2];
    const shuffled: FuzzyWaspasInput = {
      weights: base.weights,
      matrix: {
        criteria: base.matrix.criteria,
        alternatives: order.map((i) => base.matrix.alternatives[i]!),
        values: order.map((i) => base.matrix.values[i]!),
      },
    };
    const byId = (record: ReturnType<typeof run>) =>
      Object.fromEntries(record.result.ranking.map((item) => [item.alternativeId, item.rank]));
    expect(byId(run(shuffled))).toEqual(byId(run(base)));
    expect(run(shuffled).result.lambda).toBeCloseTo(run(base).result.lambda, 12);
  });

  it('keeps l ≤ m ≤ u in every fuzzy step, cost criteria included', () => {
    const mixed = smallTfnInput(
      [
        [
          [2, 3, 4],
          [10, 12, 15],
        ],
        [
          [1, 2, 6],
          [8, 9, 20],
        ],
        [
          [3, 3, 3],
          [5, 7, 9],
        ],
      ],
      ['benefit', 'cost'],
      [
        [0.2, 0.3, 0.5],
        [0.3, 0.4, 0.5],
      ],
    );
    const record = run(mixed);
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
  });

  it('ranks identical alternatives equally (competition ranking)', () => {
    const t = (l: number, m: number, u: number) => [l, m, u];
    const ranks = run(
      smallTfnInput(
        [
          [t(5, 6, 7), t(2, 3, 4)],
          [t(3, 4, 5), t(4, 5, 6)],
          [t(5, 6, 7), t(2, 3, 4)],
          [t(1, 2, 3), t(8, 9, 10)],
        ],
        ['benefit', 'cost'],
        [t(0.4, 0.5, 0.6), t(0.4, 0.5, 0.6)],
      ),
    ).result.ranking.map((item) => item.rank);
    expect(ranks[0]).toBe(ranks[2]);
  });
});

describe('Fuzzy WASPAS: validation', () => {
  const codes = (value: unknown, params: Record<string, unknown> = {}) =>
    validateMethodRun(fuzzyWaspasMethod, value as FuzzyWaspasInput, params).errors.map(
      (issue) => issue.code,
    );
  const t = (l: number, m: number, u: number) => [l, m, u];

  it('accepts the reference input', () => {
    expect(validateMethodRun(fuzzyWaspasMethod, input()).ok).toBe(true);
  });

  it('rejects malformed input and crisp matrices', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix: input().matrix })).toEqual(['input.malformed']);
  });

  it('rejects a cost TFN with l = 0 and a benefit criterion with u = 0 everywhere', () => {
    const cost = validateMethodRun(
      fuzzyWaspasMethod,
      smallTfnInput([[t(0, 1, 2)], [t(1, 2, 3)]], ['cost'], [t(0.5, 0.5, 0.5)]),
    );
    expect(cost.errors).toMatchObject([
      { code: FUZZY_WASPAS_ISSUE_CODES.zeroCostValue, location: { row: { id: 'a1' } } },
    ]);
    expect(
      codes(smallTfnInput([[t(0, 0, 0)], [t(0, 0, 0)]], ['benefit'], [t(0.5, 0.5, 0.5)])),
    ).toEqual([FUZZY_WASPAS_ISSUE_CODES.zeroIdealValue]);
  });

  it('rejects negative TFNs and an invalid order', () => {
    expect(
      codes(smallTfnInput([[t(-1, 1, 2)], [t(1, 2, 3)]], ['benefit'], [t(0.5, 0.5, 0.5)])),
    ).toEqual(['tfn.negative-value']);
    expect(
      codes(smallTfnInput([[t(3, 2, 1)], [t(1, 2, 3)]], ['benefit'], [t(0.5, 0.5, 0.5)])),
    ).toEqual(['tfn.invalid-order']);
  });

  it('cannot normalize TFN weights', () => {
    expect(codes(input(), { normalizeWeights: true })).toEqual([
      FUZZY_WASPAS_ISSUE_CODES.normalizeFuzzyWeights,
    ]);
  });

  it('rejects missing weights and weights of another number type', () => {
    const base = input();
    expect(
      codes({
        matrix: base.matrix,
        weights: { numberType: 'tfn', entries: base.weights.entries.slice(1) },
      }),
    ).toEqual(['weights.missing']);
    expect(
      codes({ matrix: base.matrix, weights: { numberType: 'interval', entries: [] } }),
    ).toEqual([FUZZY_WASPAS_ISSUE_CODES.unsupportedWeights]);
  });
});
