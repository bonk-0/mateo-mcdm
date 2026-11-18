/**
 * ARAS golden, property and validation tests.
 *
 * Golden source: Zavadskas and Turskis (2010), Technological and Economic Development of
 * Economy 16(2), 159-172, Tables 1-3 (docs/methods/aras.md). The optimal alternative is
 * entered by the decision maker; Table 1 prints one illumination value (room 8) that the
 * tables were not computed with, and the fixture holds the value they used.
 */
import {
  assertDeterministic,
  crispWeights,
  runMethod,
  validateMethodRun,
  verifyTrace,
} from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { compareWithFixture, fixtureTables } from '../src/testing/golden';
import type { GoldenSpec } from '../src/testing/golden';
import { crispInput, smallMatrix, smallWeights } from '../src/testing/inputs';
import type { ArasInput } from './aras';
import { ARAS_ISSUE_CODES, ARAS_OPTIMAL, arasMethod } from './aras';
import fixture from './fixtures/zavadskas-2010.json';

const SPECS: readonly GoldenSpec[] = [
  { fixture: 'steps.normalizedMatrix', step: 'normalized-matrix', kind: 'matrix' },
  { fixture: 'steps.weightedMatrix', step: 'weighted-matrix', kind: 'matrix' },
  { fixture: 'steps.optimality', step: 'sums', kind: 'column' },
  { fixture: 'result.utility', step: 'utility-degree', kind: 'column' },
  { fixture: 'result.ranking', step: 'ranking', kind: 'column', exact: true },
];

const withOptimal = (): ArasInput => ({
  ...crispInput(fixture.input),
  optimal: crispWeights(
    fixture.input.criteria.map((c) => c.id),
    fixture.input.optimal,
  ),
});
const run = (value: ArasInput = withOptimal()) =>
  runMethod(arasMethod, value, {}, { verifyTrace: { requireKnownOperations: true } });

describe('ARAS: golden test (Zavadskas and Turskis 2010, Tables 2-3)', () => {
  const record = run();

  it('reproduces every printed table within the printed precision', () => {
    const report = compareWithFixture(fixture, record.trace, SPECS);
    expect(report.mismatches).toEqual([]);
    expect(report.deviationsUsed).toEqual([]);
    // 15 × 6 normalized and weighted values, 15 sums, 15 utilities, 14 ranks.
    expect(report.checked).toBe(2 * 90 + 15 + 15 + 14);
  });

  it('covers every table the paper prints', () => {
    expect(SPECS.map((spec) => spec.fixture).sort()).toEqual(fixtureTables(fixture).sort());
  });

  it('ranks room 9 first and room 8 second, with K = 1 for the optimal row', () => {
    const best = record.result.ranking.find((item) => item.rank === 1);
    expect(best?.alternativeId).toBe('9');
    expect(record.result.ranking.find((item) => item.rank === 2)?.alternativeId).toBe('8');
    const utility = record.trace.steps.find((s) => s.id === 'utility-degree')!;
    expect(utility.output.cells[0]![0]!.value).toBe(1);
    expect(record.result.utilityDegree).toHaveLength(14);
    expect(record.warnings).toEqual([]);
  });

  it('has the steps of the method in order, with the entered optimal alternative', () => {
    expect(record.trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'optimal-alternative',
      'extended-matrix',
      'column-sums',
      'normalized-matrix',
      'weighted-matrix',
      'sums',
      'utility-degree',
      'ranking',
    ]);
    const optimal = record.trace.steps.find((s) => s.id === 'optimal-alternative')!;
    expect(optimal.output.cells[0]!.map((cell) => cell.value)).toEqual(fixture.input.optimal);
    expect(optimal.output.rows[0]).toMatchObject({ id: ARAS_OPTIMAL });
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
    assertDeterministic(arasMethod, withOptimal());
    assertDeterministic(arasMethod, crispInput(fixture.input));
  });
});

