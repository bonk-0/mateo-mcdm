/**
 * VIKOR golden and contract tests.
 *
 * Golden source: Opricovic and Tzeng (2008), Yugoslav Journal of Operations Research
 * 18(2), 187-203, Table 1 (hydropower planning) and Table 7 (S, R, Q and the compromise
 * solution for weight sets W1 and W5), read from the open-access PDF
 * (docs/methods/vikor.md). The printed Q needs v = (n + 1) / (2n), not 0.5.
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput, smallCrispInput } from '../src/testing/inputs';
import w1 from './fixtures/opricovic-2008-w1.json';
import w5 from './fixtures/opricovic-2008-w5.json';
import type { VikorInput } from './vikor';
import { VIKOR_ISSUE_CODES, vikorMethod } from './vikor';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.groupUtility', step: 'group-utility', kind: 'column' },
  { fixture: 'steps.individualRegret', step: 'individual-regret', kind: 'column' },
  { fixture: 'result.compromiseIndex', step: 'compromise-index', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];
/** The compromise set holds alternative ids, not numbers; it has its own test below. */
const NOT_NUMERIC = ['result.compromiseSolution'];

type Run = ReturnType<typeof run>;
const run = (value: VikorInput, params: Record<string, unknown> = {}) =>
  runMethod(vikorMethod, value, params, { verifyTrace: { requireKnownOperations: true } });
const strategy2008 = { vRule: 'opricovic-tzeng-2008' } as const;

describe.each([
  ['W1 (equal weights)', w1, ['A5']],
  ['W5 (DEA weights, three of them zero)', w5, ['A5', 'A6']],
] as const)('VIKOR: golden test, %s', (_name, fixture, compromise) => {
  const record = run(crispInput(fixture.input), strategy2008);

  it('reproduces S, R and Q and the ranking to three decimals', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual([]);
    expect(report.checked).toBe(6 + 6 + 6 + 6);
  });

  it('covers every table the paper prints', () => {
    expect([...SPECS.map((spec) => spec.fixture), ...NOT_NUMERIC].sort()).toEqual(
      fixtureTables(fixture).sort(),
    );
  });

  it('finds the compromise solution of the paper', () => {
    expect(record.result.compromise.alternativeIds).toEqual(compromise);
    expect(record.result.strategyWeight).toBeCloseTo(9 / 16, 15);
    expect(fixture.result.compromiseSolution.values).toEqual(compromise);
  });

  it('is deterministic and passes the trace audit', () => {
    expect(verifyTrace(record.trace, { requireKnownOperations: true })).toEqual([]);
    assertDeterministic(vikorMethod, crispInput(fixture.input), strategy2008);
  });
});

describe('VIKOR: trace', () => {
  it('has the steps of the method in order, with the normalized weights when asked', () => {
    const ids = (record: Run) => record.trace.steps.map((step) => step.id);
    const base = crispInput(w1.input);
    expect(ids(run(base))).toEqual([
      'initial-matrix',
      'weights',
      'normalized-weights',
      'best-worst-values',
      'weighted-distances',
      'group-utility',
      'individual-regret',
      'extremes',
      'normalized-measures',
      'strategy-weight',
      'compromise-index',
      'component-rankings',
      'advantage-threshold',
      'q-differences',
      'ranking',
    ]);
    expect(ids(run(base, { normalizeWeights: false }))).not.toContain('normalized-weights');
  });

  it('gives every output cell a derivation', () => {
    for (const step of run(crispInput(w5.input)).trace.steps) {
      for (const row of step.output.cells) {
        for (const cell of row) expect(cell.derivation).toBeDefined();
      }
    }
  });
});

describe('VIKOR: the strategy weight v', () => {
  const input = crispInput(w1.input);

  it('is 0.5 by default and records the parameter', () => {
    const record = run(input);
    expect(record.result.strategyWeight).toBe(0.5);
    const step = record.trace.steps.find((s) => s.id === 'strategy-weight')!;
    expect(step.output.cells[0]![0]!.derivation).toMatchObject({ kind: 'parameter', name: 'v' });
  });

  it('takes any value in [0, 1] and uses it', () => {
    const half = run(input).result.scores;
    const sOnly = run(input, { v: 1 }).result.scores;
    const rOnly = run(input, { v: 0 }).result.scores;
    // Q = v S^ + (1 − v) R^ is linear in v.
    half.forEach((q, i) => expect(q).toBeCloseTo((sOnly[i]! + rOnly[i]!) / 2, 12));
    expect(run(input, { v: 0.5 }).result.scores).toEqual(half);
  });

  it('is (n + 1) / (2n) with the 2008 rule, whatever v says', () => {
    const record = run(input, { ...strategy2008, v: 0.1 });
    expect(record.result.strategyWeight).toBeCloseTo(9 / 16, 15);
    const step = record.trace.steps.find((s) => s.id === 'strategy-weight')!;
    expect(step.output.cells[0]![0]!.derivation).toMatchObject({ kind: 'operation' });
  });

  it('changes the printed Q: v = 0.5 does not reproduce Table 7', () => {
    const report = compareWithFixture(w1, run(input).trace, SPECS);
    expect(report.mismatches.length).toBeGreaterThan(0);
  });

  it('rejects a value outside [0, 1]', () => {
    for (const v of [-0.1, 1.5]) {
      expect(() => run(input, { v })).toThrow();
    }
    expect(validateMethodRun(vikorMethod, input, { v: 2 }).errors.map((e) => e.code)).toEqual([
      'parameter.out-of-range',
    ]);
  });
});

