/**
 * Standard approximate arithmetic on triangular fuzzy numbers.
 *
 * Sums and differences of TFNs are TFNs. Products and quotients are not exactly triangular;
 * as everywhere in the MCDM literature, the result is approximated by the TFN through the
 * exact end points of the support and the exact peak.
 *
 * Every function is a separate named export and nothing here is a default: a method uses an
 * operation only where its reference paper does (docs/plan.md §6.3).
 *
 * Guarantees, covered by the property tests:
 * - Operands that are valid TFNs give a valid TFN. Rounding cannot break `l ≤ m ≤ u`,
 *   because every component is computed by the same monotonic floating-point operation.
 * - On degenerate operands `(x, x, x)` each operation gives exactly `(r, r, r)`, where `r`
 *   is what the crisp operation gives in floating point.
 * - Operands are not validated again; data enters through `tfn`, `checkTfnMatrix` or the
 *   trace encoder, all of which reject invalid TFNs.
 *
 * Division by a TFN whose support contains zero has no bounded result and throws
 * `EngineError('NON_FINITE_VALUE')`, the engine's code for "validation must reject this
 * input first". Overflow to an infinity is caught where values enter a trace.
 */
import { EngineError } from '@mateo/engine';
import type { TFN } from './tfn';
import { makeTfn } from './tfn';

function assertFiniteScalar(k: number, operation: string): void {
  if (!Number.isFinite(k)) {
    throw new EngineError('NON_FINITE_VALUE', `"${operation}" needs a finite scalar.`, {
      operation,
      scalar: String(k),
    });
  }
}

function assertZeroFreeDivisor(divisor: TFN, operation: string): void {
  if (divisor.l <= 0 && divisor.u >= 0) {
    throw new EngineError(
      'NON_FINITE_VALUE',
      `"${operation}": the divisor (${divisor.l}, ${divisor.m}, ${divisor.u}) contains zero, so the quotient is unbounded.`,
      { operation, divisor: [divisor.l, divisor.m, divisor.u] },
    );
  }
}

/** `a ⊕ b = (l₁ + l₂, m₁ + m₂, u₁ + u₂)`. */
export function tfnAdd(a: TFN, b: TFN): TFN {
  return makeTfn(a.l + b.l, a.m + b.m, a.u + b.u);
}

/** `a ⊖ b = (l₁ − u₂, m₁ − m₂, u₁ − l₂)`. Note that `a ⊖ a` is not zero unless `a` is crisp. */
export function tfnSubtract(a: TFN, b: TFN): TFN {
  return makeTfn(a.l - b.u, a.m - b.m, a.u - b.l);
}

/**
 * `a ⊗ b`. For non-negative operands, the case of every Phase 1 method, this is exactly the
 * textbook `(l₁·l₂, m₁·m₂, u₁·u₂)`. For operands with negative parts the support is
 * `[min, max]` of the four end-point products, so the result is a valid TFN for any signs.
 */
export function tfnMultiply(a: TFN, b: TFN): TFN {
  const ll = a.l * b.l;
  const lu = a.l * b.u;
  const ul = a.u * b.l;
  const uu = a.u * b.u;
  return makeTfn(Math.min(ll, lu, ul, uu), a.m * b.m, Math.max(ll, lu, ul, uu));
}

/**
 * `a ⊘ b`. For `a ≥ 0` and `b > 0` this is exactly the textbook `(l₁ / u₂, m₁ / m₂, u₁ / l₂)`;
 * for other signs the support is `[min, max]` of the four end-point quotients.
 * Throws when the support of `b` contains zero.
 */
export function tfnDivide(a: TFN, b: TFN): TFN {
  assertZeroFreeDivisor(b, 'tfnDivide');
  const ll = a.l / b.l;
  const lu = a.l / b.u;
  const ul = a.u / b.l;
  const uu = a.u / b.u;
  return makeTfn(Math.min(ll, lu, ul, uu), a.m / b.m, Math.max(ll, lu, ul, uu));
}

/** `a + k = (l + k, m + k, u + k)`. */
export function tfnAddScalar(a: TFN, k: number): TFN {
  assertFiniteScalar(k, 'tfnAddScalar');
  return makeTfn(a.l + k, a.m + k, a.u + k);
}

/** `a − k = (l − k, m − k, u − k)`. */
export function tfnSubtractScalar(a: TFN, k: number): TFN {
  assertFiniteScalar(k, 'tfnSubtractScalar');
  return makeTfn(a.l - k, a.m - k, a.u - k);
}

/** `k − a = (k − u, k − m, k − l)`. */
export function tfnScalarMinus(k: number, a: TFN): TFN {
  assertFiniteScalar(k, 'tfnScalarMinus');
  return makeTfn(k - a.u, k - a.m, k - a.l);
}

/** `k · a = (k·l, k·m, k·u)` for `k ≥ 0`; a negative `k` swaps the end points. */
export function tfnMultiplyByScalar(a: TFN, k: number): TFN {
  assertFiniteScalar(k, 'tfnMultiplyByScalar');
  return k >= 0 ? makeTfn(a.l * k, a.m * k, a.u * k) : makeTfn(a.u * k, a.m * k, a.l * k);
}

/** `a / k = (l / k, m / k, u / k)` for `k > 0`; a negative `k` swaps the end points. Throws for `k = 0`. */
export function tfnDivideByScalar(a: TFN, k: number): TFN {
  assertFiniteScalar(k, 'tfnDivideByScalar');
  if (k === 0) {
    throw new EngineError('NON_FINITE_VALUE', '"tfnDivideByScalar": division by zero.', {
      operation: 'tfnDivideByScalar',
    });
  }
  return k > 0 ? makeTfn(a.l / k, a.m / k, a.u / k) : makeTfn(a.u / k, a.m / k, a.l / k);
}

/**
 * `k / a = (k / u, k / m, k / l)` for `k ≥ 0` and `a > 0`; other signs order the end points
 * accordingly. Throws when the support of `a` contains zero.
 */
export function tfnScalarDividedBy(k: number, a: TFN): TFN {
  assertFiniteScalar(k, 'tfnScalarDividedBy');
  assertZeroFreeDivisor(a, 'tfnScalarDividedBy');
  const byL = k / a.l;
  const byU = k / a.u;
  return makeTfn(Math.min(byL, byU), k / a.m, Math.max(byL, byU));
}
