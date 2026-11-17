import type { DefuzzificationId, TFN } from '@mateo/fuzzy';
import {
  centroid,
  gradedMean,
  tfnAdd,
  tfnAddScalar,
  tfnDivide,
  tfnMultiply,
  tfnMultiplyByScalar,
  tfnSubtract,
} from '@mateo/fuzzy';

/** What the Fuzzy Playground can do with the two numbers (and a crisp number `k`). */
export const PLAYGROUND_OPERATIONS = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'scale',
  'shift',
] as const;
export type PlaygroundOperation = (typeof PLAYGROUND_OPERATIONS)[number];

export type OperationResult =
  | { readonly ok: true; readonly value: TFN }
  | { readonly ok: false; readonly reason: 'zero-divisor' | 'invalid' };

/** Operations that use the second number B. The others use the crisp number k. */
export const USES_B: Readonly<Record<PlaygroundOperation, boolean>> = {
  add: true,
  subtract: true,
  multiply: true,
  divide: true,
  scale: false,
  shift: false,
};

/**
 * Runs one operation with `@mateo/fuzzy`. The playground does no arithmetic of its own: a
 * quotient by a number whose support contains zero is reported, not guessed.
 */
export function applyOperation(
  operation: PlaygroundOperation,
  a: TFN,
  b: TFN,
  k: number,
): OperationResult {
  try {
    switch (operation) {
      case 'add':
        return { ok: true, value: tfnAdd(a, b) };
      case 'subtract':
        return { ok: true, value: tfnSubtract(a, b) };
      case 'multiply':
        return { ok: true, value: tfnMultiply(a, b) };
      case 'divide':
        return b.l <= 0 && b.u >= 0
          ? { ok: false, reason: 'zero-divisor' }
          : { ok: true, value: tfnDivide(a, b) };
      case 'scale':
        return { ok: true, value: tfnMultiplyByScalar(a, k) };
      case 'shift':
        return { ok: true, value: tfnAddScalar(a, k) };
    }
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

/** The defuzzified values of a number by every method of `@mateo/fuzzy`. */
export function defuzzified(value: TFN): Readonly<Record<DefuzzificationId, number>> {
  return { 'graded-mean': gradedMean(value), centroid: centroid(value) };
}
