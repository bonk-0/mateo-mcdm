import type { TFN } from '@mateo/fuzzy';

/** The three points of a triangular fuzzy number a user can move. */
export type TfnPoint = 'l' | 'm' | 'u';
export const TFN_POINTS: readonly TfnPoint[] = ['l', 'm', 'u'];

const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));

/** Removes floating-point noise left by snapping to a step such as 0.1. */
const clean = (x: number) => Math.round(x * 1e9) / 1e9;

/**
 * Moves one point of a TFN to `x`: the point stays inside `domain` and the result keeps
 * `l ≤ m ≤ u`, so dragging never produces an invalid number. `step` snaps the point to a grid.
 * This is drawing geometry only; every result shown to the user is computed by
 * `@mateo/fuzzy`.
 */
export function moveTfnPoint(
  value: TFN,
  point: TfnPoint,
  x: number,
  domain: readonly [number, number],
  step?: number,
): TFN {
  const snapped = step !== undefined && step > 0 ? Math.round(x / step) * step : x;
  const at = clean(clamp(snapped, domain[0], domain[1]));
  switch (point) {
    case 'l':
      return { l: Math.min(at, value.m), m: value.m, u: value.u };
    case 'm':
      return { l: value.l, m: clamp(at, value.l, value.u), u: value.u };
    case 'u':
      return { l: value.l, m: value.m, u: Math.max(at, value.m) };
  }
}

/** A "nice" step for about five ticks across `span`. */
export function tickStep(span: number): number {
  const rough = span / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const unit = rough / power;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * power;
}

/** Tick positions inside `[min, max]`. */
export function ticksFor(min: number, max: number): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const step = tickStep(span);
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step / 1e6; tick += step) {
    ticks.push(clean(tick));
  }
  return ticks;
}

/** The number line a set of triangles needs: their extent with a little room on both sides. */
export function domainOf(values: readonly TFN[], fallback: readonly [number, number] = [0, 1]) {
  if (values.length === 0) return fallback;
  const low = Math.min(...values.map((value) => value.l));
  const high = Math.max(...values.map((value) => value.u));
  const span = high - low || Math.abs(high) || 1;
  return [clean(low - span * 0.08), clean(high + span * 0.08)] as const;
}
