/**
 * Hand-checked values for every arithmetic function. The numbers are chosen so that each
 * result is exact in binary floating point and can be compared with `toEqual`.
 */
import { EngineError } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import {
  tfn,
  tfnAdd,
  tfnAddScalar,
  tfnDivide,
  tfnDivideByScalar,
  tfnMultiply,
  tfnMultiplyByScalar,
  tfnScalarDividedBy,
  tfnScalarMinus,
  tfnSubtract,
  tfnSubtractScalar,
} from './index';

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof EngineError ? error.code : 'other';
  }
  return undefined;
}

describe('TFN arithmetic', () => {
  it('adds component by component', () => {
    expect(tfnAdd(tfn(1, 2, 3), tfn(4, 5, 7))).toEqual({ l: 5, m: 7, u: 10 });
    expect(tfnAdd(tfn(-2, -1, 0), tfn(1, 2, 3))).toEqual({ l: -1, m: 1, u: 3 });
  });

  it('subtracts with crossed end points', () => {
    // (4, 5, 7) ⊖ (1, 2, 3) = (4 − 3, 5 − 2, 7 − 1)
    expect(tfnSubtract(tfn(4, 5, 7), tfn(1, 2, 3))).toEqual({ l: 1, m: 3, u: 6 });
    // a ⊖ a is not zero: the spread adds up.
    expect(tfnSubtract(tfn(1, 2, 3), tfn(1, 2, 3))).toEqual({ l: -2, m: 0, u: 2 });
  });

  it('multiplies non-negative TFNs component by component', () => {
    expect(tfnMultiply(tfn(1, 2, 3), tfn(4, 5, 6))).toEqual({ l: 4, m: 10, u: 18 });
    expect(tfnMultiply(tfn(0, 2, 4), tfn(0.5, 0.5, 2))).toEqual({ l: 0, m: 1, u: 8 });
  });

  it('multiplies TFNs with negative parts through the end-point products', () => {
    // (−1, 2, 3) ⊗ (4, 5, 6): products −4, −6, 12, 18.
    expect(tfnMultiply(tfn(-1, 2, 3), tfn(4, 5, 6))).toEqual({ l: -6, m: 10, u: 18 });
    // (−3, −2, −1) ⊗ (4, 5, 6): products −12, −18, −4, −6.
    expect(tfnMultiply(tfn(-3, -2, -1), tfn(4, 5, 6))).toEqual({ l: -18, m: -10, u: -4 });
    // (−3, −2, −1) ⊗ (−6, −5, −4): products 18, 12, 6, 4.
    expect(tfnMultiply(tfn(-3, -2, -1), tfn(-6, -5, -4))).toEqual({ l: 4, m: 10, u: 18 });
    // (−2, 1, 3) ⊗ (−1, 2, 4): products 2, −8, −3, 12.
    expect(tfnMultiply(tfn(-2, 1, 3), tfn(-1, 2, 4))).toEqual({ l: -8, m: 2, u: 12 });
  });

  it('divides positive TFNs as (l₁/u₂, m₁/m₂, u₁/l₂)', () => {
    expect(tfnDivide(tfn(2, 4, 8), tfn(1, 2, 4))).toEqual({ l: 0.5, m: 2, u: 8 });
    // The step of IMF SWARA: q̃ = (1, 1, 1) ⊘ k̃.
    expect(tfnDivide(tfn(1, 1, 1), tfn(1.25, 2, 4))).toEqual({ l: 0.25, m: 0.5, u: 0.8 });
    expect(tfnDivide(tfn(0, 0, 0), tfn(1, 2, 4))).toEqual({ l: 0, m: 0, u: 0 });
  });

  it('divides TFNs with negative parts through the end-point quotients', () => {
    // (−4, 2, 8) ⊘ (1, 2, 4): quotients −4, −1, 8, 2.
    expect(tfnDivide(tfn(-4, 2, 8), tfn(1, 2, 4))).toEqual({ l: -4, m: 1, u: 8 });
    // (2, 4, 8) ⊘ (−4, −2, −1): quotients −0.5, −2, −2, −8.
    expect(tfnDivide(tfn(2, 4, 8), tfn(-4, -2, -1))).toEqual({ l: -8, m: -2, u: -0.5 });
  });

  it('refuses to divide by a TFN that contains zero', () => {
    expect(errorCode(() => tfnDivide(tfn(1, 2, 3), tfn(0, 1, 2)))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnDivide(tfn(1, 2, 3), tfn(-1, 1, 2)))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnDivide(tfn(1, 2, 3), tfn(-2, -1, 0)))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnDivide(tfn(1, 2, 3), tfn(0, 0, 0)))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnScalarDividedBy(1, tfn(0, 1, 2)))).toBe('NON_FINITE_VALUE');
  });

  it('adds and subtracts a scalar', () => {
    // IMF SWARA: k̃ = s̃ ⊕ 1.
    expect(tfnAddScalar(tfn(0.25, 0.5, 0.75), 1)).toEqual({ l: 1.25, m: 1.5, u: 1.75 });
    expect(tfnSubtractScalar(tfn(1, 2, 3), 0.5)).toEqual({ l: 0.5, m: 1.5, u: 2.5 });
    // 2 − (1, 1.5, 1.75) = (0.25, 0.5, 1)
    expect(tfnScalarMinus(2, tfn(1, 1.5, 1.75))).toEqual({ l: 0.25, m: 0.5, u: 1 });
  });

  it('multiplies and divides by a scalar, swapping the end points for a negative one', () => {
    expect(tfnMultiplyByScalar(tfn(1, 2, 3), 2)).toEqual({ l: 2, m: 4, u: 6 });
    expect(tfnMultiplyByScalar(tfn(1, 2, 3), -2)).toEqual({ l: -6, m: -4, u: -2 });
    expect(tfnMultiplyByScalar(tfn(-1, 2, 3), 0)).toEqual({ l: 0, m: 0, u: 0 });
    // Fuzzy MARCOS, benefit criterion: every component divided by x^u of the ideal.
    expect(tfnDivideByScalar(tfn(3, 5, 5), 8)).toEqual({ l: 0.375, m: 0.625, u: 0.625 });
    expect(tfnDivideByScalar(tfn(2, 4, 8), -2)).toEqual({ l: -4, m: -2, u: -1 });
    expect(errorCode(() => tfnDivideByScalar(tfn(1, 2, 3), 0))).toBe('NON_FINITE_VALUE');
  });

  it('divides a scalar by a TFN', () => {
    // Fuzzy MARCOS, cost criterion: (x^l_id / x^u, x^l_id / x^m, x^l_id / x^l).
    expect(tfnScalarDividedBy(1, tfn(1, 2, 4))).toEqual({ l: 0.25, m: 0.5, u: 1 });
    expect(tfnScalarDividedBy(-2, tfn(1, 2, 4))).toEqual({ l: -2, m: -1, u: -0.5 });
    expect(tfnScalarDividedBy(2, tfn(-4, -2, -1))).toEqual({ l: -2, m: -1, u: -0.5 });
    expect(tfnScalarDividedBy(0, tfn(1, 2, 4))).toEqual({ l: 0, m: 0, u: 0 });
  });

  it('rejects scalars that are not finite', () => {
    const a = tfn(1, 2, 3);
    expect(errorCode(() => tfnAddScalar(a, Number.NaN))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnSubtractScalar(a, Number.POSITIVE_INFINITY))).toBe(
      'NON_FINITE_VALUE',
    );
    expect(errorCode(() => tfnScalarMinus(Number.NaN, a))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnMultiplyByScalar(a, Number.NaN))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnDivideByScalar(a, Number.NaN))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfnScalarDividedBy(Number.NEGATIVE_INFINITY, a))).toBe(
      'NON_FINITE_VALUE',
    );
  });

  it('never returns a negative zero', () => {
    const product = tfnMultiplyByScalar(tfn(0, 0, 0), -1);
    expect(Object.is(product.l, 0) && Object.is(product.m, 0) && Object.is(product.u, 0)).toBe(
      true,
    );
    const difference = tfnScalarMinus(0, tfn(0, 0, 0));
    expect(Object.is(difference.l, 0)).toBe(true);
  });
});
