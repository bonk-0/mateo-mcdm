/**
 * Reductions of several TFNs to one: sums, component-wise extremes and the usual ways of
 * combining the judgements of several experts. As with the arithmetic, each one is a named
 * export that a method picks only when its reference paper uses it.
 *
 * Lists are reduced strictly left to right with the engine's own reductions, so results
 * are identical on every run and, for degenerate TFNs, identical to the crisp reduction.
 */
import { EngineError, maximum, mean, minimum, product, sum, sumOfSquares } from '@mateo/engine';
import type { TFN } from './tfn';
import { tfnMultiply } from './arithmetic';
import { makeTfn } from './tfn';

function assertNotEmpty(values: readonly TFN[], operation: string): void {
  if (values.length === 0) {
    throw new EngineError('INVALID_ARGUMENT', `"${operation}" needs at least one TFN.`, {
      operation,
    });
  }
}

const lower = (values: readonly TFN[]): number[] => values.map((value) => value.l);
const modal = (values: readonly TFN[]): number[] => values.map((value) => value.m);
const upper = (values: readonly TFN[]): number[] => values.map((value) => value.u);

/** `Σ aₖ = (Σ lₖ, Σ mₖ, Σ uₖ)`. */
export function tfnSum(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnSum');
  return makeTfn(sum(lower(values)), sum(modal(values)), sum(upper(values)));
}

/**
 * `Π aₖ`, multiplied strictly left to right from `(1, 1, 1)` with `tfnMultiply`: for
 * non-negative TFNs `(Π lₖ, Π mₖ, Π uₖ)`, and a valid TFN for any signs. Degenerate TFNs
 * give exactly the crisp product.
 */
export function tfnProduct(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnProduct');
  return values.reduce<TFN>((total, value) => tfnMultiply(total, value), makeTfn(1, 1, 1));
}

/**
 * Norm of a list of non-negative TFNs, `(√Σ lₖ², √Σ mₖ², √Σ uₖ²)`: the vector norm of each
 * component. Dividing a TFN by it with `tfnDivide` is the fuzzy form of vector
 * normalisation. Throws `EngineError('INVALID_ARGUMENT')` for a negative TFN (`l < 0`),
 * where squaring would break `l ≤ m ≤ u`.
 */
export function tfnNorm(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnNorm');
  const negative = values.findIndex((value) => value.l < 0);
  if (negative !== -1) {
    throw new EngineError('INVALID_ARGUMENT', '"tfnNorm" is defined for non-negative TFNs only.', {
      operation: 'tfnNorm',
      index: negative,
    });
  }
  return makeTfn(
    Math.sqrt(sumOfSquares(lower(values))),
    Math.sqrt(sumOfSquares(modal(values))),
    Math.sqrt(sumOfSquares(upper(values))),
  );
}

/**
 * Component-wise minimum `(min lₖ, min mₖ, min uₖ)`. This is the "minimum" of Fuzzy MARCOS
 * (anti-ideal and ideal solutions); it need not be one of the operands.
 */
export function tfnMin(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnMin');
  return makeTfn(minimum(lower(values)), minimum(modal(values)), minimum(upper(values)));
}

/** Component-wise maximum `(max lₖ, max mₖ, max uₖ)`. */
export function tfnMax(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnMax');
  return makeTfn(maximum(lower(values)), maximum(modal(values)), maximum(upper(values)));
}

/** Component-wise arithmetic mean `(Σ lₖ / n, Σ mₖ / n, Σ uₖ / n)`. */
export function tfnArithmeticMean(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnArithmeticMean');
  return makeTfn(mean(lower(values)), mean(modal(values)), mean(upper(values)));
}

/**
 * `ⁿ√(x₁ · … · xₙ)`. The product is taken first because that is the most accurate order;
 * when it leaves the safely representable range (very long lists of very small or very
 * large values) the root is distributed over the factors instead.
 */
function geometricMeanOf(values: readonly number[]): number {
  const n = values.length;
  if (values.includes(0)) return 0;
  const p = product(values);
  if (p > 1e-280 && p < 1e280) return Math.pow(p, 1 / n);
  return product(values.map((value) => Math.pow(value, 1 / n)));
}

/**
 * Component-wise geometric mean `(ⁿ√Π lₖ, ⁿ√Π mₖ, ⁿ√Π uₖ)`, defined for non-negative TFNs
 * (`lₖ ≥ 0`); throws `EngineError('INVALID_ARGUMENT')` otherwise.
 */
export function tfnGeometricMean(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnGeometricMean');
  const negative = values.findIndex((value) => value.l < 0);
  if (negative !== -1) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      '"tfnGeometricMean" is defined for non-negative TFNs only.',
      { operation: 'tfnGeometricMean', index: negative },
    );
  }
  const l = geometricMeanOf(lower(values));
  const m = geometricMeanOf(modal(values));
  const u = geometricMeanOf(upper(values));
  // A root is accurate to the last digit but not guaranteed monotonic; keep l ≤ m ≤ u.
  return makeTfn(Math.min(l, m), m, Math.max(m, u));
}

/**
 * `(min lₖ, Σ mₖ / n, max uₖ)`: the widest support of the group around the mean of the
 * most likely values.
 */
export function tfnMinMeanMax(values: readonly TFN[]): TFN {
  assertNotEmpty(values, 'tfnMinMeanMax');
  const l = minimum(lower(values));
  const u = maximum(upper(values));
  // The mean of equal numbers can differ from them in the last digit; keep l ≤ m ≤ u.
  const m = Math.min(Math.max(mean(modal(values)), l), u);
  return makeTfn(l, m, u);
}
