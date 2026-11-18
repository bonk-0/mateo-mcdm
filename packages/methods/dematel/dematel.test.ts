/**
 * DEMATEL golden, property and validation tests.
 *
 * Golden source: Chen, Tzeng, Huang (2018), Technological and Economic Development of
 * Economy 24(2), 600-614, Section 3 and Table 2 (docs/methods/dematel.md).
 */
import {
  assertDeterministic,
  runMethod,
  textLiteral,
  validateMethodRun,
  verifyTrace,
} from '@mateo/engine';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import fixture from './fixtures/chen-2018.json';
import type { DematelInput } from './dematel';
import { dematelMethod } from './dematel';
import { inverseOfIdentityMinus } from './linear';
import { dematelOperationEvaluators } from './operations';
import { DEMATEL_ISSUE_CODES } from './shared';

const AUDIT = { operations: dematelOperationEvaluators, requireKnownOperations: true } as const;

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizationConstant', step: 'normalization-constant', kind: 'scalar' },
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.totalRelation', step: 'total-relation', kind: 'matrix' },
  { fixture: 'result.dispatch', step: 'influence', kind: 'column', column: 'D' },
  { fixture: 'result.receive', step: 'influence', kind: 'column', column: 'R' },
  {
    fixture: 'result.prominence',
    step: 'prominence-relation',
    kind: 'column',
    column: 'prominence',
  },
  { fixture: 'result.relation', step: 'prominence-relation', kind: 'column', column: 'relation' },
];

const factorsOf = (ids: readonly string[]) => ids.map((id) => ({ id, name: textLiteral(id) }));
const input = (): DematelInput => ({
  factors: factorsOf(fixture.input.factors),
  relations: [fixture.input.directRelation],
});
const run = (value: DematelInput = input(), params = {}) =>
  runMethod(dematelMethod, value, params, { verifyTrace: AUDIT });
const codes = (result: { errors: readonly { code: string }[] }) => result.errors.map((e) => e.code);

describe('DEMATEL: golden test (Chen, Tzeng, Huang 2018)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    // s, 36 normalized, 36 total, 6 each of D, R, D + R, D − R.
    expect(report.checked).toBe(1 + 36 + 36 + 4 * 6);
  });

  it('applies every deviation of the fixture (the typos of Table 2) and no other', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect([...report.deviationsUsed].sort()).toEqual(fixture.deviations.map((d) => d.path).sort());
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('has the steps of the formulation in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'direct-relation',
      'row-sums',
      'column-sums',
      'normalization-constant',
      'normalized-matrix',
      'inverse',
      'total-relation',
      'influence',
      'prominence-relation',
      'weight-basis-sum',
      'weights',
      'threshold',
    ]);
  });

  it('groups S3, S5 and S6 as causes and S1, S2 and S4 as effects', () => {
    const group = (id: string) => record.result.factors.find((f) => f.factorId === id)?.group;
    expect(['S3', 'S5', 'S6'].map(group)).toEqual(['cause', 'cause', 'cause']);
    expect(['S1', 'S2', 'S4'].map(group)).toEqual(['effect', 'effect', 'effect']);
  });

  it('warns about the non-zero diagonal instead of changing it', () => {
    expect(record.warnings.map((w) => w.code)).toEqual(
      Array(5).fill(DEMATEL_ISSUE_CODES.nonZeroDiagonal),
    );
    expect(record.warnings.map((w) => w.location?.row?.id)).toEqual(['S1', 'S2', 'S4', 'S5', 'S6']);
    // The printed T is only reproduced with the diagonal in place.
    expect(record.trace.steps[0]!.output.cells[0]![0]!.value).toBe(1);
  });

  it('passes the trace audit with every operation known', () => {
    expect(verifyTrace(record.trace, AUDIT)).toEqual([]);
  });

  it('is deterministic', () => {
    assertDeterministic(dematelMethod, input());
  });
});

