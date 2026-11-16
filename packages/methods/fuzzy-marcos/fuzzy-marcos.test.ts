/**
 * Fuzzy MARCOS golden and contract tests.
 *
 * Golden source: Stanković, Stević, Das, Subotić, Pamučar (2020), A new fuzzy MARCOS method
 * for road traffic risk analysis, Mathematics 8(3), 457, doi:10.3390/math8030457. This is
 * the original paper of the method (CC BY, read from the publisher's PDF in P1.4). The
 * fixture holds the rows the paper prints (Tables 4-6 and the lists in Section 4); see
 * docs/methods/fuzzy-marcos.md for the unrounded input weights and the rank-numbering
 * deviations.
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
import type { DefuzzificationId, TFN } from '@mateo/fuzzy';
import { TFN_EVALUATORS, fromCrisp } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import marcosFixture from '../marcos/fixtures/damjanovic-2022-s1.json';
import { marcosMethod } from '../marcos/marcos';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput, tfnInput } from '../src/testing/inputs';
import fixture from './fixtures/stankovic-2020.json';
import type { FuzzyMarcosInput } from './fuzzy-marcos';
import { FUZZY_MARCOS_ISSUE_CODES, fuzzyMarcosMethod } from './fuzzy-marcos';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.weights', step: 'weights', kind: 'row' },
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.weightedMatrix', step: 'weighted-matrix', kind: 'matrix' },
  { fixture: 'steps.sums', step: 'sums', kind: 'column' },
  { fixture: 'steps.kMinus', step: 'utility-degrees', kind: 'column', column: 'k-minus' },
  { fixture: 'steps.kPlus', step: 'utility-degrees', kind: 'column', column: 'k-plus' },
  { fixture: 'steps.t', step: 'utility-degree-sums', kind: 'column' },
  { fixture: 'steps.d', step: 'max-utility-degree-sum', kind: 'scalar' },
  { fixture: 'steps.dfCrisp', step: 'max-utility-degree-sum-crisp', kind: 'scalar' },
  { fixture: 'steps.fKMinus', step: 'utility-functions', kind: 'column', column: 'f-k-minus' },
  { fixture: 'steps.fKPlus', step: 'utility-functions', kind: 'column', column: 'f-k-plus' },
  { fixture: 'steps.crispKMinus', step: 'defuzzification', kind: 'column', column: 'k-minus' },
  { fixture: 'steps.crispKPlus', step: 'defuzzification', kind: 'column', column: 'k-plus' },
  {
    fixture: 'steps.crispFKMinus',
    step: 'defuzzification',
    kind: 'column',
    column: 'f-k-minus',
  },
  { fixture: 'steps.crispFKPlus', step: 'defuzzification', kind: 'column', column: 'f-k-plus' },
  { fixture: 'steps.fK', step: 'final-utility', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
  { fixture: 'result.positionsInText', step: 'ranking', kind: 'by-id', exact: true },
];

const PARAMS = {
  defuzzification: fixture.parameters.defuzzification as DefuzzificationId,
};
const AUDIT = { operations: TFN_EVALUATORS, requireKnownOperations: true } as const;
const input = (): FuzzyMarcosInput => tfnInput(fixture.input);
const run = (value: FuzzyMarcosInput = input(), params = {}) =>
  runMethod(fuzzyMarcosMethod, value, params, { verifyTrace: AUDIT });

const t = (l: number, m: number, u: number): TFN => ({ l, m, u });

function smallInput(
  values: TFN[][],
  directions: ('benefit' | 'cost')[],
  weights: WeightVector<TFN> | WeightVector,
): FuzzyMarcosInput {
  const matrix: DecisionMatrix<TFN> = {
    alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`A${i + 1}`) })),
    criteria: directions.map((direction, j) => ({
      id: `c${j + 1}`,
      name: textLiteral(`C${j + 1}`),
      direction,
      numberType: 'tfn',
    })),
    values,
  };
  return { matrix, weights };
}

const crispW = (...values: number[]) =>
  crispWeights(
    values.map((_, j) => `c${j + 1}`),
    values,
  );
const tfnW = (...values: TFN[]): WeightVector<TFN> => ({
  numberType: 'tfn',
  entries: values.map((value, j) => ({ criterionId: `c${j + 1}`, value })),
});

describe('Fuzzy MARCOS: golden test (Stanković et al. 2020, Tables 4-6)', () => {
  const record = run(input(), PARAMS);

  it('reproduces every printed value within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    // Every documented deviation is a rank-numbering difference and is applied.
    expect([...report.deviationsUsed].sort()).toEqual(fixture.deviations.map((d) => d.path).sort());
    expect(report.checked).toBeGreaterThan(500);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks A23 first with f(K) = 1.082 and ties identical sections', () => {
    const byId = Object.fromEntries(
      record.result.ranking.map((item) => [item.alternativeId, item]),
    );
    expect(byId['A23']).toMatchObject({ rank: 1 });
    expect(byId['A23']!.score).toBeCloseTo(1.082, 3);
    expect(byId['A13']!.rank).toBe(byId['A27']!.rank);
    expect(byId['A3']!.rank).toBe(byId['A38']!.rank);
    expect(byId['A34']!.rank).toBe(38);
  });

  it('has the steps of docs/plan.md §8.3 in order, with the defuzzification step', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'extended-matrix',
      'normalized-matrix',
      'weighted-matrix',
      'sums',
      'utility-degrees',
      'utility-degree-sums',
      'max-utility-degree-sum',
      'max-utility-degree-sum-crisp',
      'utility-functions',
      'defuzzification',
      'final-utility',
      'ranking',
    ]);
  });

  it('stores fuzzy cells as triples and passes the trace audit', () => {
    expect(verifyTrace(record.trace, AUDIT)).toEqual([]);
    const ext = record.trace.steps.find((step) => step.id === 'extended-matrix')!;
    // For C4 the ideal is (7, 7, 9): the maximum is taken component-wise.
    expect(ext.output.cells.at(-1)![3]!.value).toEqual({
      type: 'tfn',
      components: { l: 7, m: 7, u: 9 },
    });
    for (const step of record.trace.steps) {
      for (const row of step.output.cells) {
        for (const cell of row) expect(cell.derivation).toBeDefined();
      }
    }
  });

  it('is deterministic', () => {
    assertDeterministic(fuzzyMarcosMethod, input(), PARAMS);
    assertDeterministic(fuzzyMarcosMethod, input(), { defuzzification: 'centroid' });
  });
});

describe('Fuzzy MARCOS: degenerate TFNs and crisp MARCOS', () => {
  // docs/methods/fuzzy-marcos.md: with (x, x, x) inputs both methods rank by S_i, so the
  // rankings agree although the f(K_i) values differ (crisp MARCOS normalises by each
  // alternative's own K⁺ + K⁻, Fuzzy MARCOS by the single df_crisp).
  const crisp = crispInput(marcosFixture.input);
  const degenerate: FuzzyMarcosInput = {
    matrix: {
      alternatives: crisp.matrix.alternatives,
      criteria: crisp.matrix.criteria.map((c) => ({ ...c, numberType: 'tfn' })),
      values: crisp.matrix.values.map((row) => row.map(fromCrisp)),
    },
    weights: {
      numberType: 'tfn',
      entries: crisp.weights.entries.map((e) => ({ ...e, value: fromCrisp(e.value) })),
    },
  };
  const crispRecord = runMethod(marcosMethod, crisp);

  it.each([
    ['TFN weights (w, w, w)', degenerate],
    ['crisp weights', { ...degenerate, weights: crisp.weights }],
  ])('agrees with crisp MARCOS on the ranking (%s)', (_name, value) => {
    const fuzzyRecord = run(value);
    expect(fuzzyRecord.result.ranking.map((item) => item.rank)).toEqual(
      crispRecord.result.ranking.map((item) => item.rank),
    );
    // ... and on every step up to the sums, which are the same numbers.
    const sums = (trace: typeof crispRecord.trace) =>
      trace.steps.find((step) => step.id === 'sums')!.output.cells.map((row) => row[0]!.value);
    const fuzzySums = sums(fuzzyRecord.trace) as unknown as { components: { m: number } }[];
    (sums(crispRecord.trace) as number[]).forEach((s, i) =>
      expect(fuzzySums[i]!.components.m).toBeCloseTo(s, 12),
    );
  });

  it('gives different f(K_i) values, as the formulation predicts', () => {
    const fuzzyScores = run(degenerate).result.scores;
    expect(fuzzyScores[0]).not.toBeCloseTo(crispRecord.result.scores[0]!, 3);
  });
});

describe('Fuzzy MARCOS: weights and parameters', () => {
  const base = smallInput(
    [
      [t(1, 2, 3), t(2, 3, 4)],
      [t(3, 4, 5), t(1, 2, 3)],
      [t(2, 2, 6), t(4, 5, 6)],
    ],
    ['benefit', 'cost'],
    tfnW(t(0.2, 0.4, 0.6), t(0.3, 0.5, 0.7)),
  );

  it('handles cost criteria with the reversed normalization of Eq. 22', () => {
    const record = run(base);
    const n = record.trace.steps.find((step) => step.id === 'normalized-matrix')!;
    // Ideal of the cost criterion is (1, 2, 3); a2 = (1, 2, 3) normalizes to (1/3, 1/2, 1).
    const cell = n.output.cells[2]![1]!.value as unknown as { components: TFN };
    expect(cell.components.l).toBeCloseTo(1 / 3, 15);
    expect(cell.components.m).toBeCloseTo(1 / 2, 15);
    expect(cell.components.u).toBeCloseTo(1, 15);
  });

  it('accepts crisp weights and warns when they do not sum to 1', () => {
    const record = run({ ...base, weights: crispW(1, 3) });
    expect(record.warnings.map((w) => w.code)).toEqual(['weights.not-normalized']);
    const normalized = run({ ...base, weights: crispW(1, 3) }, { normalizeWeights: true });
    expect(normalized.warnings).toEqual([]);
    expect(normalized.trace.steps.map((s) => s.id)).toContain('normalized-weights');
    expect(normalized.result.ranking.map((r) => r.rank)).toEqual(
      record.result.ranking.map((r) => r.rank),
    );
    // Crisp weights equal the degenerate TFN weights.
    const asTfn = run({ ...base, weights: tfnW(fromCrisp(0.25), fromCrisp(0.75)) });
    const asCrisp = run({ ...base, weights: crispW(0.25, 0.75) });
    asTfn.result.scores.forEach((s, i) => expect(asCrisp.result.scores[i]).toBeCloseTo(s, 12));
  });

  it('refuses to normalize fuzzy weights', () => {
    const result = validateMethodRun(fuzzyMarcosMethod, base, { normalizeWeights: true });
    expect(result.errors.map((e) => e.code)).toEqual([
      FUZZY_MARCOS_ISSUE_CODES.normalizeFuzzyWeights,
    ]);
  });

  it('applies the chosen defuzzification and keeps df_crisp at the graded mean', () => {
    const graded = run(base);
    const centroid = run(base, { defuzzification: 'centroid' });
    const df = (record: typeof graded) =>
      record.trace.steps.find((s) => s.id === 'max-utility-degree-sum-crisp')!.output.cells[0]![0]!
        .value;
    expect(df(centroid)).toBe(df(graded));
    const step = centroid.trace.steps.find((s) => s.id === 'defuzzification')!;
    expect(step.explanationParams).toEqual({ defuzzification: 'centroid' });
    expect(step.output.cells[0]![0]!.derivation).toMatchObject({ operation: 'tfn.centroid' });
    expect(centroid.result.scores).not.toEqual(graded.result.scores);
  });

  it('rejects an unknown defuzzification', () => {
    const result = validateMethodRun(fuzzyMarcosMethod, base, {
      defuzzification: 'mean-of-maxima' as 'centroid',
    });
    expect(result.errors.map((e) => e.code)).toEqual(['parameter.invalid-option']);
  });
});

describe('Fuzzy MARCOS: validation', () => {
  const codes = (value: unknown, params = {}) =>
    validateMethodRun(fuzzyMarcosMethod, value as FuzzyMarcosInput, params).errors.map(
      (issue) => issue.code,
    );
  const two = (a: TFN, b: TFN, c: TFN, d: TFN, directions: ('benefit' | 'cost')[]) =>
    smallInput(
      [
        [a, b],
        [c, d],
      ],
      directions,
      crispW(0.5, 0.5),
    );

  it('accepts the reference input', () => {
    expect(validateMethodRun(fuzzyMarcosMethod, input()).ok).toBe(true);
  });

  it('rejects malformed input and weights', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    const value = two(t(1, 2, 3), t(1, 2, 3), t(1, 2, 3), t(1, 2, 3), ['benefit', 'cost']);
    expect(codes({ matrix: value.matrix })).toEqual(['input.malformed']);
    expect(
      codes({ matrix: value.matrix, weights: { numberType: 'trapezoidal', entries: [] } }),
    ).toEqual([FUZZY_MARCOS_ISSUE_CODES.unsupportedWeights]);
  });

  it('rejects invalid and negative TFNs', () => {
    expect(codes(two(t(3, 2, 1), t(1, 2, 3), t(1, 2, 3), t(1, 2, 3), ['benefit', 'cost']))).toEqual(
      ['tfn.invalid-order'],
    );
    expect(
      codes(two(t(-1, 2, 3), t(1, 2, 3), t(1, 2, 3), t(1, 2, 3), ['benefit', 'cost'])),
    ).toEqual(['tfn.negative-value']);
  });

  it('rejects l = 0 in a cost criterion (zero denominator)', () => {
    const result = validateMethodRun(
      fuzzyMarcosMethod,
      two(t(1, 2, 3), t(0, 2, 3), t(1, 2, 3), t(1, 2, 3), ['benefit', 'cost']),
    );
    expect(result.errors).toMatchObject([
      {
        code: FUZZY_MARCOS_ISSUE_CODES.zeroCostValue,
        location: { row: { id: 'a1' }, column: { id: 'c2' } },
      },
    ]);
  });

  it('rejects a benefit criterion whose upper values are all zero', () => {
    const zero = t(0, 0, 0);
    expect(codes(two(t(1, 2, 3), zero, t(1, 2, 3), zero, ['benefit', 'benefit']))).toEqual([
      FUZZY_MARCOS_ISSUE_CODES.zeroIdealValue,
    ]);
  });

  it('rejects zero components in the sums of the anti-ideal and the ideal', () => {
    // The lower components of the anti-ideal and the ideal are 0 on both criteria.
    expect(
      codes(two(t(0, 1, 2), t(0, 1, 2), t(0, 2, 3), t(0, 2, 3), ['benefit', 'benefit'])),
    ).toEqual([FUZZY_MARCOS_ISSUE_CODES.zeroAntiIdealSum, FUZZY_MARCOS_ISSUE_CODES.zeroIdealSum]);
  });

  it('rejects an alternative whose sum is (0, 0, 0)', () => {
    const value = smallInput(
      [
        [t(0, 0, 0), t(1, 2, 3)],
        [t(1, 2, 3), t(1, 2, 3)],
      ],
      ['benefit', 'benefit'],
      tfnW(t(1, 1, 1), t(0, 0, 0)),
    );
    expect(codes(value)).toEqual([
      FUZZY_MARCOS_ISSUE_CODES.zeroAntiIdealSum,
      FUZZY_MARCOS_ISSUE_CODES.zeroSum,
    ]);
  });

  it('rejects alternative ids that clash with the AAI and ID rows', () => {
    const value = two(t(1, 2, 3), t(1, 2, 3), t(2, 3, 4), t(2, 3, 4), ['benefit', 'cost']);
    const matrix = {
      ...value.matrix,
      alternatives: [
        { id: 'AAI', name: textLiteral('x') },
        { id: 'ID', name: textLiteral('y') },
      ],
    };
    expect(codes({ ...value, matrix })).toEqual([
      FUZZY_MARCOS_ISSUE_CODES.reservedAlternativeId,
      FUZZY_MARCOS_ISSUE_CODES.reservedAlternativeId,
    ]);
  });

  it('reports invalid TFN weights', () => {
    const value = two(t(1, 2, 3), t(1, 2, 3), t(2, 3, 4), t(2, 3, 4), ['benefit', 'cost']);
    expect(codes({ ...value, weights: tfnW(t(0.5, 0.4, 0.6), t(0.1, 0.2, 0.3)) })).toEqual([
      'tfn.invalid-order',
    ]);
  });
});