describe('VIKOR: hand-checked example', () => {
  // f* = (10, 10), f⁻ = (2, 2). a1 = (10, 2), a2 = (6, 6), a3 = (2, 10), equal weights.
  // Terms: a1 (0, 1/2), a2 (1/4, 1/4), a3 (1/2, 0) → S = 1/2 for all, R = (1/2, 1/4, 1/2).
  const input = smallCrispInput(
    [
      [10, 2],
      [6, 6],
      [2, 10],
    ],
    ['benefit', 'benefit'],
  );
  const record = run(input);

  it('computes S, R and Q', () => {
    expect(record.result.groupUtility).toEqual([0.5, 0.5, 0.5]);
    expect(record.result.individualRegret).toEqual([0.5, 0.25, 0.5]);
    // S has no range: its normalized measure is 0 for everyone, so Q = (1 − v) R^.
    expect(record.result.scores).toEqual([0.5, 0, 0.5]);
    expect(record.result.ranking.map((item) => item.rank)).toEqual([2, 1, 2]);
  });

  it('accepts the advantage when the difference equals DQ exactly', () => {
    const { acceptableAdvantage, acceptableStability, alternativeIds } = record.result.compromise;
    expect(acceptableAdvantage).toEqual({ threshold: 0.5, difference: 0.5, holds: true });
    expect(acceptableStability.holds).toBe(true);
    expect(alternativeIds).toEqual(['a2']);
  });

  it('gives a cost criterion the mirrored terms', () => {
    const cost = run(
      smallCrispInput(
        [
          [2, 10],
          [6, 6],
          [10, 2],
        ],
        ['cost', 'cost'],
      ),
    );
    expect(cost.result.scores).toEqual(record.result.scores);
  });

  it('works with negative values', () => {
    const shifted = smallCrispInput(
      [
        [0, -8],
        [-4, -4],
        [-8, 0],
      ],
      ['benefit', 'benefit'],
    );
    expect(run(shifted).result.scores).toEqual(record.result.scores);
  });
});

describe('VIKOR: compromise solution', () => {
  const compromise = (values: number[][], directions: ('benefit' | 'cost')[]) =>
    run(smallCrispInput(values, directions)).result.compromise;

  it('is A(1) and A(2) when only the stability condition C2 fails', () => {
    const result = compromise(
      [
        [2, 10, 16],
        [18, 2, 4],
        [9, 8, 4],
        [13, 5, 6],
        [4, 13, 11],
      ],
      ['benefit', 'benefit', 'benefit'],
    );
    // Q = (0.500, 0.989, 1, 0.403, 0.138): a5 leads by 0.265 ≥ DQ = 0.25, but a1 has the
    // smallest S and a4 the smallest R.
    expect(result.acceptableAdvantage.holds).toBe(true);
    expect(result.acceptableStability).toEqual({
      holds: false,
      bestByGroupUtility: false,
      bestByRegret: false,
    });
    expect(result.alternativeIds).toEqual(['a5', 'a4']);
  });

  it('is every alternative within DQ of A(1) when only C1 fails', () => {
    const result = compromise(
      [
        [4, 9, 3],
        [6, 8, 2],
        [1, 8, 5],
        [9, 4, 4],
      ],
      ['benefit', 'benefit', 'cost'],
    );
    // Q = (0.318, 0, 1, 0.836): a1 is 0.318 < DQ = 1/3 above a2.
    expect(result.acceptableAdvantage.holds).toBe(false);
    expect(result.acceptableStability.holds).toBe(true);
    expect(result.alternativeIds).toEqual(['a2', 'a1']);
  });

  it('is the set within DQ of A(1) when both conditions fail', () => {
    const result = compromise(
      [
        [6, 8, 6],
        [4, 6, 9],
        [2, 9, 1],
        [9, 7, 4],
      ],
      ['benefit', 'benefit', 'cost'],
    );
    expect(result.acceptableAdvantage.holds).toBe(false);
    expect(result.acceptableStability.holds).toBe(false);
    expect(result.alternativeIds).toEqual(['a4', 'a1']);
  });

  it('is the tied alternatives when two share the first place', () => {
    const result = compromise(
      [
        [3, 3],
        [3, 3],
        [1, 1],
        [2, 2],
      ],
      ['benefit', 'benefit'],
    );
    // Q = (0, 0, 1, 1/2): a1 and a2 are equal, so a2 has no advantage over a1.
    expect(result.acceptableAdvantage).toEqual({ threshold: 1 / 3, difference: 0, holds: false });
    expect(result.alternativeIds).toEqual(['a1', 'a2']);
  });
});

