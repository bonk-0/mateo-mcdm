import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EngineError } from '../errors';
import { sum } from './reduce';
import { setWeight, sweepValues, WEIGHT_REDISTRIBUTIONS } from './sensitivity';

const weightLists = fc
  .array(fc.double({ min: 0, max: 1000, noNaN: true }), { minLength: 1, maxLength: 12 })
  .filter((list) => sum(list) > 0)
  .map((list) => list.map((value) => value / sum(list)));

describe('setWeight', () => {
  it('keeps the proportions of the other weights (hand-checked)', () => {
    // 0.5 / 0.3 / 0.2, set the first to 0.2: the others share 0.8 in the ratio 3 : 2.
    const result = setWeight([0.5, 0.3, 0.2], 0, 0.2);
    expect(result[0]).toBe(0.2);
    expect(result[1]).toBeCloseTo(0.48, 12);
    expect(result[2]).toBeCloseTo(0.32, 12);
  });

  it('shares the remainder equally with the equal method', () => {
    const result = setWeight([0.5, 0.3, 0.2], 1, 0.4, 'equal');
    expect(result[0]).toBeCloseTo(0.3, 12);
    expect(result[1]).toBe(0.4);
    expect(result[2]).toBeCloseTo(0.3, 12);
  });

  it('shares equally when the other weights are all 0', () => {
    const result = setWeight([1, 0, 0], 0, 0.4);
    expect(result[0]).toBe(0.4);
    expect(result[1]).toBeCloseTo(0.3, 12);
    expect(result[2]).toBeCloseTo(0.3, 12);
  });

  it('clamps the value to [0, 1] and handles a single weight', () => {
    expect(setWeight([0.5, 0.5], 0, 2)).toEqual([1, 0]);
    expect(setWeight([0.5, 0.5], 0, -1)).toEqual([0, 1]);
    expect(setWeight([1], 0, 0.3)).toEqual([1]);
  });

  it('rejects invalid input', () => {
    expect(() => setWeight([], 0, 0.5)).toThrow(EngineError);
    expect(() => setWeight([0.5, -0.5], 0, 0.5)).toThrow(EngineError);
    expect(() => setWeight([0.5, 0.5], 2, 0.5)).toThrow(EngineError);
    expect(() => setWeight([0.5, 0.5], 0, Number.NaN)).toThrow(EngineError);
  });

  it('property: the weights sum to 1 and stay in [0, 1] after any move', () => {
    fc.assert(
      fc.property(
        weightLists,
        fc.nat(),
        fc.double({ min: -0.5, max: 1.5, noNaN: true }),
        fc.constantFrom(...WEIGHT_REDISTRIBUTIONS),
        (weights, rawIndex, value, redistribution) => {
          const index = rawIndex % weights.length;
          const result = setWeight(weights, index, value, redistribution);
          expect(result).toHaveLength(weights.length);
          expect(Math.abs(sum(result) - 1)).toBeLessThan(1e-12);
          expect(result.every((item) => item >= 0 && item <= 1)).toBe(true);
          expect(result[index]).toBe(weights.length === 1 ? 1 : Math.min(1, Math.max(0, value)));
        },
      ),
    );
  });

  it('property: a sequence of moves still sums to 1', () => {
    fc.assert(
      fc.property(
        weightLists,
        fc.array(fc.tuple(fc.nat(), fc.double({ min: 0, max: 1, noNaN: true })), { maxLength: 30 }),
        (weights, moves) => {
          let current = weights;
          for (const [rawIndex, value] of moves) {
            current = setWeight(current, rawIndex % current.length, value);
          }
          expect(Math.abs(sum(current) - 1)).toBeLessThan(1e-12);
        },
      ),
    );
  });

  it('property: proportional redistribution keeps the ratios of the other weights', () => {
    fc.assert(
      fc.property(
        weightLists.filter((list) => list.length >= 3),
        fc.double({ min: 0, max: 0.9, noNaN: true }),
        (weights, value) => {
          const result = setWeight(weights, 0, value);
          if (weights[1]! > 1e-9 && weights[2]! > 1e-9) {
            expect(result[1]! / result[2]!).toBeCloseTo(weights[1]! / weights[2]!, 6);
          }
        },
      ),
    );
  });
});

describe('sweepValues', () => {
  it('returns evenly spaced values including both ends', () => {
    expect(sweepValues(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(sweepValues(0.2, 0.6, 3)).toEqual([0.2, 0.4, 0.6]);
  });

  it('rejects fewer than 2 points', () => {
    expect(() => sweepValues(0, 1, 1)).toThrow(EngineError);
  });
});
