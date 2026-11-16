/**
 * Defuzzification: one crisp number for a TFN. Each formula is a separate named export and
 * a method uses the one its reference paper uses; there is no default.
 *
 * Phase 1 needs only the graded mean: Fuzzy MARCOS (Stanković et al. 2020) states it for
 * `df_crisp`, and IMF SWARA is implemented with it as decided in `docs/methods/swara.md`.
 *
 * Both formulas are evaluated around `m`, for example `m + ((l − m) + (u − m)) / 6` for
 * `(l + 4m + u) / 6`. The two forms are algebraically identical; this one returns exactly
 * `x` for the degenerate TFN `(x, x, x)`, where summing first can be off in the last digit.
 */
import { EngineError } from '@mateo/engine';
import type { TFN } from './tfn';

/** Graded mean integration `(l + 4m + u) / 6`. */
export function gradedMean(value: TFN): number {
  return value.m + (value.l - value.m + (value.u - value.m)) / 6 + 0;
}

/** Centroid (centre of gravity) `(l + m + u) / 3`. */
export function centroid(value: TFN): number {
  return value.m + (value.l - value.m + (value.u - value.m)) / 3 + 0;
}

/** Defuzzification formulas by the id used in method parameters and fixtures. */
export const DEFUZZIFICATIONS = {
  'graded-mean': gradedMean,
  centroid,
} as const satisfies Record<string, (value: TFN) => number>;

export type DefuzzificationId = keyof typeof DEFUZZIFICATIONS;

export const DEFUZZIFICATION_IDS = Object.keys(DEFUZZIFICATIONS) as DefuzzificationId[];

export function isDefuzzificationId(value: unknown): value is DefuzzificationId {
  return typeof value === 'string' && Object.hasOwn(DEFUZZIFICATIONS, value);
}

/** Applies the formula with the given id. Throws for an unknown id. */
export function defuzzify(id: DefuzzificationId, value: TFN): number {
  if (!isDefuzzificationId(id)) {
    throw new EngineError('INVALID_ARGUMENT', `Unknown defuzzification "${String(id)}".`, { id });
  }
  return DEFUZZIFICATIONS[id](value);
}
