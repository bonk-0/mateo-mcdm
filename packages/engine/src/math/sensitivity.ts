import { EngineError } from '../errors';
import { sum } from './reduce';

/**
 * How the weight that is left over is shared when one weight is set by hand.
 *
 * - `proportional`: the other weights keep their proportions to each other (they are all
 *   multiplied by the same factor). This is the usual choice and the default.
 * - `equal`: the other weights are replaced by the same share each.
 */
export const WEIGHT_REDISTRIBUTIONS = ['proportional', 'equal'] as const;
export type WeightRedistribution = (typeof WEIGHT_REDISTRIBUTIONS)[number];

/**
 * Sets one weight and shares the remaining weight (1 − value) among the others, so the
 * result always sums to 1.
 *
 * `value` is clamped to [0, 1]. With `proportional`, if the other weights are all 0 the
 * remainder is shared equally, because there are no proportions to keep. With a single
 * weight the result is always `[1]`.
 *
 * Throws `INVALID_ARGUMENT` if `weights` is empty, holds a negative or non-finite value,
 * or `index` is out of range. It never returns weights that do not sum to 1.
 */
export function setWeight(
  weights: readonly number[],
  index: number,
  value: number,
  redistribution: WeightRedistribution = 'proportional',
): number[] {
  if (weights.length === 0 || !weights.every((item) => Number.isFinite(item) && item >= 0)) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      'Weights must be a non-empty list of non-negative numbers.',
    );
  }
  if (!Number.isInteger(index) || index < 0 || index >= weights.length) {
    throw new EngineError('INVALID_ARGUMENT', `Weight index ${String(index)} is out of range.`);
  }
  if (!Number.isFinite(value)) {
    throw new EngineError('INVALID_ARGUMENT', 'The new weight must be a finite number.');
  }
  const next = Math.min(1, Math.max(0, value));
  if (weights.length === 1) return [1];

  const others = sum(weights.filter((_, i) => i !== index));
  const remainder = 1 - next;
  const shared = remainder / (weights.length - 1);
  const result = weights.map((weight, i) => {
    if (i === index) return next;
    if (redistribution === 'proportional' && others > 0) return (weight / others) * remainder;
    return shared;
  });
  return result;
}

/**
 * `count` evenly spaced values from `from` to `to`, both included. `count` must be at
 * least 2. The last value is exactly `to`, so a sweep to 1 does not stop at 0.9999….
 */
export function sweepValues(from: number, to: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 2 || !Number.isFinite(from) || !Number.isFinite(to)) {
    throw new EngineError('INVALID_ARGUMENT', 'A sweep needs finite bounds and at least 2 points.');
  }
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? to : from + ((to - from) * i) / (count - 1),
  );
}
