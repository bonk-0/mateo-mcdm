/**
 * COPRAS golden, property and validation tests.
 *
 * Golden source: Podvezko (2011), Engineering Economics 22(2), 134-146, Eqs. 6-11 and
 * Table 8 (variant II), a substitute for the original paper of 1994 (docs/methods/copras.md).
 */
import { assertDeterministic, runMethod, validateMethodRun, verifyTrace } from '@mateo/engine';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput, smallMatrix, smallWeights } from '../src/testing/inputs';
import type { CoprasInput } from './copras';
import { COPRAS_ISSUE_CODES, coprasMethod } from './copras';
import fixture from './fixtures/podvezko-2011.json';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.sPlus', step: 'sums', kind: 'column', column: 's-plus' },
  { fixture: 'steps.sMinus', step: 'sums', kind: 'column', column: 's-minus' },
  { fixture: 'result.relativeSignificance', step: 'relative-significance', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const input = (): CoprasInput => crispInput(fixture.input);
const run = (value: CoprasInput = input()) =>
  runMethod(coprasMethod, value, {}, { verifyTrace: { requireKnownOperations: true } });

describe('COPRAS: golden test (Podvezko 2011, Table 8, variant II)', () => {
  const record = run();

  it('reproduces S⁺, S⁻, Q and the ranking within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual([]);
    expect(report.checked).toBe(3 + 3 + 3 + 3);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks A3 first, then A2, then A1, with N = 100 for the best', () => {
    expect(record.result.ranking.map((item) => item.rank)).toEqual([3, 2, 1]);
    expect(record.result.utilityDegree[2]).toBeCloseTo(100, 12);
    expect(record.result.scores).toBe(record.result.utilityDegree);
    expect(record.warnings).toEqual([]);
  });

  it('has the steps of the method in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'column-sums',
      'weighted-normalized-matrix',
      'sums',
      'relative-significance',
      'utility-degree',
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
    assertDeterministic(coprasMethod, input());
  });
});

describe('COPRAS: properties', () => {
  const sample = (values: number[][], directions: ('benefit' | 'cost')[], weights: number[]) => ({
    matrix: smallMatrix(values, directions),
    weights: smallWeights(...weights),
  });

  it('is Q_i = S⁺_i and N_i = 100 · S⁺_i / max S⁺ without cost criteria', () => {
    const record = run(
      sample(
        [
          [1, 3],
          [2, 2],
          [4, 1],
        ],
        ['benefit', 'benefit'],
        [0.5, 0.5],
      ),
    );
    // column sums 7 and 6; S⁺ = 0.5/7 · x1 + 0.5/6 · x2
    const sPlus = [1 / 14 + 3 / 12, 2 / 14 + 2 / 12, 4 / 14 + 1 / 12];
    record.result.relativeSignificance.forEach((q, i) => expect(q).toBeCloseTo(sPlus[i]!, 14));
    expect(record.result.utilityDegree[2]).toBeCloseTo(100, 12);
    const formulas = record.trace.steps.find((s) => s.id === 'relative-significance')!.formulas;
    expect(formulas.map((f) => f.id)).toEqual(['relative-significance-no-cost']);
  });

  it('gives Q the cost correction Σ S⁻ / (S⁻_i Σ 1/S⁻) of the paper', () => {
    const record = run(input());
    const sums = record.trace.steps
      .find((s) => s.id === 'sums')!
      .output.cells.map((row) => row.map((cell) => cell.value as number) as [number, number]);
    const total = sums.reduce((acc, [, minus]) => acc + minus, 0);
    const reciprocals = sums.reduce((acc, [, minus]) => acc + 1 / minus, 0);
    sums.forEach(([plus, minus], i) =>
      expect(record.result.relativeSignificance[i]).toBeCloseTo(
        plus + total / (minus * reciprocals),
        14,
      ),
    );
    // The paper's other form, with S⁻_min: Q = S⁺ + S⁻_min Σ S⁻ / (S⁻ Σ S⁻_min / S⁻).
    const min = Math.min(...sums.map(([, minus]) => minus));
    const ratio = sums.reduce((acc, [, minus]) => acc + min / minus, 0);
    sums.forEach(([plus, minus], i) =>
      expect(record.result.relativeSignificance[i]).toBeCloseTo(
        plus + (min * total) / (minus * ratio),
        14,
      ),
    );
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [2, 0, 1];
    const shuffled: CoprasInput = {
      weights: base.weights,
      matrix: {
        criteria: base.matrix.criteria,
        alternatives: order.map((i) => base.matrix.alternatives[i]!),
        values: order.map((i) => base.matrix.values[i]!),
      },
    };
    const byId = (record: ReturnType<typeof run>) =>
      Object.fromEntries(record.result.ranking.map((item) => [item.alternativeId, item]));
    const a = byId(run(shuffled));
    const b = byId(run());
    for (const id of Object.keys(b)) {
      expect(a[id]!.rank).toBe(b[id]!.rank);
      expect(a[id]!.score).toBeCloseTo(b[id]!.score, 12);
    }
  });

  it('ranks identical alternatives equally (competition ranking)', () => {
    const ranks = run(
      sample(
        [
          [5, 2],
          [3, 4],
          [5, 2],
          [1, 8],
        ],
        ['benefit', 'cost'],
        [0.5, 0.5],
      ),
    ).result.ranking.map((item) => item.rank);
    expect(ranks[0]).toBe(ranks[2]);
  });

  it('ignores the scale of the weights: N and the ranking stay, Q scales', () => {
    const base = input();
    const scaled: CoprasInput = {
      matrix: base.matrix,
      weights: {
        numberType: 'crisp',
        entries: base.weights.entries.map((e) => ({ ...e, value: e.value * 4 })),
      },
    };
    const a = run(base).result;
    const b = run(scaled).result;
    b.utilityDegree.forEach((n, i) => expect(n).toBeCloseTo(a.utilityDegree[i]!, 10));
    b.relativeSignificance.forEach((q, i) =>
      expect(q).toBeCloseTo(4 * a.relativeSignificance[i]!, 12),
    );
    expect(run(scaled).warnings).toEqual([]);
  });

  it('keeps 0 < N_i ≤ 100 with one alternative at 100, for random positive data', () => {
    const cell = fc.integer({ min: 1, max: 1000 });
    fc.assert(
      fc.property(
        fc.array(fc.array(cell, { minLength: 3, maxLength: 3 }), { minLength: 2, maxLength: 6 }),
        fc.array(fc.constantFrom('benefit', 'cost'), { minLength: 3, maxLength: 3 }),
        (values, directions) => {
          const { utilityDegree } = run(sample(values, directions, [0.2, 0.3, 0.5])).result;
          expect(Math.max(...utilityDegree)).toBeCloseTo(100, 10);
          for (const n of utilityDegree) {
            expect(n).toBeGreaterThan(0);
            expect(n).toBeLessThanOrEqual(100 + 1e-9);
          }
        },
      ),
      { seed: 20261118, numRuns: 100 },
    );
  });
});

