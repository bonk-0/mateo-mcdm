/**
 * SWARA and fuzzy SWARA (IMF SWARA) golden and contract tests.
 *
 * Golden sources (docs/methods/swara.md):
 * - SWARA: Keršulienė, Zavadskas, Turskis (2010), J. Bus. Econ. Manag. 11(2), 243-258, Table 1.
 * - IMF SWARA: Damjanović et al. (2022), Facta Univ. Mech. Eng. 20(1), 177-197, Table 4,
 *   scenarios S1, S2, S3 and S6 (a substitute source, chosen in P1.4).
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import { TFN_EVALUATORS } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { orderedCriteria } from '../src/testing/inputs';
import type { FuzzySwaraInput } from './fuzzy-swara';
import { FUZZY_SWARA_ISSUE_CODES, fuzzySwaraMethod } from './fuzzy-swara';
import s1 from './fixtures/imf-swara-damjanovic-2022-s1.json';
import s2 from './fixtures/imf-swara-damjanovic-2022-s2.json';
import s3 from './fixtures/imf-swara-damjanovic-2022-s3.json';
import s6 from './fixtures/imf-swara-damjanovic-2022-s6.json';
import kersuliene from './fixtures/kersuliene-2010.json';
import type { SwaraInput } from './swara';
import { SWARA_ISSUE_CODES, swaraMethod } from './swara';

const AUDIT = { verifyTrace: { requireKnownOperations: true } } as const;

const FUZZY_AUDIT = {
  operations: TFN_EVALUATORS,
  requireKnownOperations: true,
} as const;

const crit = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, name: `C${i + 1}` }));

describe('SWARA: golden test (Keršulienė et al. 2010, Table 1)', () => {
  const input: SwaraInput = {
    criteria: orderedCriteria(kersuliene.input.criteria),
    comparativeImportance: kersuliene.input.comparativeImportance,
  };
  const record = runMethod(swaraMethod, input, {}, AUDIT);
  const SPECS: readonly GoldenSpec[] = [
    { fixture: 'steps.coefficients', step: 'coefficients', kind: 'row' },
    { fixture: 'steps.recalculatedWeights', step: 'recalculated-weights', kind: 'row' },
    { fixture: 'result.weights', step: 'weights', kind: 'row' },
  ];

  it('reproduces every printed value within the printed precision', () => {
    const report = compareWithFixture(kersuliene, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.checked).toBe(18);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(kersuliene).sort());
  });

  it('has the steps of the formulation in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'comparative-importance',
      'coefficients',
      'recalculated-weights',
      'weights',
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
    assertDeterministic(swaraMethod, input);
  });

  it('has non-negative weights that sum to 1 within 1e-12, in descending order', () => {
    const weights = record.result.weights.entries.map((entry) => entry.value);
    expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
    weights.forEach((w, j) => {
      expect(w).toBeGreaterThanOrEqual(0);
      if (j > 0) expect(w).toBeLessThanOrEqual(weights[j - 1]!);
    });
  });

  it('gives equal weights when every comparative importance is 0', () => {
    const equal = runMethod(
      swaraMethod,
      { criteria: orderedCriteria(crit(4)), comparativeImportance: [null, 0, 0, 0] },
      {},
      AUDIT,
    );
    equal.result.weights.entries.forEach((entry) => expect(entry.value).toBeCloseTo(0.25, 12));
  });

  it('does not depend on the position of the criteria in the input beyond the stated order', () => {
    // Re-labelling the criteria changes nothing but the ids the weights are keyed by.
    const relabelled = runMethod(
      swaraMethod,
      {
        criteria: orderedCriteria(crit(6)),
        comparativeImportance: input.comparativeImportance,
      },
      {},
    );
    relabelled.result.weights.entries.forEach((entry, j) =>
      expect(entry.value).toBeCloseTo(record.result.weights.entries[j]!.value, 12),
    );
  });
});

describe('SWARA: validation', () => {
  const issues = (value: unknown) => validateMethodRun(swaraMethod, value as SwaraInput);
  const codes = (value: unknown) => issues(value).errors.map((issue) => issue.code);
  const base = (comparativeImportance: (number | null)[]): SwaraInput => ({
    criteria: orderedCriteria(crit(comparativeImportance.length)),
    comparativeImportance,
  });

  it('accepts the reference input', () => {
    expect(issues(base([null, 0.15, 0.04])).ok).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ criteria: [] })).toEqual(['input.malformed']);
  });

  it('rejects fewer than two criteria', () => {
    expect(codes(base([null]))).toEqual(['matrix.too-few-criteria']);
  });

  it('rejects a negative comparative importance and locates it', () => {
    expect(issues(base([null, 0.2, -0.1])).errors).toMatchObject([
      { code: SWARA_ISSUE_CODES.negativeImportance, location: { column: { id: 'c3' } } },
    ]);
  });

  it('rejects a missing or non-finite value', () => {
    expect(codes(base([null, null, 0.1]))).toEqual(['matrix.missing-value']);
    expect(codes(base([null, Number.NaN, 0.1]))).toEqual(['matrix.invalid-value']);
  });

  it('rejects a length that does not match the criteria', () => {
    expect(
      codes({ criteria: orderedCriteria(crit(3)), comparativeImportance: [null, 0.1] }),
    ).toEqual(['matrix.column-count-mismatch']);
  });

  it('rejects duplicate criteria ids', () => {
    const value = base([null, 0.1]);
    expect(codes({ ...value, criteria: [value.criteria[0], value.criteria[0]] })).toEqual([
      'matrix.duplicate-criterion',
    ]);
  });

  it('warns that a value for the first criterion is ignored', () => {
    const result = issues(base([0.3, 0.1]));
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toEqual([SWARA_ISSUE_CODES.firstImportanceIgnored]);
  });
});

describe.each([
  ['S1', s1],
  ['S2', s2],
  ['S3', s3],
  ['S6', s6],
])(
  'Fuzzy SWARA (IMF SWARA): golden test, Damjanović et al. (2022), Table 4, %s',
  (_name, fixture) => {
    const input: FuzzySwaraInput = {
      criteria: orderedCriteria(fixture.input.criteria),
      assessments: fixture.input.assessments,
    };
    const record = runMethod(fuzzySwaraMethod, input, {}, { verifyTrace: FUZZY_AUDIT });
    const SPECS: readonly GoldenSpec[] = [
      { fixture: 'steps.coefficients', step: 'coefficients', kind: 'row' },
      { fixture: 'steps.recalculatedWeights', step: 'recalculated-weights', kind: 'row' },
      { fixture: 'steps.recalculatedWeightsSum', step: 'recalculated-weights-sum', kind: 'scalar' },
      { fixture: 'steps.fuzzyWeights', step: 'fuzzy-weights', kind: 'row' },
      // The crisp weights are printed before normalization (graded mean of w̃).
      { fixture: 'result.weights', step: 'crisp-weights', kind: 'row' },
    ];

    it('reproduces every printed table within the printed precision, deviations included', () => {
      const report = compareWithFixture(fixture, record.trace, SPECS);
      expect(report.mismatches).toEqual([]);
      expect(report.deviationsUsed).toEqual(
        (fixture.deviations as { path: string }[]).map((d) => d.path),
      );
    });

    it('covers every table the paper prints', () => {
      expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
    });

    it('has normalized weights within the printed precision of the printed weights', () => {
      const printed = fixture.result.weights.values;
      record.result.weights.entries.forEach((entry, j) =>
        expect(Math.abs(entry.value - printed[j]!)).toBeLessThanOrEqual(0.005 + 1e-9),
      );
    });

    it('has non-negative weights that sum to 1 within 1e-12', () => {
      const weights = record.result.weights.entries.map((entry) => entry.value);
      weights.forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
      expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
    });

    it('returns the fuzzy weights too', () => {
      expect(record.result.fuzzyWeights.numberType).toBe('tfn');
      expect(record.result.fuzzyWeights.entries.map((e) => e.criterionId)).toEqual(
        fixture.input.criteria.map((c) => c.id),
      );
    });

    it('gives every output cell a derivation and passes the trace audit', () => {
      expect(verifyTrace(record.trace, FUZZY_AUDIT)).toEqual([]);
      for (const step of record.trace.steps) {
        for (const row of step.output.cells) {
          for (const cell of row) expect(cell.derivation).toBeDefined();
        }
      }
    });

    it('is deterministic', () => {
      assertDeterministic(fuzzySwaraMethod, input);
    });
  },
);

describe('Fuzzy SWARA: steps, parameters and scale', () => {
  const input: FuzzySwaraInput = {
    criteria: orderedCriteria(s1.input.criteria),
    assessments: s1.input.assessments,
  };

  it('has the steps of the formulation in order', () => {
    expect(runMethod(fuzzySwaraMethod, input).trace.steps.map((step) => step.id)).toEqual([
      'assessments',
      'coefficients',
      'recalculated-weights',
      'recalculated-weights-sum',
      'fuzzy-weights',
      'crisp-weights',
      'weights',
    ]);
  });

  it('reproduces the graded-mean weights of S1: 0.3089, 0.2470, 0.2470, 0.1975 before normalizing', () => {
    const crisp = runMethod(fuzzySwaraMethod, input).trace.steps.find(
      (step) => step.id === 'crisp-weights',
    )!;
    const values = crisp.output.cells[0]!.map((cell) => cell.value as number);
    [0.3089, 0.247, 0.247, 0.1975].forEach((expected, j) =>
      expect(values[j]).toBeCloseTo(expected, 4),
    );
  });

  it('accepts the centroid as defuzzification', () => {
    const record = runMethod(fuzzySwaraMethod, input, { defuzzification: 'centroid' });
    const sum = record.result.weights.entries.reduce((a, e) => a + e.value, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
  });

  it('accepts term ids and abbreviations in any case', () => {
    const record = runMethod(fuzzySwaraMethod, {
      ...input,
      assessments: [null, 'weakly-less-significant', ' es ', 'wls'],
    });
    const reference = runMethod(fuzzySwaraMethod, input);
    expect(record.result.weights).toEqual(reference.result.weights);
  });

  it('gives equal weights for "equally significant" throughout', () => {
    const record = runMethod(fuzzySwaraMethod, {
      criteria: orderedCriteria(crit(3)),
      assessments: [null, 'ES', 'ES'],
    });
    record.result.weights.entries.forEach((entry) => expect(entry.value).toBeCloseTo(1 / 3, 12));
  });

  it('takes the scale as data', () => {
    const scale = {
      id: 'tiny',
      name: { text: 'Tiny' },
      kind: 'comparison' as const,
      terms: [
        { id: 'none', label: { text: 'none' }, abbreviation: 'N', value: { l: 0, m: 0, u: 0 } },
        {
          id: 'some',
          label: { text: 'some' },
          abbreviation: 'S',
          value: { l: 0.1, m: 0.2, u: 0.3 },
        },
      ],
    };
    const record = runMethod(fuzzySwaraMethod, {
      criteria: orderedCriteria(crit(2)),
      assessments: [null, 'S'],
      scale,
    });
    expect(record.result.fuzzyWeights.entries).toHaveLength(2);
  });
});

describe('Fuzzy SWARA: validation', () => {
  const issues = (value: unknown) => validateMethodRun(fuzzySwaraMethod, value as FuzzySwaraInput);
  const codes = (value: unknown) => issues(value).errors.map((issue) => issue.code);

  it('accepts the reference input', () => {
    expect(
      issues({ criteria: orderedCriteria(s1.input.criteria), assessments: s1.input.assessments })
        .ok,
    ).toBe(true);
  });

  it('rejects malformed input and fewer than two criteria', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ criteria: orderedCriteria(crit(1)), assessments: [null] })).toEqual([
      'matrix.too-few-criteria',
    ]);
  });

  it('rejects a term that is not in the scale and names it', () => {
    const result = issues({
      criteria: orderedCriteria(crit(3)),
      assessments: [null, 'WLS', 'XYZ'],
    });
    expect(result.errors).toMatchObject([
      {
        code: FUZZY_SWARA_ISSUE_CODES.unknownTerm,
        params: { term: 'XYZ' },
        location: { column: { id: 'c3' } },
      },
    ]);
  });

  it('rejects a missing assessment', () => {
    expect(codes({ criteria: orderedCriteria(crit(3)), assessments: [null, null, 'WLS'] })).toEqual(
      ['matrix.missing-value'],
    );
  });

  it('rejects an invalid scale', () => {
    expect(
      codes({
        criteria: orderedCriteria(crit(2)),
        assessments: [null, 'S'],
        scale: { id: 'bad', terms: [] },
      }),
    ).toEqual(['input.malformed']);
  });

  it('warns that an assessment of the first criterion is ignored', () => {
    const result = issues({ criteria: orderedCriteria(crit(2)), assessments: ['WLS', 'WLS'] });
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toEqual([
      FUZZY_SWARA_ISSUE_CODES.firstAssessmentIgnored,
    ]);
  });
});
