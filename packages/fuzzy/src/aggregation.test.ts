import { EngineError } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import {
  tfn,
  tfnArithmeticMean,
  tfnGeometricMean,
  tfnMax,
  tfnMin,
  tfnMinMeanMax,
  tfnNorm,
  tfnSum,
} from './index';

const judgements = [tfn(1, 2, 4), tfn(3, 5, 6), tfn(2, 2, 8)];

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof EngineError ? error.code : 'other';
  }
  return undefined;
}

describe('TFN norm', () => {
  it('is the vector norm of each component', () => {
    // sqrt(1 + 9 + 4), sqrt(4 + 25 + 4), sqrt(16 + 36 + 64)
    const norm = tfnNorm(judgements);
    expect(norm.l).toBeCloseTo(Math.sqrt(14), 14);
    expect(norm.m).toBeCloseTo(Math.sqrt(33), 14);
    expect(norm.u).toBeCloseTo(Math.sqrt(116), 14);
  });

  it('is the crisp norm for degenerate TFNs', () => {
    expect(tfnNorm([tfn(3, 3, 3), tfn(4, 4, 4)])).toEqual({ l: 5, m: 5, u: 5 });
  });

  it('refuses a TFN with a negative part', () => {
    expect(errorCode(() => tfnNorm([tfn(-1, 0, 1)]))).toBe('INVALID_ARGUMENT');
  });
});

describe('TFN aggregation', () => {
  it('sums component by component', () => {
    expect(tfnSum(judgements)).toEqual({ l: 6, m: 9, u: 18 });
    expect(tfnSum([tfn(1, 2, 3)])).toEqual({ l: 1, m: 2, u: 3 });
  });

  it('takes component-wise extremes, which need not be one of the operands', () => {
    expect(tfnMin(judgements)).toEqual({ l: 1, m: 2, u: 4 });
    expect(tfnMax(judgements)).toEqual({ l: 3, m: 5, u: 8 });
    // The ideal of criterion C4 in the Fuzzy MARCOS example mixes two ratings like this.
    expect(tfnMax([tfn(7, 7, 9), tfn(5, 7, 7)])).toEqual({ l: 7, m: 7, u: 9 });
    expect(tfnMin([tfn(1, 3, 3), tfn(1, 1, 3), tfn(3, 3, 5)])).toEqual({ l: 1, m: 1, u: 3 });
  });

  it('averages arithmetically', () => {
    expect(tfnArithmeticMean(judgements)).toEqual({ l: 2, m: 3, u: 6 });
  });

  it('averages geometrically', () => {
    // √(1·4) = 2, √(2·8) = 4, √(4·9) = 6
    const pair = tfnGeometricMean([tfn(1, 2, 4), tfn(4, 8, 9)]);
    expect(pair.l).toBeCloseTo(2, 14);
    expect(pair.m).toBeCloseTo(4, 14);
    expect(pair.u).toBeCloseTo(6, 14);
    // ∛(1·3·9) = 3, ∛(2·4·9) = ∛72, ∛(5·5·9) = ∛225
    const triple = tfnGeometricMean([tfn(1, 2, 5), tfn(3, 4, 5), tfn(9, 9, 9)]);
    expect(triple.l).toBeCloseTo(3, 14);
    expect(triple.m).toBeCloseTo(4.160167646103808, 12);
    expect(triple.u).toBeCloseTo(Math.cbrt(225), 12);
    // A zero lower bound gives a zero lower bound.
    expect(tfnGeometricMean([tfn(0, 1, 4), tfn(4, 4, 4)])).toEqual({ l: 0, m: 2, u: 4 });
  });

  it('keeps the geometric mean accurate when the product leaves the floating-point range', () => {
    const tiny = Array.from({ length: 400 }, () => tfn(0.001, 0.01, 0.1));
    const small = tfnGeometricMean(tiny);
    expect(small.l).toBeCloseTo(0.001, 14);
    expect(small.m).toBeCloseTo(0.01, 13);
    expect(small.u).toBeCloseTo(0.1, 12);
    const huge = tfnGeometricMean(Array.from({ length: 400 }, () => tfn(10, 100, 1000)));
    expect(huge.l / 10).toBeCloseTo(1, 12);
    expect(huge.m / 100).toBeCloseTo(1, 12);
    expect(huge.u / 1000).toBeCloseTo(1, 12);
  });

  it('refuses a geometric mean of TFNs with negative parts', () => {
    expect(errorCode(() => tfnGeometricMean([tfn(-1, 2, 3), tfn(1, 2, 3)]))).toBe(
      'INVALID_ARGUMENT',
    );
  });

  it('combines the widest support with the mean of the modal values', () => {
    expect(tfnMinMeanMax(judgements)).toEqual({ l: 1, m: 3, u: 8 });
  });

  it('keeps l ≤ m ≤ u when the mean of equal numbers is off in the last digit', () => {
    // (0.1 + 0.1 + 0.1) / 3 is 0.10000000000000002 in floating point.
    const same = [tfn(0.1, 0.1, 0.1), tfn(0.1, 0.1, 0.1), tfn(0.1, 0.1, 0.1)];
    expect(tfnMinMeanMax(same)).toEqual({ l: 0.1, m: 0.1, u: 0.1 });
  });

  it('needs at least one operand', () => {
    for (const aggregate of [
      tfnSum,
      tfnMin,
      tfnMax,
      tfnArithmeticMean,
      tfnGeometricMean,
      tfnMinMeanMax,
      tfnNorm,
    ]) {
      expect(errorCode(() => aggregate([]))).toBe('INVALID_ARGUMENT');
    }
  });
});
