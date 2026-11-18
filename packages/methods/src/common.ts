/**
 * Small helpers shared by the method implementations of this package. Nothing here
 * computes: the arithmetic lives in `@mateo/engine` (`crisp`) and `@mateo/fuzzy` (`tfnOps`).
 */
import type {
  DecisionMatrix,
  TextRef,
  TraceAxisItem,
  TraceFormula,
  ValidationCollector,
} from '@mateo/engine';
import { textKey } from '@mateo/engine';

/** A formula from its id, LaTeX template and `[name, latex]` term pairs. */
export function formula(
  id: string,
  template: string,
  terms: readonly (readonly [name: string, latex: string])[],
  condition?: TextRef,
): TraceFormula {
  return {
    id,
    template,
    terms: terms.map(([name, latex]) => ({ name, latex })),
    ...(condition === undefined ? {} : { condition }),
  };
}

/** A computed column or row header, such as `K_i^-` in a table of utility degrees. */
export function quantity(id: string, labelKey: string): TraceAxisItem {
  return { id, label: textKey(labelKey), kind: 'quantity' };
}

/** A row the method adds to the decision matrix, such as the ideal solution. */
export function referenceRow(id: string, labelKey: string): TraceAxisItem {
  return { id, label: textKey(labelKey), kind: 'reference' };
}

/** Condition texts shared by the formulas of every method. */
export const FOR_BENEFIT = textKey('methods.common.forBenefitCriteria');
export const FOR_COST = textKey('methods.common.forCostCriteria');

/**
 * Validation for the linear max normalization shared by CODAS and WASPAS: a benefit value
 * is divided by the column maximum and a cost value is divided into the column minimum.
 * A zero in a cost criterion divides by 0, and a benefit criterion that is 0 everywhere has
 * the maximum 0. The caller has already checked that `matrix` is a valid crisp matrix.
 */
export function checkLinearMaxNormalizable(
  matrix: DecisionMatrix<number>,
  v: ValidationCollector,
  codes: { readonly zeroCostValue: string; readonly zeroIdealValue: string },
): void {
  matrix.criteria.forEach((criterion, j) => {
    const column = { index: j, id: criterion.id };
    if (criterion.direction === 'cost') {
      matrix.values.forEach((row, i) => {
        if (row[j] === 0) {
          v.error(codes.zeroCostValue, {
            params: { id: criterion.id },
            location: {
              input: 'matrix',
              row: { index: i, id: matrix.alternatives[i]!.id },
              column,
            },
          });
        }
      });
    } else if (matrix.values.every((row) => row[j] === 0)) {
      v.error(codes.zeroIdealValue, {
        params: { id: criterion.id },
        location: { input: 'matrix', column },
      });
    }
  });
}