describe('ARAS: the optimal alternative', () => {
  const base = crispInput(fixture.input);

  it('defaults to the best value of every column when none is entered', () => {
    const record = run(base);
    const optimal = record.trace.steps.find((s) => s.id === 'optimal-alternative')!;
    const best = base.matrix.criteria.map((criterion, j) => {
      const column = base.matrix.values.map((row) => row[j] as number);
      return criterion.direction === 'benefit' ? Math.max(...column) : Math.min(...column);
    });
    expect(optimal.output.cells[0]!.map((cell) => cell.value)).toEqual(best);
    expect(optimal.formulas.map((f) => f.id)).toEqual(['optimal-benefit', 'optimal-cost']);
    // No alternative can be better than the default optimum: K_i ≤ 1.
    for (const k of record.result.utilityDegree) expect(k).toBeLessThanOrEqual(1);
    expect(record.warnings).toEqual([]);
  });

  it('gives the same result for an entered optimum equal to the default', () => {
    const defaulted = run(base);
    const best = defaulted.trace.steps.find((s) => s.id === 'optimal-alternative')!.output
      .cells[0]!;
    const entered = run({
      ...base,
      optimal: crispWeights(
        base.matrix.criteria.map((c) => c.id),
        best.map((cell) => cell.value as number),
      ),
    });
    expect(entered.result.utilityDegree).toEqual(defaulted.result.utilityDegree);
  });

  it('ranks by the sums S_i, since K_i divides every S_i by the same S_0', () => {
    const record = run(withOptimal());
    const sums = record.trace.steps.find((s) => s.id === 'sums')!.output.cells.slice(1);
    const order = (xs: readonly number[]) => xs.map((_, i) => i).sort((a, b) => xs[b]! - xs[a]!);
    expect(order(record.result.utilityDegree)).toEqual(
      order(sums.map((row) => row[0]!.value as number)),
    );
  });

  it('warns for an entered value worse than the best alternative, and still runs', () => {
    const matrix = smallMatrix(
      [
        [4, 2],
        [6, 2],
      ],
      ['benefit', 'cost'],
    );
    const value: ArasInput = {
      matrix,
      weights: smallWeights(0.5, 0.5),
      optimal: crispWeights(['c1', 'c2'], [5, 2]),
    };
    const record = run(value);
    expect(record.warnings.map((w) => w.code)).toEqual([
      ARAS_ISSUE_CODES.optimalWorseThanAlternative,
    ]);
    expect(record.warnings[0]).toMatchObject({ location: { column: { id: 'c1' } } });
    // 6 beats the optimum 5 on c1 and ties it on c2, so the second alternative has K > 1.
    expect(Math.max(...record.result.utilityDegree)).toBeGreaterThan(1);
  });
});