describe('VIKOR: properties', () => {
  const base = () => crispInput(w5.input);

  it('does not depend on the order of the alternatives', () => {
    const order = [4, 2, 0, 5, 3, 1];
    const input = base();
    const shuffled: VikorInput = {
      weights: input.weights,
      matrix: {
        criteria: input.matrix.criteria,
        alternatives: order.map((i) => input.matrix.alternatives[i]!),
        values: order.map((i) => input.matrix.values[i]!),
      },
    };
    const byId = (record: Run) =>
      Object.fromEntries(record.result.ranking.map((item) => [item.alternativeId, item.rank]));
    expect(byId(run(shuffled))).toEqual(byId(run(input)));
    expect([...run(shuffled).result.compromise.alternativeIds].sort()).toEqual(
      [...run(input).result.compromise.alternativeIds].sort(),
    );
  });

  it('does not depend on the scale of the weights, and warns only without normalization', () => {
    const input = base();
    const scaled: VikorInput = {
      matrix: input.matrix,
      weights: {
        numberType: 'crisp',
        entries: input.weights.entries.map((entry) => ({ ...entry, value: entry.value * 3 })),
      },
    };
    const normalized = run(scaled);
    expect(normalized.warnings).toEqual([]);
    normalized.result.scores.forEach((q, i) =>
      expect(q).toBeCloseTo(run(input).result.scores[i]!, 12),
    );
    const raw = run(scaled, { normalizeWeights: false });
    expect(raw.warnings.map((w) => w.code)).toEqual(['weights.not-normalized']);
    // Q is scale-free; S and R are not.
    raw.result.scores.forEach((q, i) => expect(q).toBeCloseTo(normalized.result.scores[i]!, 12));
    expect(raw.result.groupUtility[0]).not.toBeCloseTo(normalized.result.groupUtility[0]!, 3);
  });

  it('keeps Q in [0, 1]', () => {
    const { scores } = run(base()).result;
    for (const q of scores) {
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(1);
    }
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

describe('VIKOR: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(vikorMethod, value as VikorInput).errors.map((issue) => issue.code);

  it('accepts the reference inputs', () => {
    expect(validateMethodRun(vikorMethod, crispInput(w1.input)).ok).toBe(true);
    expect(validateMethodRun(vikorMethod, crispInput(w5.input)).ok).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix: crispInput(w1.input).matrix })).toEqual(['input.malformed']);
  });

  it('needs at least two alternatives, because DQ = 1 / (J − 1)', () => {
    expect(codes(smallCrispInput([[1, 2]], ['benefit', 'benefit']))).toEqual([
      'matrix.too-few-alternatives',
    ]);
  });

  it('warns about a criterion on which every alternative is equal, and ignores it', () => {
    const result = validateMethodRun(
      vikorMethod,
      smallCrispInput(
        [
          [1, 5],
          [3, 5],
          [2, 5],
        ],
        ['benefit', 'benefit'],
      ),
    );
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toEqual(['matrix.constant-criterion']);
    const alone = run(smallCrispInput([[1], [3], [2]], ['benefit'], [0.5]), {
      normalizeWeights: true,
    });
    const record = run(
      smallCrispInput(
        [
          [1, 5],
          [3, 5],
          [2, 5],
        ],
        ['benefit', 'benefit'],
      ),
    );
    expect(record.result.scores).toEqual(alone.result.scores);
  });

  it('rejects alternatives that no S or R separates', () => {
    const result = validateMethodRun(
      vikorMethod,
      smallCrispInput(
        [
          [1, 5],
          [1, 5],
        ],
        ['benefit', 'cost'],
      ),
    );
    expect(result.errors.map((e) => e.code)).toEqual([VIKOR_ISSUE_CODES.noDiscrimination]);
  });

  it('rejects missing and all-zero weights', () => {
    const base = crispInput(w1.input);
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
