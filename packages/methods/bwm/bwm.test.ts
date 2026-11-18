/**
 * BWM golden and contract tests.
 *
 * Golden source: Rezaei (2019), BWM lecture slides 21-25, the car-buying example solved with
 * the nonlinear (Rezaei 2015) and the linear (Rezaei 2016) model (docs/methods/bwm.md).
 * The models are solved with HiGHS, as in the app.
 */
import type { LinearSolver } from '@mateo/engine';
import {
  assertDeterministic,
  MethodValidationError,
  runMethod,
  textLiteral,
  validateMethodRun,
  verifyTrace,
} from '@mateo/engine';
import { loadHighsSolver } from '@mateo/solver';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenFixture, GoldenSpec } from '../src/testing/golden';
import type { BwmInput, BwmResult } from './bwm';
import { BWM_ISSUE_CODES, bwmMethod } from './bwm';
import fixture from './fixtures/rezaei-car.json';
import { inputThreshold, localInputRatio } from './consistency';
import { BWM_OPERATIONS, bwmOperationEvaluators } from './operations';

const solver = await loadHighsSolver();
const evaluators = bwmOperationEvaluators(solver);
const audit = { requireKnownOperations: true, operations: evaluators } as const;

const criteria = (ids: readonly string[]) => ids.map((id) => ({ id, name: textLiteral(id) }));

const input = (): BwmInput => ({
  criteria: criteria(fixture.input.criteria.map((c) => c.id)),
  best: fixture.input.best,
  worst: fixture.input.worst,
  bestToOthers: fixture.input.bestToOthers,
  othersToWorst: fixture.input.othersToWorst,
});

type Model = 'nonlinear' | 'linear';
const run = (value: BwmInput, model: Model = 'nonlinear', with_: LinearSolver = solver) =>
  runMethod(bwmMethod, value, { model }, { solver: with_, verifyTrace: audit });

function nonlinear(result: BwmResult) {
  if (result.model !== 'nonlinear') throw new Error('expected the nonlinear model');
  return result;
}

const weights = (result: BwmResult) => result.weights.entries.map((e) => e.value);

/** The fixture prints the intervals per criterion; the trace has rows lower and upper. */
const transposedFixture: GoldenFixture = {
  ...fixture,
  steps: {
    ...fixture.steps,
    nonlinearIntervals: {
      ...fixture.steps.nonlinearIntervals,
      values: [0, 1].map((side) =>
        fixture.steps.nonlinearIntervals.values.map((pair) => pair[side]!),
      ),
    },
  },
};

