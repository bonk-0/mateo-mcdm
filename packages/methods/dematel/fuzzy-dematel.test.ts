/**
 * Fuzzy DEMATEL tests.
 *
 * Not verified against a published example (docs/methods/dematel.md): the tests are the
 * properties the P2.1 decision asks for (a crisp input gives the classical result, l ≤ m ≤ u
 * holds everywhere) plus a hand-checkable example whose expected values were computed with
 * an independent implementation (numpy, per component) of the same formulation.
 */
import { assertDeterministic, runMethod, textLiteral, validateMethodRun } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import { TFN_EVALUATORS, fromCrisp } from '@mateo/fuzzy';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { dematelMethod } from './dematel';
import type { FuzzyDematelInput } from './fuzzy-dematel';
import { fuzzyDematelMethod } from './fuzzy-dematel';
import { cfcs, dematelOperationEvaluators } from './operations';
import { DEMATEL_ISSUE_CODES } from './shared';

const AUDIT = {
  operations: { ...TFN_EVALUATORS, ...dematelOperationEvaluators },
  requireKnownOperations: true,
} as const;

const tfn = (l: number, m: number, u: number): TFN => ({ l, m, u });
const NONE = tfn(0, 0, 0);
const LOW = tfn(0, 1, 2);
const MEDIUM = tfn(1, 2, 3);
const HIGH = tfn(2, 3, 4);
const VERY_HIGH = tfn(3, 4, 4);
const NO = tfn(0, 0, 1);

const factorsOf = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `F${i + 1}`, name: textLiteral(`F${i + 1}`) }));
const make = (m: TFN[][], experts: TFN[][][] = [m]): FuzzyDematelInput => ({
  factors: factorsOf(m.length),
  relations: experts,
});
const codes = (result: { errors: readonly { code: string }[] }) => result.errors.map((e) => e.code);

/** Three factors; expected values from an independent numpy computation (see file header). */
const EXAMPLE: TFN[][] = [
  [NONE, HIGH, MEDIUM],
  [LOW, NONE, VERY_HIGH],
  [MEDIUM, NO, NONE],
];

const close = (actual: number, expected: number, digits = 10) =>
  expect(actual).toBeCloseTo(expected, digits);

describe('fuzzy DEMATEL: independent check on a 3-factor example', () => {
  const record = runMethod(fuzzyDematelMethod, make(EXAMPLE), {}, { verifyTrace: AUDIT });
  const { result } = record;

  it('normalizes with the largest upper row or column sum', () => {
    expect(result.normalizationConstant).toBe(7);
  });

  it('gives the component-wise total-relation matrix', () => {
    const t = result.fuzzyTotalRelation;
    // Entry (1, 3) of each of the l, m and u matrices.
    close(t[0]![2]!.l, 0.2757575757575757);
    close(t[0]![2]!.m, 0.674074074074074);
    close(t[0]![2]!.u, 1.8239436619718306);
    // Entry (3, 2).
    close(t[2]![1]!.l, 0.04242424242424242);
    close(t[2]![1]!.m, 0.1555555555555555);
    close(t[2]![1]!.u, 0.936619718309859);
  });

  it('gives the fuzzy D + R and D − R (D_l − R_u, D_m − R_m, D_u − R_l)', () => {
    const [f1] = result.factors;
    close(f1!.fuzzyProminence.l, 0.8636363636363634);
    close(f1!.fuzzyProminence.m, 2.511111111111111);
    close(f1!.fuzzyProminence.u, 8.204225352112672);
    close(f1!.fuzzyRelation.l, -3.0216816047801953);
    close(f1!.fuzzyRelation.m, 0.46666666666666656);
    close(f1!.fuzzyRelation.u, 4.318907383696114);
  });

  it('defuzzifies with the centroid by default and derives the weights from it', () => {
    const expected = [3.8596576089533823, 3.4836818893156916, 3.6530469009342244];
    const relation = [0.5879641485275284, 0.3764404609475032, -0.9644046094750319];
    result.factors.forEach((f, i) => {
      close(f.prominence, expected[i]!);
      close(f.relation, relation[i]!);
    });
    const weights = result.weights.entries.map((e) => e.value);
    [0.35099326895542876, 0.3168024260740863, 0.3322043049704848].forEach((w, i) =>
      close(weights[i]!, w),
    );
    expect(result.factors.map((f) => f.group)).toEqual(['cause', 'cause', 'effect']);
  });

  it('defuzzifies the total-relation matrix for the threshold of the map', () => {
    close(result.totalRelation[0]![1]!, 0.7898610518328827);
    close(result.threshold, 0.6109103555112944);
  });

  it('supports CFCS, normalizing each of D + R and D − R as a set', () => {
    const cf = runMethod(
      fuzzyDematelMethod,
      make(EXAMPLE),
      { defuzzification: 'cfcs' },
      { verifyTrace: AUDIT },
    );
    const expected = [3.3473384343560295, 3.0185822910322364, 3.1718930924023887];
    const relation = [0.45924714043696824, 0.3703034714536013, -0.8334823602167147];
    cf.result.factors.forEach((f, i) => {
      close(f.prominence, expected[i]!);
      close(f.relation, relation[i]!);
    });
  });

  it('supports the graded mean', () => {
    const gm = runMethod(
      fuzzyDematelMethod,
      make(EXAMPLE),
      { defuzzification: 'graded-mean' },
      { verifyTrace: AUDIT },
    );
    const f1 = gm.result.factors[0]!;
    close(
      f1.prominence,
      (f1.fuzzyProminence.l + 4 * f1.fuzzyProminence.m + f1.fuzzyProminence.u) / 6,
    );
  });

  it('is deterministic', () => {
    assertDeterministic(fuzzyDematelMethod, make(EXAMPLE));
  });
});

