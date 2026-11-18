/**
 * The linear algebra DEMATEL needs: the inverse of I − X for a normalized, non-negative
 * matrix X, with a guard against the case where the series X + X² + … diverges.
 *
 * Plain numbers, no tracing: `operations.ts` wraps these for the trace.
 */

/** A square matrix as rows. */
export type Matrix = readonly (readonly number[])[];

/**
 * Largest condition number (1-norm) of I − X that is still inverted. Dividing by the
 * normalization constant keeps the spectral radius of X at most 1, and it equals 1 exactly
 * when the series diverges (for example when every row sum equals the constant). There
 * I − X is singular and floating-point elimination returns a pivot of the order of the
 * rounding error, so a huge condition number is the numerical form of that case. A
 * regular matrix with radius 0.9999 has a condition number near 1e4, so the bound leaves
 * every meaningful input alone.
 */
export const MAX_CONDITION_NUMBER = 1e10;

/** Largest column sum of absolute values. */
function norm1(matrix: Matrix): number {
  let largest = 0;
  for (let column = 0; column < matrix.length; column += 1) {
    let total = 0;
    for (const row of matrix) total += Math.abs(row[column] as number);
    if (total > largest) largest = total;
  }
  return largest;
}

export type InverseOutcome =
  | { readonly kind: 'ok'; readonly inverse: number[][]; readonly condition: number }
  | { readonly kind: 'singular'; readonly condition: number };

/**
 * `(I − X)⁻¹` by Gauss-Jordan elimination with partial pivoting. Strictly left to right,
 * so the result is the same on every run and platform. `singular` when a pivot is zero or
 * the 1-norm condition number of I − X exceeds {@link MAX_CONDITION_NUMBER} (reported as
 * `Infinity` for an exact zero pivot).
 */
export function inverseOfIdentityMinus(x: Matrix): InverseOutcome {
  const n = x.length;
  const a: number[][] = x.map((row, i) => row.map((value, j) => (i === j ? 1 : 0) - value));
  const aNorm = norm1(a);
  const inv: number[][] = a.map((_, i) => a.map((__, j) => (i === j ? 1 : 0)));

  for (let column = 0; column < n; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < n; row += 1) {
      if (
        Math.abs((a[row] as number[])[column] as number) >
        Math.abs((a[pivotRow] as number[])[column] as number)
      ) {
        pivotRow = row;
      }
    }
    const pivot = (a[pivotRow] as number[])[column] as number;
    if (pivot === 0) return { kind: 'singular', condition: Number.POSITIVE_INFINITY };
    if (pivotRow !== column) {
      [a[column], a[pivotRow]] = [a[pivotRow] as number[], a[column] as number[]];
      [inv[column], inv[pivotRow]] = [inv[pivotRow] as number[], inv[column] as number[]];
    }
    const rowA = a[column] as number[];
    const rowI = inv[column] as number[];
    for (let k = 0; k < n; k += 1) {
      rowA[k] = (rowA[k] as number) / pivot;
      rowI[k] = (rowI[k] as number) / pivot;
    }
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = (a[row] as number[])[column] as number;
      if (factor === 0) continue;
      const otherA = a[row] as number[];
      const otherI = inv[row] as number[];
      for (let k = 0; k < n; k += 1) {
        otherA[k] = (otherA[k] as number) - factor * (rowA[k] as number);
        otherI[k] = (otherI[k] as number) - factor * (rowI[k] as number);
      }
    }
  }

  const condition = aNorm * norm1(inv);
  if (!Number.isFinite(condition) || condition > MAX_CONDITION_NUMBER) {
    return { kind: 'singular', condition };
  }
  return { kind: 'ok', inverse: inv, condition };
}
