import { EngineError } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import {
  TFN_NUMBER_TYPE,
  fromCrisp,
  fromTuple,
  isDegenerate,
  isTfn,
  tfn,
  tfnEquals,
  tfnProblem,
  toTuple,
} from './index';

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof EngineError ? error.code : 'other';
  }
  return undefined;
}

describe('TFN type and validation', () => {
  it('builds a TFN from ordered, finite components', () => {
    expect(tfn(1, 2, 3)).toEqual({ l: 1, m: 2, u: 3 });
    expect(tfn(-3, -2, -1)).toEqual({ l: -3, m: -2, u: -1 });
    expect(tfn(2, 2, 5)).toEqual({ l: 2, m: 2, u: 5 });
    expect(tfn(2, 5, 5)).toEqual({ l: 2, m: 5, u: 5 });
    expect(TFN_NUMBER_TYPE).toBe('tfn');
  });

  it('rejects l > m and m > u', () => {
    expect(errorCode(() => tfn(2, 1, 3))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => tfn(1, 3, 2))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => tfn(3, 2, 1))).toBe('INVALID_ARGUMENT');
  });

  it('rejects components that are not finite', () => {
    expect(errorCode(() => tfn(Number.NaN, 1, 2))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfn(1, 2, Number.POSITIVE_INFINITY))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => tfn(Number.NEGATIVE_INFINITY, 0, 1))).toBe('NON_FINITE_VALUE');
  });

  it('never stores a negative zero', () => {
    const value = tfn(-0, -0, 0);
    expect(Object.is(value.l, 0)).toBe(true);
    expect(Object.is(value.m, 0)).toBe(true);
  });

  it('names the problem of an invalid value without throwing', () => {
    expect(tfnProblem({ l: 1, m: 2, u: 3 })).toBeUndefined();
    expect(tfnProblem({ l: 1, m: 1, u: 1 })).toBeUndefined();
    expect(tfnProblem({ l: 2, m: 1, u: 3 })).toBe('order');
    expect(tfnProblem({ l: 1, m: 3, u: 2 })).toBe('order');
    expect(tfnProblem({ l: 1, m: Number.NaN, u: 2 })).toBe('non-finite');
    expect(tfnProblem({ l: 1, m: 2, u: Number.POSITIVE_INFINITY })).toBe('non-finite');
    expect(tfnProblem({ l: 1, m: 2 })).toBe('not-a-tfn');
    expect(tfnProblem({ l: '1', m: 2, u: 3 })).toBe('not-a-tfn');
    expect(tfnProblem([1, 2, 3])).toBe('not-a-tfn');
    expect(tfnProblem(5)).toBe('not-a-tfn');
    expect(tfnProblem(null)).toBe('not-a-tfn');
    expect(tfnProblem(undefined)).toBe('not-a-tfn');
    expect(isTfn({ l: 1, m: 2, u: 3 })).toBe(true);
    expect(isTfn({ l: 3, m: 2, u: 1 })).toBe(false);
  });

  it('converts crisp numbers and tuples', () => {
    expect(fromCrisp(4)).toEqual({ l: 4, m: 4, u: 4 });
    expect(errorCode(() => fromCrisp(Number.NaN))).toBe('NON_FINITE_VALUE');
    expect(fromTuple([1, 2, 3])).toEqual({ l: 1, m: 2, u: 3 });
    expect(errorCode(() => fromTuple([3, 2, 1]))).toBe('INVALID_ARGUMENT');
    expect(toTuple(tfn(1, 2, 3))).toEqual([1, 2, 3]);
  });

  it('recognises degenerate and equal TFNs', () => {
    expect(isDegenerate(tfn(2, 2, 2))).toBe(true);
    expect(isDegenerate(tfn(2, 2, 3))).toBe(false);
    expect(isDegenerate(tfn(1, 2, 2))).toBe(false);
    expect(tfnEquals(tfn(1, 2, 3), tfn(1, 2, 3))).toBe(true);
    expect(tfnEquals(tfn(1, 2, 3), tfn(1, 2, 4))).toBe(false);
    expect(tfnEquals(tfn(1, 2, 3), tfn(1, 1, 3))).toBe(false);
    expect(tfnEquals(tfn(1, 2, 3), tfn(0, 2, 3))).toBe(false);
  });
});
