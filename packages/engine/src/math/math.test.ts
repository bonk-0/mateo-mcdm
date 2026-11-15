import { describe, expect, it } from 'vitest';
import { EngineError } from '../errors';
import { sampleMatrix } from '../__fixtures__/sample';
import { createTraceBuilder } from '../trace/builder';
import { verifyTrace } from '../trace/verify';
import { NORMALIZATION_VARIANTS, normalizeColumn, normalizeValues } from './normalize';
import { rankOrder, rankValues } from './rank';
import {
  maximum,
  mean,
  minimum,
  product,
  sum,
  sumOfReciprocals,
  sumOfSquares,
  weightedSum,
} from './reduce';
import { normalizeWeights } from './weights';

describe('reductions', () => {
  it('computes hand-checked values', () => {
    expect(sum([1, 2, 3.5])).toBe(6.5);
    expect(sum([])).toBe(0);
    expect(product([2, 3, 4])).toBe(24);
    expect(product([])).toBe(1);
    expect(sumOfSquares([3, 4])).toBe(25);
    expect(sumOfReciprocals([2, 4])).toBe(0.75);
    expect(mean([2, 4, 9])).toBe(5);
    expect(weightedSum([10, 20], [0.25, 0.75])).toBe(17.5);
    expect(minimum([3, -1, 2])).toBe(-1);
    expect(maximum([3, -1, 2])).toBe(3);
  });

  it('adds strictly left to right', () => {
    expect(sum([0.1, 0.2, 0.3])).toBe(0.1 + 0.2 + 0.3);
    expect(sum([0.3, 0.2, 0.1])).toBe(0.3 + 0.2 + 0.1);
  });

  it('returns NaN rather than a made-up value for undefined cases', () => {
    expect(mean([])).toBeNaN();
    expect(minimum([])).toBeNaN();
    expect(maximum([])).toBeNaN();
    expect(minimum([1, Number.NaN])).toBeNaN();
    expect(maximum([Number.NaN, 1])).toBeNaN();
    expect(weightedSum([1, 2], [1])).toBeNaN();
  });
});

describe('normalizeWeights', () => {
  it('scales to a sum of 1', () => {
    expect(normalizeWeights([2, 6])).toEqual([0.25, 0.75]);
  });

  it('refuses inputs that cannot be normalized', () => {
    expect(normalizeWeights([])).toBeUndefined();
    expect(normalizeWeights([0, 0])).toBeUndefined();
    expect(normalizeWeights([1, -1])).toBeUndefined();
    expect(normalizeWeights([1, Number.NaN])).toBeUndefined();
    expect(normalizeWeights([Number.MAX_VALUE, Number.MAX_VALUE])).toBeUndefined();
  });
});

describe('rankValues', () => {
  const scores = [7, 9, 5, 7];

  it('ranks descending with competition ties by default', () => {
    expect(rankValues(scores)).toEqual([2, 1, 4, 2]);
  });

  it('supports every tie rule', () => {
    expect(rankValues(scores, { ties: 'dense' })).toEqual([2, 1, 3, 2]);
    expect(rankValues(scores, { ties: 'fractional' })).toEqual([2.5, 1, 4, 2.5]);
    expect(rankValues(scores, { ties: 'ordinal' })).toEqual([2, 1, 4, 3]);
  });

  it('ranks ascending', () => {
    expect(rankValues(scores, { order: 'ascending' })).toEqual([2, 4, 1, 2]);
    expect(rankValues(scores, { order: 'ascending', ties: 'ordinal' })).toEqual([2, 4, 1, 3]);
  });

  it('treats floating-point noise as a tie by default and not with tolerance 0', () => {
    const noisy = [0.1 + 0.2, 0.3, 0.2];
    expect(noisy[0]).not.toBe(noisy[1]);
    expect(rankValues(noisy)).toEqual([1, 1, 3]);
    expect(rankValues(noisy, { tolerance: 0 })).toEqual([1, 2, 3]);
    // Inside a tolerance tie the input position decides, not the noise.
    expect(rankValues([0.3, 0.1 + 0.2], { ties: 'ordinal' })).toEqual([1, 2]);
  });

  it('handles empty and single inputs', () => {
    expect(rankValues([])).toEqual([]);
    expect(rankValues([42])).toEqual([1]);
  });

  it('rejects non-finite scores and bad tolerances', () => {
    expect(() => rankValues([1, Number.NaN])).toThrow(EngineError);
    expect(() => rankValues([1, Number.POSITIVE_INFINITY])).toThrow(EngineError);
    expect(() => rankValues([1], { tolerance: -1 })).toThrow(EngineError);
    expect(() => rankValues([1], { tolerance: Number.NaN })).toThrow(EngineError);
  });

  it('is equivariant under permutation of the input', () => {
    const base = [3.2, 8.1, 8.1, 0.5, 6, 3.2, 9.9];
    const permutation = [4, 0, 6, 2, 5, 1, 3];
    const shuffled = permutation.map((index) => base[index] as number);
    for (const ties of ['competition', 'dense', 'fractional'] as const) {
      const ranks = rankValues(base, { ties });
      expect(rankValues(shuffled, { ties })).toEqual(permutation.map((index) => ranks[index]));
    }
  });
});