describe('DEMATEL: weights and map', () => {
  const record = run();
  const prominence = record.result.factors.map((f) => f.prominence);
  const total = prominence.reduce((a, b) => a + b, 0);

  it('derives the weights from the prominence D + R by default', () => {
    record.result.weights.entries.forEach((entry, i) => {
      expect(entry.criterionId).toBe(fixture.input.factors[i]);
      expect(entry.value).toBeCloseTo(prominence[i]! / total, 12);
    });
  });

  it('can derive the weights from the distance √((D + R)² + (D − R)²)', () => {
    const distance = run(input(), { weightBasis: 'distance' });
    const basis = distance.result.factors.map((f) => Math.hypot(f.prominence, f.relation));
    const sum = basis.reduce((a, b) => a + b, 0);
    distance.result.weights.entries.forEach((entry, i) =>
      expect(entry.value).toBeCloseTo(basis[i]! / sum, 12),
    );
    expect(distance.trace.steps.map((s) => s.id)).toContain('weight-basis');
  });

  it('uses the mean of T as the default threshold and keeps off-diagonal entries above it', () => {
    const t = record.result.totalRelation;
    const mean = t.flat().reduce((a, b) => a + b, 0) / 36;
    expect(record.result.threshold).toBeCloseTo(mean, 12);
    const expected = t.flatMap((row, i) =>
      row.flatMap((value, j) => (i !== j && value >= mean ? [`S${i + 1}>S${j + 1}`] : [])),
    );
    expect(record.result.relations.map((e) => `${e.from}>${e.to}`)).toEqual(expected);
  });

  it('shows every relation for a custom threshold of 0', () => {
    const all = run(input(), { threshold: 'custom', customThreshold: 0 });
    expect(all.result.threshold).toBe(0);
    expect(all.result.relations).toHaveLength(30);
  });

  it('does not change T, D + R or the weights with the threshold', () => {
    const custom = run(input(), { threshold: 'custom', customThreshold: 0.4 });
    expect(custom.result.totalRelation).toEqual(record.result.totalRelation);
    expect(custom.result.weights).toEqual(record.result.weights);
    expect(custom.result.relations.every((e) => e.value >= 0.4)).toBe(true);
  });
});

/** A random matrix with entries 0-4 and a given order, non-zero. */
const matrixArb = (n: number) =>
  fc
    .array(fc.array(fc.integer({ min: 0, max: 4 }), { minLength: n, maxLength: n }), {
      minLength: n,
      maxLength: n,
    })
    .filter((m) => m.some((row) => row.some((x) => x > 0)));

const nArb = fc.integer({ min: 2, max: 6 });
const sizedMatrix = nArb.chain((n) => matrixArb(n).map((m) => ({ n, m })));
const ids = (n: number) => Array.from({ length: n }, (_, i) => `F${i + 1}`);
const make = (m: number[][], experts: number[][][] = [m]): DematelInput => ({
  factors: factorsOf(ids(m.length)),
  relations: experts,
});
/** Inputs whose series converges, which is the case for all but exotic matrices. */
const runnable = (value: DematelInput) =>
  validateMethodRun(dematelMethod, value).ok ? runMethod(dematelMethod, value) : undefined;

