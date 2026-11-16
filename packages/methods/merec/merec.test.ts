/**
 * MEREC golden and contract tests.
 *
 * Golden source: Keshavarz-Ghorabaee, Amiri, Zavadskas, Turskis, Antucheviciene (2021),
 * Symmetry 13(4), 525, Tables 2-4 and Section 4 (docs/methods/merec.md).
 */
import type { DecisionMatrix } from '@mateo/engine';
import {
  assertDeterministic,
  runMethod,
  textLiteral,
  validateMethodRun,
  verifyTrace,
} from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispMatrixInput } from '../src/testing/inputs';
import fixture from './fixtures/keshavarz-ghorabaee-2021.json';
import type { MerecInput } from './merec';
import { MEREC_ISSUE_CODES, merecMethod } from './merec';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.overallPerformance', step: 'overall-performance', kind: 'column' },
  { fixture: 'steps.removalPerformance', step: 'removal-performance', kind: 'matrix' },
  { fixture: 'steps.removalEffects', step: 'removal-effects', kind: 'row' },
  { fixture: 'result.weights', step: 'weights', kind: 'row' },
];

const input = (): MerecInput => crispMatrixInput(fixture.input);
const run = (value: MerecInput = input()) =>
  runMethod(merecMethod, value, {}, { verifyTrace: { requireKnownOperations: true } });

function small(values: number[][], directions: ('benefit' | 'cost')[]): MerecInput {
  const matrix: DecisionMatrix<number> = {
    alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`A${i + 1}`) })),
    criteria: directions.map((direction, j) => ({
      id: `c${j + 1}`,
      name: textLiteral(`C${j + 1}`),
      direction,
      numberType: 'crisp',
    })),
    values,
  };
  return { matrix };
}

const weightValues = (record: ReturnType<typeof run>) =>
  record.result.weights.entries.map((entry) => entry.value);

describe('MEREC: golden test (Keshavarz-Ghorabaee et al. 2021)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    // 5 × 4 + 5 + 5 × 4 + 4 + 4 printed values.
    expect(report.checked).toBe(20 + 5 + 20 + 4 + 4);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('does not round E before dividing: 0.5752, 0.0141, 0.4016, 0.0091', () => {
    expect(weightValues(record).map((w) => Math.round(w * 1e4) / 1e4)).toEqual([
      0.5752, 0.0141, 0.4016, 0.0091,
    ]);
  });

  it('has the steps of the formulation in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'normalized-matrix',
      'absolute-logs',
      'overall-performance',
      'removal-performance',
      'removal-effects',
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
    assertDeterministic(merecMethod, input());
  });
});

describe('MEREC: properties', () => {
  it('has non-negative weights that sum to 1 within 1e-12', () => {
    const weights = weightValues(run());
    weights.forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
    expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [3, 0, 4, 2, 1];
    const shuffled: MerecInput = {
      matrix: {
        criteria: base.matrix.criteria,
        alternatives: order.map((i) => base.matrix.alternatives[i]!),
        values: order.map((i) => base.matrix.values[i]!),
      },
    };
    weightValues(run(shuffled)).forEach((w, j) =>
      expect(w).toBeCloseTo(weightValues(run())[j]!, 12),
    );
  });

  it('does not depend on the order of the criteria (weights follow their ids)', () => {
    const base = input();
    const order = [3, 1, 0, 2];
    const permuted: MerecInput = {
      matrix: {
        alternatives: base.matrix.alternatives,
        criteria: order.map((j) => base.matrix.criteria[j]!),
        values: base.matrix.values.map((row) => order.map((j) => row[j]!)),
      },
    };
    const byId = (record: ReturnType<typeof run>) =>
      Object.fromEntries(record.result.weights.entries.map((e) => [e.criterionId, e.value]));
    const a = byId(run(permuted));
    const b = byId(run());
    for (const id of Object.keys(b)) expect(a[id]).toBeCloseTo(b[id]!, 12);
  });

  it('is invariant under a positive scaling of a criterion', () => {
    const base = input();
    const scaled: MerecInput = {
      matrix: {
        ...base.matrix,
        values: base.matrix.values.map(([a, b, c, d]) => [a! * 10, b!, c!, d!]),
      },
    };
    weightValues(run(scaled)).forEach((w, j) => expect(w).toBeCloseTo(weightValues(run())[j]!, 12));
  });
});

describe('MEREC: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(merecMethod, value as MerecInput).errors.map((issue) => issue.code);

  it('accepts the reference input', () => {
    expect(validateMethodRun(merecMethod, input()).ok).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
  });

  it('rejects a zero value (the logarithm is undefined) and locates it', () => {
    const result = validateMethodRun(
      merecMethod,
      small(
        [
          [1, 0],
          [3, 4],
        ],
        ['benefit', 'cost'],
      ),
    );
    expect(result.errors).toMatchObject([
      {
        code: 'matrix.non-positive-value',
        location: { row: { id: 'a1' }, column: { id: 'c2' } },
      },
    ]);
  });

  it('rejects a negative value', () => {
    expect(
      codes(
        small(
          [
            [1, -2],
            [3, 4],
          ],
          ['benefit', 'benefit'],
        ),
      ),
    ).toEqual(['matrix.non-positive-value']);
  });

  it('rejects fewer than two criteria', () => {
    expect(codes(small([[1], [2]], ['benefit']))).toEqual(['matrix.too-few-criteria']);
  });

  it('rejects identical alternatives (all removal effects are 0)', () => {
    expect(
      codes(
        small(
          [
            [2, 3],
            [2, 3],
            [2, 3],
          ],
          ['benefit', 'cost'],
        ),
      ),
    ).toEqual([MEREC_ISSUE_CODES.zeroRemovalEffects]);
  });

  it('rejects a single alternative', () => {
    expect(codes(small([[2, 3]], ['benefit', 'cost']))).toEqual([
      MEREC_ISSUE_CODES.zeroRemovalEffects,
    ]);
  });

  it('rejects TFN criteria', () => {
    const value = small(
      [
        [1, 2],
        [3, 5],
      ],
      ['benefit', 'benefit'],
    );
    const criteria = value.matrix.criteria.map((c) => ({ ...c, numberType: 'tfn' as const }));
    expect(codes({ matrix: { ...value.matrix, criteria } })).toContain(
      'matrix.unsupported-number-type',
    );
  });
});