const crispArb = fc.integer({ min: 0, max: 4 });
const matrixArb = (n: number) =>
  fc
    .array(fc.array(crispArb, { minLength: n, maxLength: n }), { minLength: n, maxLength: n })
    .filter((m) => m.some((row) => row.some((x) => x > 0)));
const sizedCrisp = fc.integer({ min: 2, max: 5 }).chain((n) => matrixArb(n));

const crispInput = (m: number[][]) => ({
  factors: factorsOf(m.length),
  relations: [m],
});

describe('fuzzy DEMATEL: a crisp input gives the classical result', () => {
  it('reproduces classical DEMATEL for every defuzzification', () => {
    fc.assert(
      fc.property(sizedCrisp, fc.constantFrom('centroid', 'graded-mean'), (m, defuzzification) => {
        const classical = validateMethodRun(dematelMethod, crispInput(m));
        fc.pre(classical.ok);
        const crisp = runMethod(dematelMethod, crispInput(m));
        const fuzzy = runMethod(
          fuzzyDematelMethod,
          make(m.map((row) => row.map(fromCrisp))),
          { defuzzification },
          { verifyTrace: AUDIT },
        );
        expect(fuzzy.result.normalizationConstant).toBe(crisp.result.normalizationConstant);
        expect(fuzzy.result.totalRelation).toEqual(crisp.result.totalRelation);
        expect(fuzzy.result.threshold).toBe(crisp.result.threshold);
        expect(fuzzy.result.relations).toEqual(crisp.result.relations);
        expect(fuzzy.result.weights).toEqual(crisp.result.weights);
        fuzzy.result.factors.forEach((f, i) => {
          const c = crisp.result.factors[i]!;
          expect(f.prominence).toBe(c.prominence);
          expect(f.relation).toBe(c.relation);
          expect(f.group).toBe(c.group);
          // The fuzzy numbers are degenerate as well.
          expect(f.fuzzyProminence).toEqual(fromCrisp(c.prominence));
        });
      }),
      { numRuns: 60 },
    );
  });

  it('reproduces classical DEMATEL with CFCS up to rounding', () => {
    fc.assert(
      fc.property(sizedCrisp, (m) => {
        fc.pre(validateMethodRun(dematelMethod, crispInput(m)).ok);
        const crisp = runMethod(dematelMethod, crispInput(m));
        const fuzzy = runMethod(fuzzyDematelMethod, make(m.map((row) => row.map(fromCrisp))), {
          defuzzification: 'cfcs',
        });
        fuzzy.result.factors.forEach((f, i) => {
          expect(f.prominence).toBeCloseTo(crisp.result.factors[i]!.prominence, 9);
          expect(f.relation).toBeCloseTo(crisp.result.factors[i]!.relation, 9);
        });
      }),
      { numRuns: 40 },
    );
  });

  it('averages several crisp experts like the classical method', () => {
    const a = [
      [0, 2, 1],
      [3, 0, 4],
      [1, 1, 0],
    ];
    const b = [
      [0, 1, 4],
      [2, 0, 2],
      [3, 0, 0],
    ];
    const crisp = runMethod(dematelMethod, { factors: factorsOf(3), relations: [a, b] });
    const fuzzy = runMethod(
      fuzzyDematelMethod,
      make(
        a.map((row) => row.map(fromCrisp)),
        [a, b].map((m) => m.map((row) => row.map(fromCrisp))),
      ),
      {},
      { verifyTrace: AUDIT },
    );
    expect(fuzzy.result.totalRelation).toEqual(crisp.result.totalRelation);
  });
});

