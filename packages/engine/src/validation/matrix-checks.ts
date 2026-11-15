import { isCriterionDirection } from '../model/criterion';
import type { DecisionMatrix } from '../model/matrix';
import { isMissing } from '../model/matrix';
import type { NumberTypeId } from '../model/number-type';
import { ISSUE_CODES } from './codes';
import { createValidation } from './collector';
import type { ValidationResult } from './types';

export interface MatrixStructureOptions {
  /** Input slot name used in issue locations. Default `matrix`. */
  readonly input?: string;
  /** Default 1. */
  readonly minAlternatives?: number;
  /** Default 1. */
  readonly minCriteria?: number;
  /** When given, criteria with another number type are errors. */
  readonly supportedNumberTypes?: readonly NumberTypeId[];
}

export interface CrispMatrixOptions extends MatrixStructureOptions {
  /**
   * Sign constraint on cell values.
   * `non-negative`: values below zero are errors. `positive`: zero is an error as well
   * (methods that divide by a value or take its logarithm).
   */
  readonly sign?: 'any' | 'non-negative' | 'positive';
  /**
   * What to report when every alternative has the same value on a criterion. Such a
   * criterion cannot discriminate and breaks methods that divide by a range or a deviation.
   * Default `ignore`.
   */
  readonly constantCriterion?: 'ignore' | 'warning' | 'error';
}

type LooseMatrix = DecisionMatrix<unknown>;

function isLooseMatrix(value: unknown): value is LooseMatrix {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Record<keyof LooseMatrix, unknown>>;
  return (
    Array.isArray(candidate.alternatives) &&
    Array.isArray(candidate.criteria) &&
    Array.isArray(candidate.values) &&
    candidate.values.every((row) => Array.isArray(row)) &&
    [...(candidate.alternatives as unknown[]), ...(candidate.criteria as unknown[])].every(
      (item) => typeof item === 'object' && item !== null,
    )
  );
}

/**
 * Checks that are independent of the cell type: shape, ids, directions and empty cells.
 *
 * The argument is typed `unknown` on purpose. Matrices come from imported files and stored
 * projects, so the check trusts nothing about the value it is given.
 */
export function checkMatrixStructure(
  matrix: unknown,
  options: MatrixStructureOptions = {},
): ValidationResult {
  const input = options.input ?? 'matrix';
  const v = createValidation();

  if (!isLooseMatrix(matrix)) {
    v.error(ISSUE_CODES.inputMalformed, { params: { input }, location: { input } });
    return v.result();
  }

  const { alternatives, criteria, values } = matrix;
  const minAlternatives = Math.max(1, options.minAlternatives ?? 1);
  const minCriteria = Math.max(1, options.minCriteria ?? 1);

  if (alternatives.length === 0) {
    v.error(ISSUE_CODES.matrixNoAlternatives, { location: { input } });
  } else if (alternatives.length < minAlternatives) {
    v.error(ISSUE_CODES.matrixTooFewAlternatives, {
      params: { count: alternatives.length, min: minAlternatives },
      location: { input },
    });
  }
  if (criteria.length === 0) {
    v.error(ISSUE_CODES.matrixNoCriteria, { location: { input } });
  } else if (criteria.length < minCriteria) {
    v.error(ISSUE_CODES.matrixTooFewCriteria, {
      params: { count: criteria.length, min: minCriteria },
      location: { input },
    });
  }

  const seenAlternatives = new Set<string>();
  alternatives.forEach((alternative, index) => {
    if (seenAlternatives.has(alternative.id)) {
      v.error(ISSUE_CODES.matrixDuplicateAlternative, {
        params: { id: alternative.id },
        location: { input, row: { index, id: alternative.id } },
      });
    }
    seenAlternatives.add(alternative.id);
  });

  const seenCriteria = new Set<string>();
  criteria.forEach((criterion, index) => {
    const column = { index, id: criterion.id };
    if (seenCriteria.has(criterion.id)) {
      v.error(ISSUE_CODES.matrixDuplicateCriterion, {
        params: { id: criterion.id },
        location: { input, column },
      });
    }
    seenCriteria.add(criterion.id);
    if (!isCriterionDirection(criterion.direction)) {
      v.error(ISSUE_CODES.matrixInvalidDirection, {
        params: { id: criterion.id },
        location: { input, column },
      });
    }
    const supported = options.supportedNumberTypes;
    if (supported !== undefined && !supported.includes(criterion.numberType)) {
      v.error(ISSUE_CODES.matrixUnsupportedNumberType, {
        params: { id: criterion.id, numberType: String(criterion.numberType) },
        location: { input, column },
      });
    }
  });

  if (values.length !== alternatives.length) {
    v.error(ISSUE_CODES.matrixRowCountMismatch, {
      params: { rows: values.length, alternatives: alternatives.length },
      location: { input },
    });
  }

  values.forEach((cells, rowIndex) => {
    const alternative = alternatives[rowIndex];
    const row =
      alternative === undefined ? { index: rowIndex } : { index: rowIndex, id: alternative.id };
    if (cells.length !== criteria.length) {
      v.error(ISSUE_CODES.matrixColumnCountMismatch, {
        params: { cells: cells.length, criteria: criteria.length },
        location: { input, row },
      });
    }
    criteria.forEach((criterion, columnIndex) => {
      if (columnIndex < cells.length && isMissing(cells[columnIndex])) {
        v.error(ISSUE_CODES.matrixMissingValue, {
          location: { input, row, column: { index: columnIndex, id: criterion.id } },
        });
      }
    });
  });

  return v.result();
}

