/**
 * Validation of a plain criteria list, the input of the subjective weighting methods that
 * take no decision matrix (FUCOM, BWM).
 */
import type { TextRef, TraceAxisItem, ValidationCollector } from '@mateo/engine';
import { ISSUE_CODES } from '@mateo/engine';

/** A criterion of a subjective weighting method: only its id and label matter. */
export interface NamedCriterion {
  readonly id: string;
  readonly name: TextRef;
}

/**
 * Reports a criteria list that is not an array of `{ id }` objects, is shorter than `min`
 * or repeats an id. Returns true when the list is usable.
 */
export function checkCriterionList(
  value: unknown,
  v: ValidationCollector,
  min = 2,
): value is readonly NamedCriterion[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (c) => typeof c === 'object' && c !== null && typeof (c as { id?: unknown }).id === 'string',
    )
  ) {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'criteria' },
      location: { input: 'criteria' },
    });
    return false;
  }
  const criteria = value as readonly NamedCriterion[];
  if (criteria.length < min) {
    v.error(ISSUE_CODES.matrixTooFewCriteria, {
      params: { count: criteria.length, min },
      location: { input: 'criteria' },
    });
    return false;
  }
  const seen = new Set<string>();
  let unique = true;
  criteria.forEach((criterion, index) => {
    if (seen.has(criterion.id)) {
      unique = false;
      v.error(ISSUE_CODES.matrixDuplicateCriterion, {
        params: { id: criterion.id },
        location: { input: 'criteria', column: { index, id: criterion.id } },
      });
    }
    seen.add(criterion.id);
  });
  return unique;
}

/**
 * Reports a value list that is not an array of `length` finite numbers. Returns true when
 * every entry is a finite number.
 */
export function checkNumberList(
  value: unknown,
  input: string,
  length: number,
  v: ValidationCollector,
  columnId: (index: number) => string | undefined,
): value is readonly number[] {
  if (!Array.isArray(value)) {
    v.error(ISSUE_CODES.inputMalformed, { params: { input }, location: { input } });
    return false;
  }
  if (value.length !== length) {
    v.error(ISSUE_CODES.matrixColumnCountMismatch, {
      params: { cells: value.length, criteria: length },
      location: { input },
    });
    return false;
  }
  let usable = true;
  (value as unknown[]).forEach((entry, index) => {
    const id = columnId(index);
    const location = { input, column: id === undefined ? { index } : { index, id } };
    if (entry === null || entry === undefined) {
      usable = false;
      v.error(ISSUE_CODES.matrixMissingValue, { location });
    } else if (typeof entry !== 'number' || !Number.isFinite(entry)) {
      usable = false;
      v.error(ISSUE_CODES.matrixInvalidValue, { location });
    }
  });
  return usable;
}

export function criterionAxisItems(criteria: readonly NamedCriterion[]): TraceAxisItem[] {
  return criteria.map(({ id, name }) => ({ id, label: name, kind: 'criterion' }));
}
