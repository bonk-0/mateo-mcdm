/**
 * LOPCOW golden and contract tests.
 *
 * Golden source: Biswas, Pamučar, Dawn, Simic (2024), Decision Making Advances 2(1), 1-21,
 * Tables 4-6 (docs/methods/lopcow.md).
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
import fixture from './fixtures/biswas-2024.json';
import type { LopcowInput } from './lopcow';
import { LOPCOW_ISSUE_CODES, lopcowMethod } from './lopcow';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.meanSquares', step: 'mean-squares', kind: 'row' },
  { fixture: 'steps.standardDeviations', step: 'standard-deviations', kind: 'row' },
  { fixture: 'steps.percentageValues', step: 'percentage-values', kind: 'row' },
  { fixture: 'steps.percentageValuesSum', step: 'percentage-value-sum', kind: 'scalar' },
  { fixture: 'result.weights', step: 'weights', kind: 'row' },
];

const input = (): LopcowInput => crispMatrixInput(fixture.input);
const run = (value: LopcowInput = input()) =>
  runMethod(lopcowMethod, value, {}, { verifyTrace: { requireKnownOperations: true } });
const weightValues = (record: ReturnType<typeof run>) =>
  record.result.weights.entries.map((entry) => entry.value);

function small(values: number[][], directions: ('benefit' | 'cost')[]): LopcowInput {
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

describe('LOPCOW: golden test (Biswas et al. 2024)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual([]);
    // 8 × 6 normalized values, 6 mean squares, 6 σ, 6 PV, their sum, 6 weights.
    expect(report.checked).toBe(48 + 6 + 6 + 6 + 1 + 6);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('gives the weights 0.1804, 0.2962, 0.2344, 0.2337, 0.0219, 0.0334', () => {
    [0.1804, 0.2962, 0.2344, 0.2337, 0.0219, 0.0334].forEach((w, j) =>
      expect(weightValues(record)[j]).toBeCloseTo(w, 4),
    );
    expect(record.result.weights.entries.map((e) => e.criterionId)).toEqual([
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'C6',
    ]);
  });

  it('has the steps of the formulation in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'normalized-matrix',
      'mean-squares',
      'means',
      'deviations',
      'standard-deviations',
      'percentage-values',
      'percentage-value-sum',
      'weights',
    ]);
  });

  it('passes the trace audit', () => {
    expect(verifyTrace(record.trace, { requireKnownOperations: true })).toEqual([]);
  });

  it('is deterministic', () => {
    assertDeterministic(lopcowMethod, input());
  });
});

describe('LOPCOW: properties', () => {
  it('has non-negative weights that sum to 1 within 1e-12', () => {
    const weights = weightValues(run());
    weights.forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
    expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [5, 2, 7, 0, 3, 6, 1, 4];
    const shuffled: LopcowInput = {
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

  it('is invariant under a positive linear rescaling of a criterion', () => {
    const base = input();
    const scaled: LopcowInput = {
      matrix: {
        ...base.matrix,
        values: base.matrix.values.map((row) => row.map((x, j) => (j === 4 ? 3 * x + 7 : x))),
      },
    };
    weightValues(run(scaled)).forEach((w, j) => expect(w).toBeCloseTo(weightValues(run())[j]!, 12));
  });

  it('gives a cost criterion the weight of the mirrored benefit criterion', () => {
    const benefit = small(
      [
        [1, 4],
        [2, 9],
        [7, 1],
        [3, 3],
      ],
      ['benefit', 'benefit'],
    );
    const mirrored = small(
      benefit.matrix.values.map(([a, b]) => [-a!, b!]),
      ['cost', 'benefit'],
    );
    weightValues(run(mirrored)).forEach((w, j) =>
      expect(w).toBeCloseTo(weightValues(run(benefit))[j]!, 12),
    );
  });
});

describe('LOPCOW: validation', () => {
  it('rejects a constant criterion', () => {
    const validation = validateMethodRun(
      lopcowMethod,
      small(
        [
          [1, 5],
          [2, 5],
          [3, 5],
        ],
        ['benefit', 'benefit'],
      ),
    );
    expect(validation.errors.map((e) => e.code)).toEqual(['matrix.constant-criterion']);
  });

  it('needs three alternatives: with two, every percentage value is 0', () => {
    const validation = validateMethodRun(
      lopcowMethod,
      small(
        [
          [1, 5],
          [2, 4],
        ],
        ['benefit', 'cost'],
      ),
    );
    expect(validation.errors.map((e) => e.code)).toEqual(['matrix.too-few-alternatives']);
  });

  it('rejects a matrix whose percentage values are all 0', () => {
    // A normalized column (0, 0, 1) has mean square 1/3 and sample variance 1/3: PV = 0.
    const zero = small(
      [
        [2, 5],
        [2, 5],
        [3, 9],
      ],
      ['benefit', 'benefit'],
    );
    expect(validateMethodRun(lopcowMethod, zero).errors.map((e) => e.code)).toEqual([
      LOPCOW_ISSUE_CODES.zeroPercentageValues,
    ]);
  });

  it('allows a single criterion with PV = 0: it gets weight 0', () => {
    const record = run(
      small(
        [
          [2, 1],
          [2, 4],
          [3, 9],
        ],
        ['benefit', 'benefit'],
      ),
    );
    expect(record.result.weights.entries[0]!.value).toBeLessThan(1e-12);
  });

  it('rejects a malformed matrix', () => {
    expect(validateMethodRun(lopcowMethod, {} as LopcowInput).ok).toBe(false);
  });
});