describe('BWM: golden test, nonlinear model (Rezaei 2015, slides 21-23)', () => {
  const record = run(input());
  const specs: readonly GoldenSpec[] = [
    { fixture: 'steps.nonlinearXi', step: 'optimal-xi', kind: 'scalar' },
    { fixture: 'steps.nonlinearIntervals', step: 'weight-intervals', kind: 'matrix' },
    { fixture: 'steps.consistencyIndex', step: 'consistency-index', kind: 'scalar' },
    { fixture: 'result.nonlinearWeights', step: 'interval-centres', kind: 'row' },
    { fixture: 'result.consistencyRatio', step: 'consistency-ratio', kind: 'scalar' },
  ];

  it('reproduces ξ*, every interval bound, the centres, CI and CR', () => {
    const report = compareWithFixture(transposedFixture, record.trace, specs);
    expect(report.mismatches).toEqual([]);
    expect(report.checked).toBe(1 + 10 + 1 + 5 + 1);
  });

  it('covers every table the slides print (the linear model below covers the rest)', () => {
    expect(
      [...specs.map((spec) => spec.fixture), 'result.linearWeights', 'result.linearXi'].sort(),
    ).toEqual(fixtureTables(fixture).sort());
  });

  it('finds ξ* = 1 to within 1e-11 and reports intervals, not one optimum', () => {
    const result = nonlinear(record.result);
    expect(Math.abs(result.xi - 1)).toBeLessThan(1e-11);
    expect(result.consistencyIndex).toBeCloseTo((17 - Math.sqrt(65)) / 2, 14);
    expect(result.intervals.map((i) => i.criterionId)).toEqual([
      'quality',
      'price',
      'comfort',
      'safety',
      'style',
    ]);
    // Bounds that the slides print as fractions: 3/19, 20/81, 3/7, 36/73, 1/7, 12/73, 1/9, 3/19, 1/21, 4/73.
    const exact = [
      [3 / 19, 20 / 81],
      [3 / 7, 36 / 73],
      [1 / 7, 12 / 73],
      [1 / 9, 3 / 19],
      [1 / 21, 4 / 73],
    ];
    result.intervals.forEach((interval, j) => {
      expect(interval.lower).toBeCloseTo(exact[j]![0]!, 10);
      expect(interval.upper).toBeCloseTo(exact[j]![1]!, 10);
      expect(interval.centre).toBe((interval.lower + interval.upper) / 2);
    });
  });

  it('normalises the centres into the weight output', () => {
    const centres = nonlinear(record.result).intervals.map((i) => i.centre);
    const total = centres.reduce((a, b) => a + b, 0);
    expect(total).not.toBeCloseTo(1, 3); // the centres sum to 1.0026
    weights(record.result).forEach((w, j) => expect(w).toBeCloseTo(centres[j]! / total, 15));
    expect(Math.abs(weights(record.result).reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
  });

  it('records the model, the solver and the steps in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'best-to-others',
      'others-to-worst',
      'input-consistency',
      'input-consistency-ratio',
      'input-threshold',
      'optimal-xi',
      'weight-intervals',
      'interval-centres',
      'consistency-index',
      'consistency-ratio',
      'weights',
    ]);
    const xi = record.trace.steps[5]!;
    expect(xi.explanationParams).toEqual({ solver: `HiGHS ${solver.version}` });
    expect(xi.formulas[0]!.template).toContain(String.raw`\min \xi`);
    const node = xi.output.cells[0]![0]!.derivation;
    expect(node).toMatchObject({
      kind: 'operation',
      operation: BWM_OPERATIONS.nonlinearXi,
      options: { best: 1, worst: 4, solver: `HiGHS ${solver.version}` },
    });
  });

  it('passes the trace audit, which re-solves every optimization with the solver', () => {
    expect(verifyTrace(record.trace, audit)).toEqual([]);
    // Without the evaluators the operations are unknown to the auditor.
    const problems = verifyTrace(record.trace, { requireKnownOperations: true });
    expect(new Set(problems.map((p) => p.code))).toEqual(new Set(['unknown-operation']));
  });

  it('is deterministic', () => {
    assertDeterministic(bwmMethod, input(), { model: 'nonlinear' }, { solver });
  });
});

describe('BWM: golden test, linear model (Rezaei 2016, slide 25)', () => {
  const record = run(input(), 'linear');
  const specs: readonly GoldenSpec[] = [
    { fixture: 'result.linearWeights', step: 'weights', kind: 'row' },
    { fixture: 'result.linearXi', step: 'linear-xi', kind: 'scalar' },
  ];

  it('reproduces the weights and ξ^L*, with the slide’s errata', () => {
    const report = compareWithFixture(fixture, record.trace, specs);
    expect(report.mismatches).toEqual([]);
    expect([...report.deviationsUsed].sort()).toEqual(fixture.deviations.map((d) => d.path).sort());
    expect(report.checked).toBe(6);
  });

  it('gives ξ^L* = 4/65 and the unique optimum', () => {
    expect(record.result.model).toBe('linear');
    expect(record.result.xi).toBeCloseTo(4 / 65, 12);
    expect(weights(record.result)).toEqual(
      [16, 28, 8, 10, 3].map((k): unknown => expect.closeTo(k / 65, 12)),
    );
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'best-to-others',
      'others-to-worst',
      'input-consistency',
      'input-consistency-ratio',
      'input-threshold',
      'linear-xi',
      'weights',
    ]);
  });

  it('passes the trace audit and is deterministic', () => {
    expect(verifyTrace(record.trace, audit)).toEqual([]);
    assertDeterministic(bwmMethod, input(), { model: 'linear' }, { solver });
  });
});

