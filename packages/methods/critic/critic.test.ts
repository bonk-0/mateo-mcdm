/**
 * CRITIC golden and contract tests.
 *
 * Golden source: Diakoulaki, Mavrotas, Papayannakis (1995), Computers & Operations Research
 * 22(7), 763-770, Tables 1-3 and the text (docs/methods/critic.md).
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
import type { CriticInput } from './critic';
import { CRITIC_ISSUE_CODES, criticMethod } from './critic';
import fixture from './fixtures/diakoulaki-1995.json';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.standardDeviations', step: 'standard-deviations', kind: 'row' },
  { fixture: 'steps.correlationMatrix', step: 'correlation-matrix', kind: 'matrix' },
  { fixture: 'result.weights', step: 'weights', kind: 'row' },
];

const input = (): CriticInput => crispMatrixInput(fixture.input);
const run = (value: CriticInput = input()) =>
  runMethod(criticMethod, value, {}, { verifyTrace: { requireKnownOperations: true } });

function small(values: number[][], directions: ('benefit' | 'cost')[]): CriticInput {
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

describe('CRITIC: golden test (Diakoulaki et al. 1995)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision, deviations included', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual(
      (fixture.deviations as { path: string }[]).map((d) => d.path),
    );
    // 8 × 3 normalized values, 3 deviations, 3 × 3 correlations, 3 weights.
    expect(report.checked).toBe(24 + 3 + 9 + 3);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('gives the weights 0.202, 0.481, 0.317 (0.2022, 0.4809, 0.3169 from Table 1)', () => {
    expect(weightValues(record)[0]).toBeCloseTo(0.2022, 4);
    expect(weightValues(record)[1]).toBeCloseTo(0.4809, 4);
    expect(weightValues(record)[2]).toBeCloseTo(0.3169, 4);
    expect(record.result.weights.entries.map((e) => e.criterionId)).toEqual([
      'profitability',
      'marketShare',
      'productivity',
    ]);
  });

  it('has the steps of the formulation in order', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'normalized-matrix',
      'means',
      'deviations',
      'standard-deviations',
      'correlation-matrix',
      'conflict',
      'information-content',
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
    assertDeterministic(criticMethod, input());
  });
});

describe('CRITIC: properties', () => {
  it('has non-negative weights that sum to 1 within 1e-12', () => {
    const weights = weightValues(run());
    weights.forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
    expect(Math.abs(weights.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
  });

  it('does not depend on the order of the alternatives', () => {
    const base = input();
    const order = [5, 2, 7, 0, 3, 6, 1, 4];
    const shuffled: CriticInput = {
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
    const order = [2, 0, 1];
    const permuted: CriticInput = {
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

  it('is invariant under a positive linear rescaling of a criterion', () => {
    const base = input();
    const scaled: CriticInput = {
      matrix: {
        ...base.matrix,
        values: base.matrix.values.map(([a, b, c]) => [a! * 3 + 7, b!, c!]),
      },
    };
    weightValues(run(scaled)).forEach((w, j) => expect(w).toBeCloseTo(weightValues(run())[j]!, 12));
  });

  it('gives a cost criterion the same weights as its negated benefit twin', () => {
    const benefit = small(
      [
        [1, 5],
        [4, 2],
        [2, 9],
        [8, 1],
      ],
      ['benefit', 'benefit'],
    );
    const cost = small(
      [
        [-1, 5],
        [-4, 2],
        [-2, 9],
        [-8, 1],
      ],
      ['cost', 'benefit'],
    );
    // cost on −x normalizes to the same values as benefit on x.
    weightValues(run(cost)).forEach((w, j) =>
      expect(w).toBeCloseTo(weightValues(run(benefit))[j]!, 12),
    );
  });

  it('accepts negative values (the paper has a negative profitability)', () => {
    expect(validateMethodRun(criticMethod, input()).ok).toBe(true);
  });
});

describe('CRITIC: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(criticMethod, value as CriticInput).errors.map((issue) => issue.code);

  it('rejects malformed input', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({})).toEqual(['input.malformed']);
  });

  it('rejects a constant column and names the criterion', () => {
    const result = validateMethodRun(
      criticMethod,
      small(
        [
          [1, 5, 2],
          [1, 2, 7],
          [1, 9, 3],
        ],
        ['benefit', 'benefit', 'cost'],
      ),
    );
    expect(result.errors).toMatchObject([
      {
        code: 'matrix.constant-criterion',
        location: { column: { id: 'c1' } },
        params: { id: 'c1' },
      },
    ]);
  });

  it('rejects fewer than two alternatives', () => {
    expect(codes(small([[1, 2]], ['benefit', 'benefit']))).toEqual(['matrix.too-few-alternatives']);
  });

  it('rejects fewer than two criteria', () => {
    expect(codes(small([[1], [2], [3]], ['benefit']))).toEqual(['matrix.too-few-criteria']);
  });

  it('rejects a matrix whose weights would be 0 / 0 (perfectly correlated criteria)', () => {
    expect(
      codes(
        small(
          [
            [1, 2],
            [2, 4],
            [3, 6],
          ],
          ['benefit', 'benefit'],
        ),
      ),
    ).toEqual([CRITIC_ISSUE_CODES.zeroInformation]);
  });

  it('rejects non-finite values and TFN criteria', () => {
    expect(
      codes(
        small(
          [
            [1, Number.NaN],
            [2, 3],
          ],
          ['benefit', 'benefit'],
        ),
      ),
    ).toEqual(['matrix.invalid-value']);
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

  it('runs two alternatives and two criteria', () => {
    const record = run(
      small(
        [
          [1, 9],
          [4, 2],
        ],
        ['benefit', 'benefit'],
      ),
    );
    expect(weightValues(record)[0]).toBeCloseTo(0.5, 12);
  });
});
