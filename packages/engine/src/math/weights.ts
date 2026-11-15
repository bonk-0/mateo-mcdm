import { sum } from './reduce';

/**
 * Scales non-negative weights so they sum to 1. Returns `undefined` when that is not
 * possible (empty list, a negative or non-finite weight, or a zero sum) instead of
 * inventing weights.
 */
export function normalizeWeights(values: readonly number[]): number[] | undefined {
  if (values.length === 0) return undefined;
  if (!values.every((value) => Number.isFinite(value) && value >= 0)) return undefined;
  const total = sum(values);
  if (!(total > 0) || !Number.isFinite(total)) return undefined;
  return values.map((value) => value / total);
}
