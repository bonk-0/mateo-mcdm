import { EngineError } from '../errors';
import type { Alternative } from './alternative';
import type { Criterion } from './criterion';

/**
 * A decision matrix: one row per alternative, one column per criterion.
 *
 * `T` is the cell value type: `number` for crisp data, a fuzzy number type from
 * `@mateo/fuzzy`, and so on. `values[i][j]` is the performance of `alternatives[i]` on
 * `criteria[j]`.
 */
export interface DecisionMatrix<T> {
  readonly alternatives: readonly Alternative[];
  readonly criteria: readonly Criterion[];
  readonly values: readonly (readonly T[])[];
}

/**
 * A matrix that may still have empty cells (editor and import state). Mateo never fills
 * missing values: validation reports them and methods refuse to run.
 */
export type DraftMatrix<T> = DecisionMatrix<T | null>;

export function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** True when every row has one non-missing cell per criterion. */
export function isCompleteMatrix<T>(matrix: DraftMatrix<T>): matrix is DecisionMatrix<T> {
  const columns = matrix.criteria.length;
  if (matrix.values.length !== matrix.alternatives.length) return false;
  return matrix.values.every(
    (row) => row.length === columns && row.every((value) => !isMissing(value)),
  );
}

/** Cell at `(row, column)`. Throws on an out-of-range index instead of returning `undefined`. */
export function matrixCell<T>(matrix: DecisionMatrix<T>, row: number, column: number): T {
  const cells = matrix.values[row];
  if (cells === undefined || column < 0 || column >= cells.length) {
    throw new EngineError('INVALID_ARGUMENT', `Matrix cell (${row}, ${column}) is out of range.`, {
      row,
      column,
    });
  }
  return cells[column] as T;
}

/** Values of one criterion, in alternative order. */
export function matrixColumn<T>(matrix: DecisionMatrix<T>, column: number): T[] {
  return matrix.values.map((_, row) => matrixCell(matrix, row, column));
}

/** Values of one alternative, in criterion order. */
export function matrixRow<T>(matrix: DecisionMatrix<T>, row: number): T[] {
  return matrix.criteria.map((_, column) => matrixCell(matrix, row, column));
}

/** New matrix with the same alternatives and criteria and every cell mapped through `fn`. */
export function mapMatrix<T, U>(
  matrix: DecisionMatrix<T>,
  fn: (value: T, row: number, column: number) => U,
): DecisionMatrix<U> {
  return {
    alternatives: matrix.alternatives,
    criteria: matrix.criteria,
    values: matrix.values.map((cells, row) => cells.map((value, column) => fn(value, row, column))),
  };
}
