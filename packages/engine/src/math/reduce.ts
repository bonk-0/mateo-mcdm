/**
 * Plain numeric reductions. They run strictly left to right so the floating-point result
 * is the same on every run and platform.
 */

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function product(values: readonly number[]): number {
  let total = 1;
  for (const value of values) total *= value;
  return total;
}

export function sumOfSquares(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value * value;
  return total;
}

export function sumOfReciprocals(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += 1 / value;
  return total;
}

/** Arithmetic mean. `NaN` for an empty list. */
export function mean(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : sum(values) / values.length;
}

/** `Σ values[i] · weights[i]`. `NaN` when the lengths differ. */
export function weightedSum(values: readonly number[], weights: readonly number[]): number {
  if (values.length !== weights.length) return Number.NaN;
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total += (values[index] as number) * (weights[index] as number);
  }
  return total;
}

/** Smallest value. `NaN` for an empty list or when any value is `NaN`. */
export function minimum(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let result = Number.POSITIVE_INFINITY;
  for (const value of values) {
    if (Number.isNaN(value)) return Number.NaN;
    if (value < result) result = value;
  }
  return result;
}

/** Largest value. `NaN` for an empty list or when any value is `NaN`. */
export function maximum(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let result = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (Number.isNaN(value)) return Number.NaN;
    if (value > result) result = value;
  }
  return result;
}
