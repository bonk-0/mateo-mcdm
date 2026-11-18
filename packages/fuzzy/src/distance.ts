/**
 * Distances between TFNs.
 *
 * The vertex method (Chen 2000) measures two TFNs by the root mean square of the
 * differences of their three components. It is evaluated around `m`, like the
 * defuzzifications, so that two crisp numbers `(x, x, x)` and `(y, y, y)` have exactly the
 * distance `|x − y|` that the crisp calculation gives.
 */
import type { TFN } from './tfn';

/** `d(a, b) = √(((l₁ − l₂)² + (m₁ − m₂)² + (u₁ − u₂)²) / 3)`. Symmetric, never negative. */
export function vertexDistance(a: TFN, b: TFN): number {
  const dm = a.m - b.m;
  const el = a.l - b.l - dm;
  const eu = a.u - b.u - dm;
  // With differences dm + el, dm, dm + eu: the mean square is dm² + (2·dm·(el + eu) + el² + eu²) / 3.
  return Math.sqrt(dm * dm + (2 * dm * (el + eu) + el * el + eu * eu) / 3);
}