/**
 * Structure checks plus the checks every crisp method needs: each cell is a finite number,
 * and optionally sign and constant-criterion rules.
 */
export function checkCrispMatrix(
  matrix: unknown,
  options: CrispMatrixOptions = {},
): ValidationResult {
  const input = options.input ?? 'matrix';
  const sign = options.sign ?? 'any';
  const constantCriterion = options.constantCriterion ?? 'ignore';
  const v = createValidation();
  v.add(checkMatrixStructure(matrix, options));
  if (!isLooseMatrix(matrix)) return v.result();

  const { alternatives, criteria, values } = matrix;
  let cellsUsable = true;

  values.forEach((cells, rowIndex) => {
    const alternative = alternatives[rowIndex];
    const row =
      alternative === undefined ? { index: rowIndex } : { index: rowIndex, id: alternative.id };
    criteria.forEach((criterion, columnIndex) => {
      if (columnIndex >= cells.length) return;
      const value = cells[columnIndex];
      if (isMissing(value)) return; // already reported by the structure check
      const location = { input, row, column: { index: columnIndex, id: criterion.id } };
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        cellsUsable = false;
        v.error(ISSUE_CODES.matrixInvalidValue, { location });
      } else if (sign === 'positive' && value <= 0) {
        v.error(ISSUE_CODES.matrixNonPositiveValue, { params: { value }, location });
      } else if (sign === 'non-negative' && value < 0) {
        v.error(ISSUE_CODES.matrixNegativeValue, { params: { value }, location });
      }
    });
  });

  if (constantCriterion !== 'ignore' && cellsUsable && alternatives.length > 1) {
    criteria.forEach((criterion, columnIndex) => {
      const column = values.map((cells) => cells[columnIndex]);
      const first = column[0];
      if (typeof first !== 'number' || column.length !== alternatives.length) return;
      if (column.every((value) => value === first)) {
        const options_ = {
          params: { id: criterion.id },
          location: { input, column: { index: columnIndex, id: criterion.id } },
        };
        if (constantCriterion === 'error') v.error(ISSUE_CODES.matrixConstantCriterion, options_);
        else v.warning(ISSUE_CODES.matrixConstantCriterion, options_);
      }
    });
  }

  return v.result();
}