describe('BWM: solver handling', () => {
  it('refuses to run without a solver, with a translated validation error', () => {
    try {
      runMethod(bwmMethod, input());
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MethodValidationError);
      expect((error as MethodValidationError).validation.errors.map((e) => e.code)).toEqual([
        'solver.unavailable',
      ]);
    }
  });

  it('turns a solver failure into a validation error, not a crash', () => {
    const broken: LinearSolver = {
      name: 'Broken',
      version: '0.0.0',
      solve: () => ({ status: 'failed' }),
    };
    for (const model of ['nonlinear', 'linear'] as const) {
      try {
        runMethod(bwmMethod, input(), { model }, { solver: broken });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(MethodValidationError);
        expect((error as MethodValidationError).validation.errors).toEqual([
          expect.objectContaining({
            code: 'solver.failed',
            params: { solver: 'Broken 0.0.0', status: 'failed' },
          }),
        ]);
      }
    }
  });

  it('flags a trace that was recorded with another solver instead of comparing it', () => {
    const record = run(input());
    const other = bwmOperationEvaluators({ ...solver, version: '0.0.0-other' });
    const problems = verifyTrace(record.trace, { requireKnownOperations: true, operations: other });
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.code === 'operation-operand')).toBe(true);
    expect(problems[0]!.message).toContain('audited with HiGHS 0.0.0-other');
  });

  it('reports operands the evaluators cannot use', () => {
    const evaluate = evaluators[BWM_OPERATIONS.linearXi]!;
    const options = { best: 0, worst: 1, solver: `HiGHS ${solver.version}` };
    expect(evaluate(['x', 1, 1, 1], options)).toMatchObject({ kind: 'operand' });
    expect(evaluate([1, 2, 3], options)).toMatchObject({ kind: 'arity' });
    const failing = bwmOperationEvaluators({ ...solver, solve: () => ({ status: 'failed' }) });
    expect(failing[BWM_OPERATIONS.linearXi]!([1, 2, 2, 1], options)).toMatchObject({
      kind: 'operand',
    });
  });
});

/** Random BWM input on 1-9, valid by construction (a_BB = a_WW = 1, shared a_BW > 1). */
const bwmInput = fc
  .integer({ min: 2, max: 7 })
  .chain((n) =>
    fc.tuple(
      fc.constant(n),
      fc.integer({ min: 0, max: n - 1 }),
      fc.integer({ min: 1, max: n - 1 }),
      fc.integer({ min: 2, max: 9 }),
      fc.array(fc.integer({ min: 1, max: 9 }), { minLength: n, maxLength: n }),
      fc.array(fc.integer({ min: 1, max: 9 }), { minLength: n, maxLength: n }),
    ),
  )
  .map(([n, b, shift, aBW, bo, ow]): BwmInput => {
    const w = (b + shift) % n;
    const ids = Array.from({ length: n }, (_, j) => `c${j}`);
    return {
      criteria: criteria(ids),
      best: ids[b]!,
      worst: ids[w]!,
      bestToOthers: bo.map((a, j) => (j === b ? 1 : j === w ? aBW : a)),
      othersToWorst: ow.map((a, j) => (j === w ? 1 : j === b ? aBW : a)),
    };
  });

const withinBestWorst = (value: BwmInput) => {
  const aBW = value.bestToOthers[value.criteria.findIndex((c) => c.id === value.worst)]!;
  return [...value.bestToOthers, ...value.othersToWorst].every((a) => a <= aBW);
};