describe('ARAS: properties', () => {
  const sample = (values: number[][], directions: ('benefit' | 'cost')[], weights: number[]) => ({
    matrix: smallMatrix(values, directions),
    weights: smallWeights(...weights),
  });

  it('is K_i = S_i / S_0 with S computed by hand for a two-criterion example', () => {
    // Optimum (6, 2). Benefit column 4, 6, 6 sums to 16; cost 1/2, 1/3, 1/2 sums to 4/3.
    const record = run(
      sample(
        [
          [4, 3],
          [6, 2],
        ],
        ['benefit', 'cost'],
        [0.5, 0.5],
      ),
    );
    const s0 = 0.5 * (6 / 16) + 0.5 * (1 / 2 / (1 / 2 + 1 / 3 + 1 / 2));
    const s1 = 0.5 * (4 / 16) + 0.5 * (1 / 3 / (1 / 2 + 1 / 3 + 1 / 2));
    expect(record.result.utilityDegree[0]).toBeCloseTo(s1 / s0, 14);
    expect(record.result.utilityDegree[1]).toBeCloseTo(1, 14);
  });

  it('does not depend on the order of the alternatives', () => {
    const base = withOptimal();
    const order = [13, 0, 6, 2, 9, 1, 12, 3, 10, 4, 7, 5, 11, 8];
    const shuffled: ArasInput = {
      ...base,
      matrix: {
        criteria: base.matrix.criteria,
        alternatives: order.map((i) => base.matrix.alternatives[i]!),
        values: order.map((i) => base.matrix.values[i]!),
      },
    };
    const byId = (record: ReturnType<typeof run>) =>
      Object.fromEntries(record.result.ranking.map((item) => [item.alternativeId, item.rank]));
    expect(byId(run(shuffled))).toEqual(byId(run()));
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

  it('ignores the scale of the weights: K and the ranking stay', () => {
    const base = withOptimal();
    const scaled: ArasInput = {
      ...base,
      weights: {
        numberType: 'crisp',
        entries: base.weights.entries.map((e) => ({ ...e, value: e.value * 3 })),
      },
    };
    const a = run(base);
    const b = run(scaled);
    b.result.utilityDegree.forEach((k, i) => expect(k).toBeCloseTo(a.result.utilityDegree[i]!, 12));
    expect(b.warnings).toEqual([]);
  });

  it('is invariant to a positive scale of one criterion, optimum included', () => {
    const a = run({
      ...sample(
        [
          [3, 6],
          [4, 8],
          [5, 1],
        ],
        ['benefit', 'cost'],
        [0.4, 0.6],
      ),
    });
    const b = run({
      ...sample(
        [
          [3, 6000],
          [4, 8000],
          [5, 1000],
        ],
        ['benefit', 'cost'],
        [0.4, 0.6],
      ),
    });
    b.result.utilityDegree.forEach((k, i) => expect(k).toBeCloseTo(a.result.utilityDegree[i]!, 12));
  });
});

describe('ARAS: validation', () => {
  const codes = (value: unknown) =>
    validateMethodRun(arasMethod, value as ArasInput).errors.map((issue) => issue.code);
  const matrix = smallMatrix(
    [
      [4, 2],
      [6, 3],
    ],
    ['benefit', 'cost'],
  );
  const weights = smallWeights(0.5, 0.5);

  it('accepts the reference input, with and without the optimal alternative', () => {
    expect(validateMethodRun(arasMethod, withOptimal()).ok).toBe(true);
    expect(validateMethodRun(arasMethod, crispInput(fixture.input)).ok).toBe(true);
  });

  it('rejects malformed input and negative data', () => {
    expect(codes(undefined)).toEqual(['input.malformed']);
    expect(codes({ matrix })).toEqual(['input.malformed']);
    expect(
      codes({
        matrix: smallMatrix(
          [
            [4, 2],
            [-6, 3],
          ],
          ['benefit', 'cost'],
        ),
        weights,
      }),
    ).toEqual(['matrix.negative-value']);
  });

  it('rejects an alternative that uses the id of the optimal row', () => {
    const reserved = {
      ...matrix,
      alternatives: matrix.alternatives.map((a, i) => (i === 0 ? { ...a, id: ARAS_OPTIMAL } : a)),
    };
    expect(codes({ matrix: reserved, weights })).toEqual([ARAS_ISSUE_CODES.reservedAlternativeId]);
  });

  it('rejects an incomplete, repeated, unknown or invalid optimal alternative', () => {
    expect(codes({ matrix, weights, optimal: crispWeights(['c1'], [6]) })).toEqual([
      ARAS_ISSUE_CODES.optimalMismatch,
    ]);
    expect(
      codes({ matrix, weights, optimal: crispWeights(['c1', 'c1', 'c2'], [6, 6, 2]) }),
    ).toEqual([ARAS_ISSUE_CODES.optimalMismatch]);
    expect(codes({ matrix, weights, optimal: crispWeights(['c1', 'c3'], [6, 2]) })).toEqual([
      ARAS_ISSUE_CODES.optimalMismatch,
      ARAS_ISSUE_CODES.optimalMismatch,
    ]);
    expect(codes({ matrix, weights, optimal: crispWeights(['c1', 'c2'], [-1, 2]) })).toEqual([
      ARAS_ISSUE_CODES.invalidOptimalValue,
    ]);
    expect(codes({ matrix, weights, optimal: { numberType: 'tfn', entries: [] } })).toEqual([
      'input.malformed',
    ]);
  });

  it('rejects a zero in a cost criterion, in the data or in the optimal row', () => {
    const result = validateMethodRun(arasMethod, {
      matrix: smallMatrix(
        [
          [4, 0],
          [6, 3],
        ],
        ['benefit', 'cost'],
      ),
      weights,
    });
    expect(result.errors).toMatchObject([
      {
        code: ARAS_ISSUE_CODES.zeroCostValue,
        location: { row: { id: 'a1' }, column: { id: 'c2' } },
      },
    ]);
    expect(codes({ matrix, weights, optimal: crispWeights(['c1', 'c2'], [6, 0]) })).toEqual([
      ARAS_ISSUE_CODES.zeroCostValue,
    ]);
  });

  it('rejects a benefit criterion that is zero everywhere, the optimum included', () => {
    expect(
      codes({
        matrix: smallMatrix(
          [
            [0, 2],
            [0, 3],
          ],
          ['benefit', 'cost'],
        ),
        weights,
        optimal: crispWeights(['c1', 'c2'], [0, 2]),
      }),
    ).toEqual([ARAS_ISSUE_CODES.zeroBenefitSum]);
  });

  it('rejects an optimal alternative whose weighted sum S_0 is 0', () => {
    expect(
      codes({
        matrix: smallMatrix(
          [
            [4, 2],
            [6, 3],
          ],
          ['benefit', 'benefit'],
        ),
        weights: smallWeights(1, 0),
        optimal: crispWeights(['c1', 'c2'], [0, 5]),
      }),
    ).toEqual([ARAS_ISSUE_CODES.zeroOptimalSum]);
  });
});