describe('COPRAS: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(coprasMethod, value as CoprasInput).errors.map((issue) => issue.code);

  it('accepts the reference input', () => {
    expect(validateMethodRun(coprasMethod, input()).ok).toBe(true);
  });

  it('rejects malformed input, missing weights and negative data', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix: input().matrix })).toEqual(['input.malformed']);
    expect(
      codes({
        matrix: smallMatrix(
          [
            [1, 2],
            [-1, 3],
          ],
          ['benefit', 'cost'],
        ),
        weights: smallWeights(0.5, 0.5),
      }),
    ).toEqual(['matrix.negative-value']);
  });

  it('rejects a criterion whose values are all zero', () => {
    const result = validateMethodRun(coprasMethod, {
      matrix: smallMatrix(
        [
          [0, 2],
          [0, 3],
        ],
        ['benefit', 'cost'],
      ),
      weights: smallWeights(0.5, 0.5),
    });
    expect(result.errors).toMatchObject([
      { code: COPRAS_ISSUE_CODES.zeroColumnSum, location: { column: { id: 'c1' } } },
    ]);
  });

  it('rejects an alternative whose cost sum S⁻ is 0', () => {
    const result = validateMethodRun(coprasMethod, {
      matrix: smallMatrix(
        [
          [1, 0],
          [2, 3],
        ],
        ['benefit', 'cost'],
      ),
      weights: smallWeights(0.5, 0.5),
    });
    expect(result.errors).toMatchObject([
      { code: COPRAS_ISSUE_CODES.zeroCostSum, location: { row: { id: 'a1' } } },
    ]);
  });

  it('rejects zero weights that make S⁻ zero, and all-zero weights', () => {
    expect(
      codes({
        matrix: smallMatrix(
          [
            [1, 2],
            [2, 3],
          ],
          ['benefit', 'benefit'],
        ),
        weights: smallWeights(0, 0.5),
      }),
    ).toEqual([]);
    expect(
      codes({
        matrix: smallMatrix(
          [
            [1, 2],
            [2, 3],
          ],
          ['benefit', 'cost'],
        ),
        weights: smallWeights(0.5, 0),
      }),
    ).toEqual([COPRAS_ISSUE_CODES.zeroCostSum, COPRAS_ISSUE_CODES.zeroCostSum]);
    expect(
      codes({
        matrix: smallMatrix(
          [
            [1, 2],
            [2, 3],
          ],
          ['benefit', 'benefit'],
        ),
        weights: {
          numberType: 'crisp',
          entries: [
            { criterionId: 'c1', value: 0 },
            { criterionId: 'c2', value: 0 },
          ],
        },
      }),
    ).toEqual(['weights.zero-sum']);
  });
});
