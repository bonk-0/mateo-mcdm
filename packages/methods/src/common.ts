/**
 * Small helpers shared by the method implementations of this package. Nothing here
 * computes: the arithmetic lives in `@mateo/engine` (`crisp`) and `@mateo/fuzzy` (`tfnOps`).
 */
import type { TextRef, TraceAxisItem, TraceFormula, ValidationCollector } from '@mateo/engine';
import { checkCrispWeights, ISSUE_CODES, textKey } from '@mateo/engine';
import { checkTfnWeights } from '@mateo/fuzzy';

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
 * Checks weights that may be TFNs or crisp numbers (a fuzzy method accepts both). Anything
 * else is reported with the method's own `unsupportedCode`.
 */
export function checkTfnOrCrispWeights(
  weights: unknown,
  criterionIds: readonly string[],
  unsupportedCode: string,
  v: ValidationCollector,
): void {
  const numberType =
    typeof weights === 'object' && weights !== null
      ? (weights as { numberType?: unknown }).numberType
      : undefined;
  if (numberType === 'tfn') {
    v.add(checkTfnWeights(weights, criterionIds));
  } else if (numberType === 'crisp') {
    // Scaling every weight by one factor leaves the rankings of these methods unchanged.
    v.add(checkCrispWeights(weights, criterionIds, { notNormalized: 'ignore' }));
  } else if (typeof weights === 'object' && weights !== null) {
    v.error(unsupportedCode, {
      params: { numberType: String(numberType) },
      location: { input: 'weights' },
    });
  } else {
    v.error(ISSUE_CODES.inputMalformed, {
      params: { input: 'weights' },
      location: { input: 'weights' },
    });
  }
}