describe('rankOrder', () => {
  it('lists indices from best to worst, stable among ties', () => {
    expect(rankOrder([7, 9, 5, 7])).toEqual([1, 0, 3, 2]);
    expect(rankOrder([7, 9, 5, 7], { order: 'ascending' })).toEqual([2, 0, 3, 1]);
  });
});

describe('normalizeValues', () => {
  const values = [10, 20, 5];
  const close = (actual: number[], expected: number[]) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index] as number, 12));
  };

  it('max', () => {
    close(normalizeValues(values, 'benefit', 'max'), [0.5, 1, 0.25]);
    close(normalizeValues(values, 'cost', 'max'), [0.5, 0.25, 1]);
  });

  it('max-complement', () => {
    close(normalizeValues(values, 'benefit', 'max-complement'), [0.5, 1, 0.25]);
    close(normalizeValues(values, 'cost', 'max-complement'), [0.5, 0, 0.75]);
  });

  it('sum', () => {
    close(normalizeValues(values, 'benefit', 'sum'), [10 / 35, 20 / 35, 5 / 35]);
    // reciprocals 0.1, 0.05, 0.2 sum to 0.35
    close(normalizeValues(values, 'cost', 'sum'), [0.1 / 0.35, 0.05 / 0.35, 0.2 / 0.35]);
  });

  it('vector', () => {
    const norm = Math.sqrt(525);
    close(normalizeValues(values, 'benefit', 'vector'), [10 / norm, 20 / norm, 5 / norm]);
    close(normalizeValues(values, 'cost', 'vector'), [1 - 10 / norm, 1 - 20 / norm, 1 - 5 / norm]);
    close(normalizeValues([3, 4], 'benefit', 'vector'), [0.6, 0.8]);
  });

  it('min-max', () => {
    close(normalizeValues(values, 'benefit', 'min-max'), [1 / 3, 1, 0]);
    close(normalizeValues(values, 'cost', 'min-max'), [2 / 3, 0, 1]);
  });

  it('benefit normalizations of the sum variant add up to 1', () => {
    expect(normalizeValues(values, 'benefit', 'sum').reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(normalizeValues(values, 'cost', 'sum').reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('throws instead of returning a non-finite value', () => {
    expect(() => normalizeValues([0, 0], 'benefit', 'max')).toThrow(EngineError);
    expect(() => normalizeValues([0, 2], 'cost', 'max')).toThrow(EngineError);
    expect(() => normalizeValues([4, 4], 'benefit', 'min-max')).toThrow(EngineError);
    expect(() => normalizeValues([], 'benefit', 'max')).toThrow(EngineError);
  });

  it('covers every variant in both directions', () => {
    for (const variant of NORMALIZATION_VARIANTS) {
      for (const direction of ['benefit', 'cost'] as const) {
        const result = normalizeValues(values, direction, variant);
        expect(result.every((value) => Number.isFinite(value))).toBe(true);
      }
    }
  });
});

describe('traced normalization', () => {
  it('agrees with the plain form and records auditable derivations for every variant', () => {
    const matrix = sampleMatrix();
    for (const variant of NORMALIZATION_VARIANTS) {
      const tb = createTraceBuilder({ methodId: 'n', methodVersion: '1.0.0' });
      const x = tb.inputMatrix({ id: 'x', nameKey: 'n', explanationKey: 'e', matrix });
      const columns = matrix.criteria.map((criterion, j) =>
        normalizeColumn(variant, criterion.direction, x.column(j), {
          value: 'x',
          max: 'max',
          min: 'min',
          sum: 'sum',
          norm: 'norm',
        }),
      );
      const n = tb.table({
        id: 'normalized',
        nameKey: 'n',
        explanationKey: 'e',
        rows: x.rows,
        columns: x.columns,
        cell: (row, column) => columns[column.index]![row.index]!,
      });
      matrix.criteria.forEach((criterion, j) => {
        const plain = normalizeValues(
          matrix.values.map((cells) => cells[j] as number),
          criterion.direction,
          variant,
        );
        expect(n.values().map((cells) => cells[j])).toEqual(plain);
      });
      expect(verifyTrace(tb.build(), { requireKnownOperations: true })).toEqual([]);
    }
  });
});