describe('DEMATEL: properties', () => {
  it('satisfies T = X + X T, the definition of the sum of all indirect influences', () => {
    fc.assert(
      fc.property(sizedMatrix, ({ m }) => {
        const record = runnable(make(m));
        fc.pre(record !== undefined);
        const n = m.length;
        const s = record.result.normalizationConstant;
        const t = record.result.totalRelation;
        for (let i = 0; i < n; i += 1) {
          for (let j = 0; j < n; j += 1) {
            let xt = 0;
            for (let k = 0; k < n; k += 1) xt += (m[i]![k]! / s) * t[k]![j]!;
            expect(t[i]![j]!).toBeCloseTo(m[i]![j]! / s + xt, 9);
          }
        }
      }),
      { numRuns: 60 },
    );
  });

  it('has a non-negative T and weights that sum to 1', () => {
    fc.assert(
      fc.property(sizedMatrix, fc.constantFrom('prominence', 'distance'), ({ m }, weightBasis) => {
        fc.pre(validateMethodRun(dematelMethod, make(m)).ok);
        const record = runMethod(dematelMethod, make(m), { weightBasis });
        record.result.totalRelation.flat().forEach((x) => expect(x).toBeGreaterThanOrEqual(-1e-12));
        const weights = record.result.weights.entries.map((e) => e.value);
        weights.forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
        expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
      }),
      { numRuns: 60 },
    );
  });

  it('is unchanged by the scale of the ratings', () => {
    fc.assert(
      fc.property(sizedMatrix, fc.integer({ min: 2, max: 9 }), ({ m }, k) => {
        const a = runnable(make(m));
        fc.pre(a !== undefined);
        const b = runMethod(dematelMethod, make(m.map((row) => row.map((x) => x * k))));
        b.result.totalRelation.forEach((row, i) =>
          row.forEach((x, j) => expect(x).toBeCloseTo(a.result.totalRelation[i]![j]!, 9)),
        );
      }),
      { numRuns: 40 },
    );
  });

  it('averages the experts: two experts equal one expert with their mean matrix', () => {
    fc.assert(
      fc.property(
        nArb.chain((n) => fc.tuple(matrixArb(n), matrixArb(n))),
        ([a, b]) => {
          const mean = a.map((row, i) => row.map((x, j) => (x + b[i]![j]!) / 2));
          fc.pre(validateMethodRun(dematelMethod, make(mean)).ok);
          const group = runMethod(dematelMethod, make(a, [a, b]), {}, { verifyTrace: AUDIT });
          const single = runMethod(dematelMethod, make(mean));
          expect(group.result.totalRelation).toEqual(single.result.totalRelation);
          expect(group.trace.steps.map((s) => s.id).slice(0, 2)).toEqual([
            'expert-matrices',
            'direct-relation',
          ]);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('gives the same result for the same experts in any order', () => {
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
    const ab = runMethod(dematelMethod, make(a, [a, b]));
    const ba = runMethod(dematelMethod, make(a, [b, a]));
    expect(ab.result.totalRelation).toEqual(ba.result.totalRelation);
  });

  it('follows the factors when they are put in another order', () => {
    fc.assert(
      fc.property(sizedMatrix, ({ n, m }) => {
        const base = runnable(make(m));
        fc.pre(base !== undefined);
        const order = Array.from({ length: n }, (_, i) => (i + 1) % n);
        const moved = make(order.map((i) => order.map((j) => m[i]![j]!)));
        const factors = order.map((i) => ({ id: `F${i + 1}`, name: textLiteral(`F${i + 1}`) }));
        const result = runMethod(dematelMethod, { ...moved, factors });
        order.forEach((original, position) => {
          const a = base.result.factors[original]!;
          const b = result.result.factors[position]!;
          expect(b.factorId).toBe(a.factorId);
          expect(b.prominence).toBeCloseTo(a.prominence, 9);
          expect(b.relation).toBeCloseTo(a.relation, 9);
        });
      }),
      { numRuns: 30 },
    );
  });

  it('sums D − R to 0 over all factors', () => {
    fc.assert(
      fc.property(sizedMatrix, ({ m }) => {
        const record = runnable(make(m));
        fc.pre(record !== undefined);
        const total = record.result.factors.reduce((a, f) => a + f.relation, 0);
        expect(Math.abs(total)).toBeLessThan(1e-9);
      }),
      { numRuns: 40 },
    );
  });

  it('gives the same T with the row-sum constant when the largest sum is a row sum', () => {
    const z = [
      [0, 3, 4],
      [1, 0, 1],
      [1, 0, 0],
    ];
    const both = runMethod(dematelMethod, make(z));
    const rows = runMethod(dematelMethod, make(z), { normalization: 'max-row-sum' });
    expect(rows.result.normalizationConstant).toBe(7);
    expect(rows.result.totalRelation).toEqual(both.result.totalRelation);
    expect(rows.trace.steps.map((s) => s.id)).not.toContain('column-sums');
  });
});

describe('DEMATEL: validation', () => {
  const ok = [
    [0, 2],
    [1, 0],
  ];

  it('accepts a valid input without warnings', () => {
    const result = validateMethodRun(dematelMethod, make(ok));
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('rejects a matrix of zeros', () => {
    expect(
      codes(
        validateMethodRun(
          dematelMethod,
          make([
            [0, 0],
            [0, 0],
          ]),
        ),
      ),
    ).toEqual([DEMATEL_ISSUE_CODES.zeroMatrix]);
  });

  it('rejects a matrix whose indirect influences do not fade, with a clear error', () => {
    for (const z of [
      [
        [0, 1],
        [1, 0],
      ],
      [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
      ],
      [
        [0, 2],
        [2, 0],
      ],
    ]) {
      const result = validateMethodRun(dematelMethod, make(z));
      expect(codes(result)).toEqual([DEMATEL_ISSUE_CODES.nearSingular]);
      expect(result.errors[0]!.params).toHaveProperty('condition');
    }
    // One entry a hair below the largest sum: numerically singular as well.
    expect(
      codes(
        validateMethodRun(
          dematelMethod,
          make([
            [0, 1],
            [1 - 1e-12, 0],
          ]),
        ),
      ),
    ).toEqual([DEMATEL_ISSUE_CODES.nearSingular]);
    // A margin of 0.001 is far from singular and runs.
    expect(
      validateMethodRun(
        dematelMethod,
        make([
          [0, 1],
          [0.999, 0],
        ]),
      ).ok,
    ).toBe(true);
  });

  it('rejects negative, missing and invalid ratings', () => {
    expect(
      codes(
        validateMethodRun(
          dematelMethod,
          make([
            [0, -1],
            [1, 0],
          ]),
        ),
      ),
    ).toEqual(['matrix.negative-value']);
    const invalid = {
      ...make(ok),
      relations: [
        [
          [0, null],
          [1, Number.NaN],
        ],
      ],
    } as unknown as DematelInput;
    expect(codes(validateMethodRun(dematelMethod, invalid))).toEqual([
      'matrix.missing-value',
      'matrix.invalid-value',
    ]);
  });

  it('rejects matrices of the wrong shape, naming the expert', () => {
    const result = validateMethodRun(
      dematelMethod,
      make(ok, [
        ok,
        [
          [0, 1, 2],
          [1, 0, 1],
        ],
      ]),
    );
    expect(codes(result)).toEqual([DEMATEL_ISSUE_CODES.relationShape]);
    expect(result.errors[0]!.params).toEqual({ expert: 2, order: 2 });
  });

  it('rejects a malformed factor list and malformed relations', () => {
    const base = make(ok);
    expect(
      codes(validateMethodRun(dematelMethod, { ...base, factors: [base.factors[0]!] })),
    ).toEqual(['matrix.too-few-criteria']);
    expect(
      codes(
        validateMethodRun(dematelMethod, {
          ...base,
          factors: [base.factors[0]!, base.factors[0]!],
        }),
      ),
    ).toEqual(['matrix.duplicate-criterion']);
    expect(codes(validateMethodRun(dematelMethod, { ...base, factors: 'x' as never }))).toEqual([
      'input.malformed',
    ]);
    expect(codes(validateMethodRun(dematelMethod, { ...base, relations: [] }))).toEqual([
      'input.malformed',
    ]);
    expect(codes(validateMethodRun(dematelMethod, { ...base, relations: [5 as never] }))).toEqual([
      'input.malformed',
    ]);
    expect(codes(validateMethodRun(dematelMethod, undefined as never))).toEqual([
      'input.malformed',
    ]);
  });

  it('rejects unknown parameter values', () => {
    expect(
      codes(validateMethodRun(dematelMethod, make(ok), { threshold: 'median' as never })),
    ).toEqual(['parameter.invalid-option']);
    expect(codes(validateMethodRun(dematelMethod, make(ok), { customThreshold: -1 }))).toEqual([
      'parameter.out-of-range',
    ]);
  });
});

describe('DEMATEL: linear algebra', () => {
  it('inverts I − X exactly for a small case', () => {
    const outcome = inverseOfIdentityMinus([
      [0, 0.5],
      [0.25, 0],
    ]);
    expect(outcome.kind).toBe('ok');
    if (outcome.kind === 'ok') {
      // (I − X)⁻¹ = 1/(1 − 1/8) · [[1, 0.5], [0.25, 1]]
      expect(outcome.inverse[0]![0]).toBeCloseTo(8 / 7, 12);
      expect(outcome.inverse[0]![1]).toBeCloseTo(4 / 7, 12);
      expect(outcome.inverse[1]![0]).toBeCloseTo(2 / 7, 12);
      expect(outcome.inverse[1]![1]).toBeCloseTo(8 / 7, 12);
    }
  });

  it('reports an exact singularity as an infinite condition number', () => {
    expect(
      inverseOfIdentityMinus([
        [0, 1],
        [1, 0],
      ]),
    ).toEqual({
      kind: 'singular',
      condition: Number.POSITIVE_INFINITY,
    });
  });
});

describe('DEMATEL: trace audit', () => {
  it('reports a tampered inverse', () => {
    const record = runMethod(
      dematelMethod,
      make([
        [0, 2],
        [1, 0],
      ]),
    );
    const copy = JSON.parse(JSON.stringify(record.trace)) as typeof record.trace;
    const step = copy.steps.find((s) => s.id === 'inverse')!;
    const cell = step.output.cells[0]![0] as { value: number; derivation: { value: number } };
    cell.value += 0.5;
    cell.derivation.value += 0.5;
    expect(verifyTrace(copy, AUDIT).map((p) => p.code)).toContain('operation-mismatch');
  });
});

describe('DEMATEL: operation evaluators', () => {
  const evaluate = (operation: string, args: readonly unknown[], options = {}) =>
    dematelOperationEvaluators[operation]!(args as never, options);
  const tfnValue = (x: number) => ({ type: 'tfn', components: { l: x, m: x, u: x } });

  it('refuse operands that cannot belong to the operation', () => {
    expect(
      evaluate('dematel.inverse', [0, 'x', 0, 0], { order: 2, row: 0, column: 0 }),
    ).toHaveProperty('problem');
    expect(evaluate('dematel.inverse', [0, 0, 0], { order: 2, row: 0, column: 0 })).toHaveProperty(
      'problem',
    );
    expect(evaluate('dematel.inverse', [0, 0, 0, 0], { order: 2, row: 0 })).toHaveProperty(
      'problem',
    );
    expect(
      evaluate('dematel.inverse', [0, 0, 0, 0], { order: 2, row: 2, column: 0 }),
    ).toHaveProperty('problem');
    expect(
      evaluate('dematel.inverse', [0, 1, 1, 0], { order: 2, row: 0, column: 0 }),
    ).toHaveProperty('problem');
    expect(evaluate('dematel.inverse', [0, 0, 0, 0], { order: 2, row: 0, column: 0 })).toEqual({
      value: 1,
    });
  });

  it('refuse fuzzy operands that are not fuzzy numbers or are the wrong number', () => {
    const ok = [0, 0, 0, 0].map(tfnValue);
    const at = { order: 2, row: 1, column: 1 };
    expect(evaluate('dematel.fuzzy-inverse', ok, at)).toEqual({ value: tfnValue(1) });
    expect(evaluate('dematel.fuzzy-inverse', [...ok.slice(1), 3], at)).toHaveProperty('problem');
    expect(evaluate('dematel.fuzzy-inverse', ok.slice(1), at)).toHaveProperty('problem');
    expect(evaluate('dematel.fuzzy-inverse', [0, 1, 1, 0].map(tfnValue), at)).toHaveProperty(
      'problem',
    );
    expect(evaluate('dematel.componentwise-product', [tfnValue(1)])).toHaveProperty(
      'kind',
      'arity',
    );
    expect(evaluate('dematel.componentwise-product', [])).toHaveProperty('kind', 'arity');
    expect(evaluate('dematel.cfcs', [])).toHaveProperty('problem');
    expect(evaluate('dematel.cfcs', [tfnValue(2)], { index: 1 })).toHaveProperty('problem');
    expect(evaluate('dematel.cfcs', [tfnValue(2)], { index: 0 })).toEqual({ value: 2 });
  });
});
