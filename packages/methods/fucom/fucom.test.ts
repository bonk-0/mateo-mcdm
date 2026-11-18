/**
 * FUCOM golden and contract tests.
 *
 * Golden source: Pamučar, Stević, Sremac (2018), Symmetry 10(9), 393, Examples 1 and 2
 * (docs/methods/fucom.md).
 */
import { assertDeterministic, runMethod, textLiteral, validateMethodRun } from '@mateo/engine';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import example1 from './fixtures/pamucar-2018-example-1.json';
import example2 from './fixtures/pamucar-2018-example-2.json';
import type { FucomInput } from './fucom';
import { FUCOM_ISSUE_CODES, fucomMethod } from './fucom';

const criteria = (ids: readonly string[]) => ids.map((id) => ({ id, name: textLiteral(id) }));

const input1 = (): FucomInput => ({
  criteria: criteria(example1.input.ranking),
  priorities: { kind: 'comparative', values: example1.input.comparativePriorities },
});
const input2 = (): FucomInput => ({
  criteria: criteria(example2.input.ranking),
  priorities: { kind: 'significance', values: example2.input.significance },
});

const run = (value: FucomInput) =>
  runMethod(fucomMethod, value, {}, { verifyTrace: { requireKnownOperations: true } });

/** Weights by criterion id, in the fixture's criteria order. */
const weightsInCriteriaOrder = (record: ReturnType<typeof run>, ids: readonly string[]) => {
  const byId = new Map(record.result.weights.entries.map((e) => [e.criterionId, e.value]));
  return ids.map((id) => byId.get(id)!);
};

/** The fixtures print the weights in criteria order; the trace is in ranking order. */
function checkWeights(fixture: typeof example1 | typeof example2, record: ReturnType<typeof run>) {
  const ids = fixture.input.criteria.map((c) => c.id);
  const decimals = fixture.precision.decimals;
  weightsInCriteriaOrder(record, ids).forEach((w, j) =>
    expect(Math.abs(w - fixture.result.weights.values[j]!)).toBeLessThanOrEqual(
      0.5 * 10 ** -decimals + 1e-9,
    ),
  );
}

describe('FUCOM: golden test, Example 1 (comparative priorities)', () => {
  const record = run(input1());
  const specs: readonly GoldenSpec[] = [
    { fixture: 'steps.transitivePriorities', step: 'transitive-priorities', kind: 'row' },
    { fixture: 'result.chi', step: 'dfc', kind: 'scalar' },
  ];

  it('reproduces the transitive priorities, the weights and χ = 0', () => {
    const report = compareWithFixture(example1, record.trace, specs);
    expect(report.mismatches).toEqual([]);
    expect(report.checked).toBe(3);
    checkWeights(example1, record);
    expect([...specs.map((s) => s.fixture), 'result.weights'].sort()).toEqual(
      fixtureTables(example1).sort(),
    );
  });

  it('gives the weights 0.315, 0.291, 0.233, 0.161', () => {
    expect(weightsInCriteriaOrder(record, ['C1', 'C2', 'C3', 'C4'])).toEqual([
      expect.closeTo(0.3147, 4),
      expect.closeTo(0.2914, 4),
      expect.closeTo(0.2331, 4),
      expect.closeTo(0.1608, 4),
    ]);
    expect(record.result.dfc).toBeLessThan(1e-12);
  });

  it('has the steps of the formulation in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'comparative-priorities',
      'transitive-priorities',
      'relative-weights',
      'weights',
      'consistency-deviations',
      'dfc',
    ]);
  });

  it('is deterministic', () => {
    assertDeterministic(fucomMethod, input1());
  });
});

describe('FUCOM: golden test, Example 2 (significance values, a tie)', () => {
  const record = run(input2());
  const specs: readonly GoldenSpec[] = [
    { fixture: 'steps.comparativePriorities', step: 'comparative-priorities', kind: 'row' },
    { fixture: 'steps.transitivePriorities', step: 'transitive-priorities', kind: 'row' },
    { fixture: 'result.chi', step: 'dfc', kind: 'scalar' },
  ];

  it('reproduces the priorities, the weights and χ = 0', () => {
    const report = compareWithFixture(example2, record.trace, specs);
    expect(report.mismatches).toEqual([]);
    expect(report.checked).toBe(8);
    checkWeights(example2, record);
    expect([...specs.map((s) => s.fixture), 'result.weights'].sort()).toEqual(
      fixtureTables(example2).sort(),
    );
  });

  it('gives tied criteria equal weights', () => {
    const [, , c3, c4] = weightsInCriteriaOrder(record, ['C1', 'C2', 'C3', 'C4', 'C5']);
    expect(c3).toBe(c4);
  });

  it('starts from the significance values', () => {
    expect(record.trace.steps.map((step) => step.id).slice(0, 2)).toEqual([
      'significance',
      'comparative-priorities',
    ]);
  });

  it('is deterministic', () => {
    assertDeterministic(fucomMethod, input2());
  });
});