describe('BWM: properties', () => {
  const tolerance = 1e-8;

  it('nonlinear: ξ* ≥ 0, lower ≤ upper, weights sum to 1', () => {
    fc.assert(
      fc.property(bwmInput, (value) => {
        const result = nonlinear(
          runMethod(bwmMethod, value, { model: 'nonlinear' }, { solver }).result,
        );
        expect(result.xi).toBeGreaterThanOrEqual(0);
        for (const interval of result.intervals) {
          expect(interval.lower).toBeGreaterThanOrEqual(-tolerance);
          expect(interval.lower).toBeLessThanOrEqual(interval.upper + tolerance);
        }
        expect(Math.abs(weights(result).reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
      }),
      { numRuns: 40 },
    );
  });

  it('nonlinear: CR ≤ 1 when no comparison exceeds a_BW (CI is the largest ξ* then)', () => {
    // With a comparison above a_BW the input is ordinally inconsistent (a warning) and ξ*
    // can exceed CI: for a_BW = 2 and a_jW = 5, ξ* = 0.5 > CI = 0.44.
    fc.assert(
      fc.property(bwmInput.filter(withinBestWorst), (value) => {
        const result = nonlinear(
          runMethod(bwmMethod, value, { model: 'nonlinear' }, { solver }).result,
        );
        expect(result.xi).toBeLessThanOrEqual(result.consistencyIndex + tolerance);
        expect(result.consistencyRatio).toBeLessThanOrEqual(1 + tolerance);
      }),
      { numRuns: 40 },
    );
  });

  it('linear: ξ^L* ≥ 0, every condition holds within ξ^L*, weights sum to 1', () => {
    fc.assert(
      fc.property(bwmInput, (value) => {
        const { result } = runMethod(bwmMethod, value, { model: 'linear' }, { solver });
        const w = weights(result);
        const b = value.criteria.findIndex((c) => c.id === value.best);
        const worst = value.criteria.findIndex((c) => c.id === value.worst);
        expect(result.xi).toBeGreaterThanOrEqual(-tolerance);
        w.forEach((wj, j) => {
          expect(wj).toBeGreaterThanOrEqual(-tolerance);
          expect(Math.abs(w[b]! - value.bestToOthers[j]! * wj)).toBeLessThanOrEqual(
            result.xi + tolerance,
          );
          expect(Math.abs(wj - value.othersToWorst[j]! * w[worst]!)).toBeLessThanOrEqual(
            result.xi + tolerance,
          );
        });
        expect(Math.abs(w.reduce((a, c) => a + c, 0) - 1)).toBeLessThan(1e-9);
      }),
      { numRuns: 40 },
    );
  });

  it('gives fully consistent input ξ* = 0, CR = 0 and the exact unique weights', () => {
    // a_jW = a_BW / a_Bj with a_BW = 8 and a_Bj ∈ {1, 2, 4, 8} is consistent.
    const value: BwmInput = {
      criteria: criteria(['a', 'b', 'c', 'd']),
      best: 'a',
      worst: 'd',
      bestToOthers: [1, 2, 4, 8],
      othersToWorst: [8, 4, 2, 1],
    };
    const result = nonlinear(run(value).result);
    expect(result.xi).toBe(0);
    expect(result.consistencyRatio).toBe(0);
    const expected = [8, 4, 2, 1].map((k) => k / 15);
    result.intervals.forEach((interval, j) => {
      expect(interval.lower).toBeCloseTo(expected[j]!, 9);
      expect(interval.upper).toBeCloseTo(expected[j]!, 9);
    });
    expect(run(value, 'linear').result.xi).toBeCloseTo(0, 12);
  });

  it('does not depend on the order of the criteria', () => {
    const base = input();
    const order = [3, 0, 4, 1, 2];
    const permuted: BwmInput = {
      ...base,
      criteria: order.map((j) => base.criteria[j]!),
      bestToOthers: order.map((j) => base.bestToOthers[j]!),
      othersToWorst: order.map((j) => base.othersToWorst[j]!),
    };
    for (const model of ['nonlinear', 'linear'] as const) {
      const byId = (result: BwmResult) =>
        Object.fromEntries(result.weights.entries.map((e) => [e.criterionId, e.value]));
      const a = run(permuted, model).result;
      const b = run(base, model).result;
      expect(a.xi).toBeCloseTo(b.xi, 10);
      for (const [id, value] of Object.entries(byId(b))) expect(byId(a)[id]).toBeCloseTo(value, 9);
    }
  });
});

describe('BWM: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(bwmMethod, value as BwmInput).errors.map((e) => e.code);
  const base = input();

  it('accepts the reference input, warning that it ranks comfort and safety both ways', () => {
    // a_B,comfort = 4 > a_B,safety = 3, but a_comfort,W = 4 > a_safety,W = 2.
    const validation = validateMethodRun(bwmMethod, base);
    expect(validation.ok).toBe(true);
    expect(validation.warnings.map((w) => [w.code, w.params])).toEqual([
      [BWM_ISSUE_CODES.ordinalInconsistency, { first: 'comfort', second: 'safety' }],
    ]);
  });

  it('checks the best and worst criteria', () => {
    expect(codes({ ...base, best: 'speed' })).toEqual([BWM_ISSUE_CODES.unknownCriterion]);
    expect(codes({ ...base, worst: 4 })).toEqual(['input.malformed']);
    expect(codes({ ...base, worst: 'price' })).toContain(BWM_ISSUE_CODES.bestIsWorst);
  });

  it('checks the scale, the self-comparisons and a_BW', () => {
    expect(codes({ ...base, bestToOthers: [2, 1, 4, 3, 10] })).toContain(
      BWM_ISSUE_CODES.outOfScale,
    );
    expect(codes({ ...base, othersToWorst: [4, 8, 4, 0.5, 1] })).toEqual([
      BWM_ISSUE_CODES.outOfScale,
    ]);
    expect(codes({ ...base, bestToOthers: [2, 2, 4, 3, 8] })).toEqual([
      BWM_ISSUE_CODES.selfComparison,
    ]);
    expect(codes({ ...base, othersToWorst: [4, 8, 4, 2, 2] })).toEqual([
      BWM_ISSUE_CODES.selfComparison,
    ]);
    expect(codes({ ...base, othersToWorst: [4, 7, 4, 2, 1] })).toEqual([
      BWM_ISSUE_CODES.bestWorstMismatch,
    ]);
    expect(
      codes({
        ...base,
        bestToOthers: [1, 1, 1, 1, 1],
        othersToWorst: [1, 1, 1, 1, 1],
      }),
    ).toEqual([BWM_ISSUE_CODES.bestNotPreferred]);
  });

  it('checks the structure of the vectors and the criteria', () => {
    expect(codes({ ...base, bestToOthers: [2, 1, 4] })).toEqual(['matrix.column-count-mismatch']);
    expect(codes({ ...base, othersToWorst: [4, 8, null, 2, 1] })).toEqual(['matrix.missing-value']);
    expect(codes({ ...base, bestToOthers: 'x' })).toEqual(['input.malformed']);
    expect(codes({ ...base, criteria: criteria(['price']) })).toEqual(['matrix.too-few-criteria']);
    expect(codes(null)).toEqual(['input.malformed']);
  });

  it('warns about ordinally inconsistent comparisons before running', () => {
    // Quality is less important than comfort by a_B· (3 > 2) but more by a_·W (5 > 4).
    const validation = validateMethodRun(bwmMethod, {
      ...base,
      bestToOthers: [3, 1, 2, 3, 8],
      othersToWorst: [5, 8, 4, 2, 1],
    });
    expect(validation.ok).toBe(true);
    expect(validation.warnings).toEqual([
      expect.objectContaining({
        code: BWM_ISSUE_CODES.ordinalInconsistency,
        params: { first: 'quality', second: 'comfort' },
      }),
    ]);
  });
});

describe('BWM: input-based consistency (Liang, Brunelli & Rezaei 2020)', () => {
  it('reproduces Table 3 of the paper, scales 3-9 by 3-9 criteria', () => {
    const table = [
      [0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1667],
      [0.1121, 0.1529, 0.1898, 0.2206, 0.2527, 0.2577, 0.2683],
      [0.1354, 0.1994, 0.2306, 0.2546, 0.2716, 0.2844, 0.296],
      [0.133, 0.199, 0.2643, 0.3044, 0.3144, 0.3221, 0.3262],
      [0.1294, 0.2457, 0.2819, 0.3029, 0.3144, 0.3251, 0.3403],
      [0.1309, 0.2521, 0.2958, 0.3154, 0.3408, 0.362, 0.3657],
      [0.1359, 0.2681, 0.3062, 0.3337, 0.3517, 0.362, 0.3662],
    ];
    table.forEach((row, r) =>
      row.forEach((value, c) => expect(inputThreshold(c + 3, r + 3)).toBe(value)),
    );
    // The paper's own example: five criteria on a scale of 1 to 8.
    expect(inputThreshold(5, 8)).toBe(0.2958);
    expect(inputThreshold(2, 9)).toBe(0);
    expect(inputThreshold(10, 9)).toBeNull();
    expect(inputThreshold(5, 2)).toBeNull();
    expect(inputThreshold(5, 10)).toBeNull();
  });

  it('computes CR^I for the car example: the largest local ratio decides', () => {
    // a_BW = 8: |2·4 − 8| = 0, |1·8 − 8| = 0, |4·4 − 8| = 8, |3·2 − 8| = 2, |8·1 − 8| = 0.
    const { result, trace } = run(input());
    const ic = result.inputConsistency;
    expect(ic.ratios).toEqual([0, 0, 8 / 56, 2 / 56, 0]);
    expect(ic.ratio).toBe(8 / 56);
    expect(ic.threshold).toBe(0.3062);
    expect(ic.acceptable).toBe(true);
    expect(trace.steps.find((s) => s.id === 'input-threshold')?.role).toBe('result');
  });

  it('is the same for both models and matches the direct formula', () => {
    const nl = run(input(), 'nonlinear').result.inputConsistency;
    const lin = run(input(), 'linear').result.inputConsistency;
    expect(lin).toEqual(nl);
    const bo = fixture.input.bestToOthers;
    const ow = fixture.input.othersToWorst;
    expect(nl.ratios).toEqual(bo.map((a, j) => localInputRatio(a, ow[j]!, 8)));
  });

  it('rejects comparisons above the threshold and accepts fully consistent ones', () => {
    // a_BW = 4, a_B· · a_·W = 4, 4, 2 → ratios 0, 0, 0, 2/12.
    const consistent = {
      criteria: criteria(['a', 'b', 'c', 'd']),
      best: 'a',
      worst: 'd',
      bestToOthers: [1, 2, 2, 4],
      othersToWorst: [4, 2, 2, 1],
    };
    expect(run(consistent).result.inputConsistency).toMatchObject({ ratio: 0, acceptable: true });
    // a_Bj · a_jW = 9 for c against a_BW = 4: CR^I = 5/12 = 0.4167 > 0.2681.
    const poor = { ...consistent, bestToOthers: [1, 3, 3, 4], othersToWorst: [4, 3, 3, 1] };
    const ic = run(poor).result.inputConsistency;
    expect(ic.ratio).toBeCloseTo(5 / 12, 12);
    expect(ic).toMatchObject({ threshold: 0.2681, acceptable: false });
  });

  it('uses the scale parameter for the threshold and the range check', () => {
    const at9 = runMethod(bwmMethod, input(), { scale: 9 }, { solver });
    expect(at9.result.inputConsistency.threshold).toBe(0.3062);
    const small = {
      criteria: criteria(['a', 'b', 'c']),
      best: 'a',
      worst: 'c',
      bestToOthers: [1, 2, 4],
      othersToWorst: [4, 2, 1],
    };
    const r = runMethod(bwmMethod, small, { scale: 5 }, { solver, verifyTrace: audit });
    expect(r.result.inputConsistency.threshold).toBe(0.1354);
    expect(() => runMethod(bwmMethod, input(), { scale: 5 }, { solver })).toThrow(
      MethodValidationError,
    );
  });

  it('has no verdict, and warns, for more criteria than the paper covers', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
    const big = {
      criteria: criteria(ids),
      best: 'c0',
      worst: 'c9',
      bestToOthers: ids.map((_, i) => (i === 0 ? 1 : i === 9 ? 5 : 2)),
      othersToWorst: ids.map((_, i) => (i === 9 ? 1 : i === 0 ? 5 : 2)),
    };
    const validation = validateMethodRun(bwmMethod, big, { model: 'linear' });
    expect(validation.warnings.map((w) => w.code)).toContain(BWM_ISSUE_CODES.thresholdUnavailable);
    const ic = run(big, 'linear').result.inputConsistency;
    expect(ic).toMatchObject({ threshold: null, acceptable: null });
  });
});
