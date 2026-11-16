/**
 * Validation of TFN input (docs/plan.md §6.3: "fuzzy number validity is enforced on
 * input"). Like the engine's checks, these accept `unknown`, never throw and report every
 * problem with a stable code and a location.
 */
import type { ValidationLocation, ValidationResult } from '@mateo/engine';
import {
  ISSUE_CODES,
  checkMatrixStructure,
  checkWeightStructure,
  createValidation,
  isMissing,
} from '@mateo/engine';
import type { MatrixStructureOptions, WeightStructureOptions } from '@mateo/engine';
import type { TFN } from './tfn';
import { tfnProblem } from './tfn';

/** Issue codes reported by this package. The message key of a code is `validation.<code>`. */
export const FUZZY_ISSUE_CODES = {
  /** The value is not an `{ l, m, u }` object of finite numbers. */
  tfnInvalidValue: 'tfn.invalid-value',
  /** `l ≤ m ≤ u` does not hold. */
  tfnInvalidOrder: 'tfn.invalid-order',
  tfnNegativeValue: 'tfn.negative-value',
  tfnNonPositiveValue: 'tfn.non-positive-value',

  scaleTooFewTerms: 'scale.too-few-terms',
  scaleInvalidTerm: 'scale.invalid-term',
  scaleDuplicateTerm: 'scale.duplicate-term',
  scaleNotMonotonic: 'scale.not-monotonic',
  scaleUnknownTerm: 'scale.unknown-term',
} as const;

export type FuzzyIssueCode = (typeof FUZZY_ISSUE_CODES)[keyof typeof FUZZY_ISSUE_CODES];

/**
 * Sign constraint on TFNs. `non-negative`: `l ≥ 0`. `positive`: `l > 0`, for methods that
 * divide by a value.
 */
export type TfnSign = 'any' | 'non-negative' | 'positive';

export interface TfnMatrixOptions extends MatrixStructureOptions {
  /** Default `any`. */
  readonly sign?: TfnSign;
}

export interface TfnWeightOptions extends WeightStructureOptions {
  /** Default `non-negative`: a weight cannot be negative. */
  readonly sign?: Exclude<TfnSign, 'any'>;
}

interface Reporter {
  error(
    code: string,
    options: { params?: Record<string, number>; location: ValidationLocation },
  ): void;
}

/** Reports the problem of one TFN value, if any. Returns the TFN when it is usable. */
function checkTfnValue(
  v: Reporter,
  value: unknown,
  sign: TfnSign,
  location: ValidationLocation,
): TFN | undefined {
  const problem = tfnProblem(value);
  if (problem === 'order') {
    const { l, m, u } = value as TFN;
    v.error(FUZZY_ISSUE_CODES.tfnInvalidOrder, { params: { l, m, u }, location });
    return undefined;
  }
  if (problem !== undefined) {
    v.error(FUZZY_ISSUE_CODES.tfnInvalidValue, { location });
    return undefined;
  }
  const valid = value as TFN;
  if (sign === 'positive' && valid.l <= 0) {
    v.error(FUZZY_ISSUE_CODES.tfnNonPositiveValue, { params: { l: valid.l }, location });
  } else if (sign === 'non-negative' && valid.l < 0) {
    v.error(FUZZY_ISSUE_CODES.tfnNegativeValue, { params: { l: valid.l }, location });
  }
  return valid;
}

const isMalformed = (result: ValidationResult): boolean =>
  result.errors.some((issue) => issue.code === ISSUE_CODES.inputMalformed);

/**
 * The engine's structure checks plus, for every cell: a valid TFN (`l ≤ m ≤ u`, finite)
 * and optionally a sign rule. Crisp cells are not accepted; convert them with `fromCrisp`.
 */
export function checkTfnMatrix(matrix: unknown, options: TfnMatrixOptions = {}): ValidationResult {
  const input = options.input ?? 'matrix';
  const sign = options.sign ?? 'any';
  const v = createValidation();
  const structure = checkMatrixStructure(matrix, options);
  v.add(structure);
  if (isMalformed(structure)) return v.result();

  const { alternatives, criteria, values } = matrix as {
    readonly alternatives: readonly { readonly id: string }[];
    readonly criteria: readonly { readonly id: string }[];
    readonly values: readonly (readonly unknown[])[];
  };
  values.forEach((cells, rowIndex) => {
    const alternative = alternatives[rowIndex];
    const row =
      alternative === undefined ? { index: rowIndex } : { index: rowIndex, id: alternative.id };
    criteria.forEach((criterion, columnIndex) => {
      if (columnIndex >= cells.length) return;
      const value = cells[columnIndex];
      if (isMissing(value)) return; // already reported by the structure check
      checkTfnValue(v, value, sign, {
        input,
        row,
        column: { index: columnIndex, id: criterion.id },
      });
    });
  });
  return v.result();
}

/**
 * The engine's structure checks plus, for every weight: a valid TFN that is not negative,
 * and not all weights zero. Fuzzy weights are not required to sum to 1: normalised fuzzy
 * weights sum to a TFN around 1, not to a number.
 */
export function checkTfnWeights(
  weights: unknown,
  criterionIds: readonly string[],
  options: TfnWeightOptions = {},
): ValidationResult {
  const input = options.input ?? 'weights';
  const sign = options.sign ?? 'non-negative';
  const v = createValidation();
  const structure = checkWeightStructure(weights, criterionIds, options);
  v.add(structure);
  if (isMalformed(structure)) return v.result();

  const { entries } = weights as {
    readonly entries: readonly { readonly criterionId: string; readonly value: unknown }[];
  };
  const known = new Map(criterionIds.map((id, index) => [id, index]));
  let allZero = entries.length > 0;
  entries.forEach((entry, entryIndex) => {
    const index = known.get(entry.criterionId) ?? entryIndex;
    const value = checkTfnValue(v, entry.value, sign, {
      input,
      column: { index, id: entry.criterionId },
    });
    if (value === undefined || value.u !== 0) allZero = false;
  });
  if (allZero && !v.hasErrors) v.error(ISSUE_CODES.weightsZeroSum, { location: { input } });
  return v.result();
}
