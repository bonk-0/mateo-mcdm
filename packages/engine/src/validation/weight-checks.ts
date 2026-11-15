import type { WeightVector } from '../model/weights';
import { ISSUE_CODES } from './codes';
import { createValidation } from './collector';
import type { ValidationResult } from './types';

export interface WeightStructureOptions {
  /** Input slot name used in issue locations. Default `weights`. */
  readonly input?: string;
}

export interface CrispWeightOptions extends WeightStructureOptions {
  /** Allowed absolute deviation of the sum from 1 before a warning. Default 1e-9. */
  readonly sumTolerance?: number;
  /** What to report when the weights do not sum to 1. Default `warning`. */
  readonly notNormalized?: 'ignore' | 'warning' | 'error';
}

type LooseWeights = WeightVector<unknown>;

function isLooseWeights(value: unknown): value is LooseWeights {
  if (typeof value !== 'object' || value === null) return false;
  const entries = (value as { entries?: unknown }).entries;
  return (
    Array.isArray(entries) &&
    entries.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { criterionId?: unknown }).criterionId === 'string',
    )
  );
}

/**
 * Checks that a weight vector covers exactly the given criteria: no missing, unknown or
 * duplicate entries. Independent of the weight value type.
 */
export function checkWeightStructure(
  weights: unknown,
  criterionIds: readonly string[],
  options: WeightStructureOptions = {},
): ValidationResult {
  const input = options.input ?? 'weights';
  const v = createValidation();
  if (!isLooseWeights(weights)) {
    v.error(ISSUE_CODES.inputMalformed, { params: { input }, location: { input } });
    return v.result();
  }
  if (weights.entries.length === 0) {
    v.error(ISSUE_CODES.weightsEmpty, { location: { input } });
    return v.result();
  }

  const known = new Map(criterionIds.map((id, index) => [id, index]));
  const seen = new Set<string>();
  weights.entries.forEach((entry, entryIndex) => {
    const criterionIndex = known.get(entry.criterionId);
    if (criterionIndex === undefined) {
      v.error(ISSUE_CODES.weightsUnknownCriterion, {
        params: { id: entry.criterionId },
        location: { input, column: { index: entryIndex, id: entry.criterionId } },
      });
    } else if (seen.has(entry.criterionId)) {
      v.error(ISSUE_CODES.weightsDuplicate, {
        params: { id: entry.criterionId },
        location: { input, column: { index: criterionIndex, id: entry.criterionId } },
      });
    }
    seen.add(entry.criterionId);
  });
  criterionIds.forEach((id, index) => {
    if (!seen.has(id)) {
      v.error(ISSUE_CODES.weightsMissing, {
        params: { id },
        location: { input, column: { index, id } },
      });
    }
  });
  return v.result();
}

/**
 * Structure checks plus crisp value checks: finite, non-negative, not all zero, and a
 * warning (by default) when the weights do not sum to 1.
 */
export function checkCrispWeights(
  weights: unknown,
  criterionIds: readonly string[],
  options: CrispWeightOptions = {},
): ValidationResult {
  const input = options.input ?? 'weights';
  const tolerance = options.sumTolerance ?? 1e-9;
  const notNormalized = options.notNormalized ?? 'warning';
  const v = createValidation();
  v.add(checkWeightStructure(weights, criterionIds, options));
  if (!isLooseWeights(weights) || weights.entries.length === 0) return v.result();

  const known = new Map(criterionIds.map((id, index) => [id, index]));
  let sum = 0;
  let valuesUsable = true;
  weights.entries.forEach((entry, entryIndex) => {
    const index = known.get(entry.criterionId) ?? entryIndex;
    const location = { input, column: { index, id: entry.criterionId } };
    const value = entry.value;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      valuesUsable = false;
      v.error(ISSUE_CODES.weightsInvalidValue, { params: { id: entry.criterionId }, location });
    } else if (value < 0) {
      valuesUsable = false;
      v.error(ISSUE_CODES.weightsNegative, {
        params: { id: entry.criterionId, value },
        location,
      });
    } else {
      sum += value;
    }
  });

  if (valuesUsable && !v.hasErrors) {
    if (sum === 0) {
      v.error(ISSUE_CODES.weightsZeroSum, { location: { input } });
    } else if (notNormalized !== 'ignore' && Math.abs(sum - 1) > tolerance) {
      const issue = { params: { sum }, location: { input } };
      if (notNormalized === 'error') v.error(ISSUE_CODES.weightsNotNormalized, issue);
      else v.warning(ISSUE_CODES.weightsNotNormalized, issue);
    }
  }
  return v.result();
}