const tfnArb = fc
  .tuple(
    fc.integer({ min: 0, max: 40 }),
    fc.integer({ min: 0, max: 10 }),
    fc.integer({ min: 0, max: 10 }),
  )
  .map(([l, dm, du]) => tfn(l / 10, (l + dm) / 10, (l + dm + du) / 10));
const fuzzyMatrixArb = fc
  .integer({ min: 2, max: 5 })
  .chain((n) =>
    fc.array(fc.array(tfnArb, { minLength: n, maxLength: n }), { minLength: n, maxLength: n }),
  )
  .filter((m) => m.some((row) => row.some((x) => x.u > 0)));

describe('fuzzy DEMATEL: properties', () => {
  it('keeps l ≤ m ≤ u in every fuzzy table and passes the trace audit', () => {
    fc.assert(
      fc.property(
        fuzzyMatrixArb,
        fc.constantFrom('centroid', 'graded-mean', 'cfcs'),
        (m, defuzzification) => {
          fc.pre(validateMethodRun(fuzzyDematelMethod, make(m)).ok);
          const record = runMethod(
            fuzzyDematelMethod,
            make(m),
            { defuzzification },
            { verifyTrace: AUDIT },
          );
          let tfnCells = 0;
          for (const step of record.trace.steps) {
            for (const row of step.output.cells) {
              for (const cell of row) {
                const value = cell.value;
                if (typeof value === 'object' && value !== null) {
                  tfnCells += 1;
                  const { l, m: mid, u } = value.components as { l: number; m: number; u: number };
                  expect(l).toBeLessThanOrEqual(mid);
                  expect(mid).toBeLessThanOrEqual(u);
                }
              }
            }
          }
          expect(tfnCells).toBeGreaterThan(0);
          record.result.fuzzyTotalRelation
            .flat()
            .forEach((t) => expect(t.l).toBeGreaterThanOrEqual(-1e-12));
          const weights = record.result.weights.entries.map((e) => e.value);
          expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('brackets the crisp result: the l and u matrices bound the m matrix', () => {
    fc.assert(
      fc.property(fuzzyMatrixArb, (m) => {
        fc.pre(validateMethodRun(fuzzyDematelMethod, make(m)).ok);
        const t = runMethod(fuzzyDematelMethod, make(m)).result.fuzzyTotalRelation;
        t.flat().forEach((x) => {
          expect(x.l).toBeLessThanOrEqual(x.m + 1e-12);
          expect(x.m).toBeLessThanOrEqual(x.u + 1e-12);
        });
      }),
      { numRuns: 40 },
    );
  });

  it('uses the row-sum constant on request, from the upper components', () => {
    const record = runMethod(fuzzyDematelMethod, make(EXAMPLE), { normalization: 'max-row-sum' });
    expect(record.result.normalizationConstant).toBe(7);
    expect(record.trace.steps.map((s) => s.id)).not.toContain('column-sums');
  });

  it('averages the experts component by component', () => {
    const other = EXAMPLE.map((row) => row.map((x) => tfn(x.l, x.m, Math.min(x.u + 0.5, 4.5))));
    const group = runMethod(
      fuzzyDematelMethod,
      make(EXAMPLE, [EXAMPLE, other]),
      {},
      { verifyTrace: AUDIT },
    );
    expect(group.trace.steps.slice(0, 2).map((s) => s.id)).toEqual([
      'expert-matrices',
      'direct-relation',
    ]);
    const mean = EXAMPLE.map((row, i) =>
      row.map((x, j) => tfn(x.l, x.m, (x.u + other[i]![j]!.u) / 2)),
    );
    const single = runMethod(fuzzyDematelMethod, make(mean));
    expect(group.result.totalRelation).toEqual(single.result.totalRelation);
  });
});

describe('CFCS defuzzification', () => {
  it('returns the centre of a symmetric TFN alone', () => {
    expect(cfcs([tfn(1, 2, 3)])[0]).toBeCloseTo(2, 12);
    expect(cfcs([tfn(2, 5, 8)])[0]).toBeCloseTo(5, 12);
  });

  it('returns a crisp number unchanged, and a crisp set unchanged', () => {
    expect(cfcs([fromCrisp(3)])).toEqual([3]);
    expect(cfcs([fromCrisp(1), fromCrisp(2), fromCrisp(5)])).toEqual([
      expect.closeTo(1, 12),
      expect.closeTo(2, 12),
      expect.closeTo(5, 12),
    ]);
  });

  it('stays within the range of the set and keeps the order of ordered TFNs', () => {
    const set = [tfn(0, 1, 2), tfn(1, 2, 4), tfn(2, 4, 5)];
    const values = cfcs(set);
    values.forEach((x) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(5);
    });
    expect(values[0]).toBeLessThan(values[1]!);
    expect(values[1]).toBeLessThan(values[2]!);
  });

  it('depends on the whole set, which is why it is recorded as a set operation', () => {
    const a = cfcs([tfn(0, 1, 2), tfn(1, 2, 3)]);
    const b = cfcs([tfn(0, 1, 2), tfn(1, 2, 9)]);
    expect(a[0]).not.toBeCloseTo(b[0]!, 6);
  });
});

describe('fuzzy DEMATEL: validation', () => {
  it('accepts a valid input and warns about a self-influence', () => {
    const withDiagonal = EXAMPLE.map((row) => [...row]);
    withDiagonal[1]![1] = LOW;
    const result = validateMethodRun(fuzzyDematelMethod, make(withDiagonal));
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toEqual([DEMATEL_ISSUE_CODES.nonZeroDiagonal]);
    expect(validateMethodRun(fuzzyDematelMethod, make(EXAMPLE)).warnings).toEqual([]);
  });

  it('rejects invalid, unordered and negative TFNs and crisp cells', () => {
    const bad = (cell: unknown) => {
      const m = EXAMPLE.map((row) => [...row]) as unknown[][];
      m[0]![1] = cell;
      return codes(
        validateMethodRun(fuzzyDematelMethod, { factors: factorsOf(3), relations: [m as TFN[][]] }),
      );
    };
    expect(bad({ l: 3, m: 2, u: 1 })).toEqual(['tfn.invalid-order']);
    expect(bad({ l: -1, m: 0, u: 1 })).toEqual(['tfn.negative-value']);
    expect(bad(2)).toEqual(['tfn.invalid-value']);
    expect(bad(null)).toEqual(['matrix.missing-value']);
  });

  it('rejects a zero matrix and a matrix that cannot be inverted', () => {
    const zero = [
      [NONE, NONE],
      [NONE, NONE],
    ];
    expect(codes(validateMethodRun(fuzzyDematelMethod, make(zero)))).toEqual([
      DEMATEL_ISSUE_CODES.zeroMatrix,
    ]);
    const cycle = [
      [NONE, tfn(1, 1, 1)],
      [tfn(1, 1, 1), NONE],
    ];
    const result = validateMethodRun(fuzzyDematelMethod, make(cycle));
    expect(codes(result)).toEqual([DEMATEL_ISSUE_CODES.nearSingular]);
    // Only the upper matrix diverges here: l and m converge, u does not.
    const upperOnly = [
      [NONE, tfn(0.5, 1, 1)],
      [tfn(0.5, 1, 1), NONE],
    ];
    expect(codes(validateMethodRun(fuzzyDematelMethod, make(upperOnly)))).toEqual([
      DEMATEL_ISSUE_CODES.nearSingular,
    ]);
  });

  it('rejects a wrong shape and unknown parameter values', () => {
    expect(
      codes(validateMethodRun(fuzzyDematelMethod, make(EXAMPLE, [EXAMPLE, [[NONE, LOW]]]))),
    ).toEqual([DEMATEL_ISSUE_CODES.relationShape]);
    expect(
      codes(
        validateMethodRun(fuzzyDematelMethod, make(EXAMPLE), { defuzzification: 'max' as never }),
      ),
    ).toEqual(['parameter.invalid-option']);
    expect(codes(validateMethodRun(fuzzyDematelMethod, undefined as never))).toEqual([
      'input.malformed',
    ]);
  });
});