describe('FUCOM: properties', () => {
  const priorities = (n: number) =>
    fc.array(fc.double({ min: 1, max: 9, noNaN: true }), { minLength: n - 1, maxLength: n - 1 });

  it('meets every condition of model (5): χ ≈ 0, weights positive and summing to 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 9 }).chain((n) => fc.tuple(fc.constant(n), priorities(n))),
        ([n, phi]) => {
          const record = run({
            criteria: criteria(Array.from({ length: n }, (_, j) => `c${j}`)),
            priorities: { kind: 'comparative', values: phi },
          });
          const w = record.result.weights.entries.map((e) => e.value);
          expect(Math.abs(w.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
          w.forEach((value, k) => {
            expect(value).toBeGreaterThan(0);
            if (k > 0) expect(Math.abs(w[k - 1]! / value - phi[k - 1]!)).toBeLessThan(1e-9);
          });
          expect(record.result.dfc).toBeLessThan(1e-9);
        },
      ),
    );
  });

  it('gives the same weights from significance values and from the priorities they imply', () => {
    const significance = [1, 1.5, 1.5, 4, 8.25];
    const fromSignificance = run({
      criteria: criteria(['a', 'b', 'c', 'd', 'e']),
      priorities: { kind: 'significance', values: significance },
    });
    const fromPriorities = run({
      criteria: criteria(['a', 'b', 'c', 'd', 'e']),
      priorities: {
        kind: 'comparative',
        values: significance.slice(1).map((value, k) => value / significance[k]!),
      },
    });
    fromSignificance.result.weights.entries.forEach((entry, j) =>
      expect(entry.value).toBeCloseTo(fromPriorities.result.weights.entries[j]!.value, 14),
    );
  });

  it('handles two criteria without a transitive condition', () => {
    const record = run({
      criteria: criteria(['a', 'b']),
      priorities: { kind: 'comparative', values: [3] },
    });
    expect(record.result.weights.entries.map((e) => e.value)).toEqual([0.75, 0.25]);
    expect(record.trace.steps.map((s) => s.id)).not.toContain('transitive-priorities');
    const deviations = record.trace.steps.find((s) => s.id === 'consistency-deviations')!;
    expect(deviations.output.rows.map((r) => r.id)).toEqual(['adjacent']);
  });
});

describe('FUCOM: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(fucomMethod, value as FucomInput).errors.map((e) => e.code);
  const withPriorities = (p: unknown) => ({ criteria: criteria(['a', 'b', 'c']), priorities: p });

  it('rejects priorities that contradict the ranking', () => {
    expect(codes(withPriorities({ kind: 'comparative', values: [1.2, 0.9] }))).toEqual([
      FUCOM_ISSUE_CODES.rankingViolated,
    ]);
    expect(codes(withPriorities({ kind: 'significance', values: [1, 3, 2] }))).toEqual([
      FUCOM_ISSUE_CODES.rankingViolated,
    ]);
  });

  it('rejects non-positive significance values', () => {
    expect(codes(withPriorities({ kind: 'significance', values: [0, 1, 2] }))).toEqual([
      'matrix.non-positive-value',
    ]);
  });

  it('rejects the wrong number of values, missing and invalid values', () => {
    expect(codes(withPriorities({ kind: 'comparative', values: [1, 2, 3] }))).toEqual([
      'matrix.column-count-mismatch',
    ]);
    expect(codes(withPriorities({ kind: 'comparative', values: [1, null] }))).toEqual([
      'matrix.missing-value',
    ]);
    expect(codes(withPriorities({ kind: 'comparative', values: [1, 'x'] }))).toEqual([
      'matrix.invalid-value',
    ]);
    expect(codes(withPriorities({ kind: 'comparative', values: 'x' }))).toEqual([
      'input.malformed',
    ]);
  });

  it('rejects an unknown kind of priorities and malformed input', () => {
    expect(codes(withPriorities({ kind: 'pairwise', values: [] }))).toEqual([
      FUCOM_ISSUE_CODES.unknownPriorityKind,
    ]);
    expect(codes(withPriorities(null))).toEqual(['input.malformed']);
    expect(codes(null)).toEqual(['input.malformed']);
    expect(codes({ criteria: 'x', priorities: {} })).toEqual(['input.malformed']);
    expect(codes({ criteria: criteria(['a']), priorities: {} })).toEqual([
      'matrix.too-few-criteria',
    ]);
    expect(codes({ criteria: criteria(['a', 'a']), priorities: {} })).toEqual([
      'matrix.duplicate-criterion',
    ]);
  });
});
