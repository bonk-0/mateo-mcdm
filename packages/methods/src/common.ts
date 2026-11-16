/**
 * Small helpers shared by the method implementations of this package. Nothing here
 * computes: the arithmetic lives in `@mateo/engine` (`crisp`) and `@mateo/fuzzy` (`tfnOps`).
 */
import type { TextRef, TraceAxisItem, TraceFormula } from '@mateo/engine';
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
