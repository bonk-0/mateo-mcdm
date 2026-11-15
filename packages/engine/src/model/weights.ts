import type { NumberTypeId } from './number-type';

export interface WeightEntry<T = number> {
  readonly criterionId: string;
  readonly value: T;
}

/**
 * Criterion weights, keyed by criterion id so a vector can never be silently applied in
 * the wrong column order. `T` is `number` for crisp weights or a fuzzy number type.
 */
export interface WeightVector<T = number> {
  readonly numberType: NumberTypeId;
  readonly entries: readonly WeightEntry<T>[];
}

/** Builds a crisp weight vector from parallel arrays. */
export function crispWeights(
  criterionIds: readonly string[],
  values: readonly number[],
): WeightVector {
  return {
    numberType: 'crisp',
    entries: criterionIds.map((criterionId, index) => ({
      criterionId,
      value: values[index] as number,
    })),
  };
}

/**
 * Weight values in the order of `criterionIds`. Entries are `undefined` where the vector
 * has no weight for a criterion; `checkWeights` reports those as validation errors.
 */
export function alignWeights<T>(
  weights: WeightVector<T>,
  criterionIds: readonly string[],
): (T | undefined)[] {
  const byId = new Map<string, T>();
  for (const entry of weights.entries) {
    if (!byId.has(entry.criterionId)) byId.set(entry.criterionId, entry.value);
  }
  return criterionIds.map((id) => byId.get(id));
}
