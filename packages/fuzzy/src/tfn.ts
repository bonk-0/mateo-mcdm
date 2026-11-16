import type { NumberTypeId } from '@mateo/engine';
import { EngineError } from '@mateo/engine';

/** Number type id of triangular fuzzy numbers (`Criterion.numberType`, method slots). */
export const TFN_NUMBER_TYPE: NumberTypeId = 'tfn';

/**
 * A triangular fuzzy number `(l, m, u)`: membership rises linearly from 0 at `l` to 1 at
 * `m` and falls back to 0 at `u`. A valid TFN has finite components with `l ≤ m ≤ u`.
 *
 * The type is a plain object so it can be stored in project files as-is. Being typed as a
 * `TFN` does not make a value valid: data from files and editors goes through
 * {@link tfnProblem} (or `checkTfnMatrix`) first, and {@link tfn} is the checked constructor.
 */
export interface TFN {
  readonly l: number;
  readonly m: number;
  readonly u: number;
}

/** `[l, m, u]`, the notation of the reference fixtures and of imported files. */
export type TfnTuple = readonly [l: number, m: number, u: number];

/**
 * Why a value is not a valid TFN.
 * `not-a-tfn`: not an object with numeric `l`, `m` and `u`. `non-finite`: a component is
 * `NaN` or infinite. `order`: `l ≤ m ≤ u` does not hold.
 */
export type TfnProblem = 'not-a-tfn' | 'non-finite' | 'order';

/** The problem that makes `value` an invalid TFN, or `undefined` when it is valid. */
export function tfnProblem(value: unknown): TfnProblem | undefined {
  if (typeof value !== 'object' || value === null) return 'not-a-tfn';
  const { l, m, u } = value as Partial<Record<keyof TFN, unknown>>;
  if (typeof l !== 'number' || typeof m !== 'number' || typeof u !== 'number') return 'not-a-tfn';
  if (!Number.isFinite(l) || !Number.isFinite(m) || !Number.isFinite(u)) return 'non-finite';
  if (l > m || m > u) return 'order';
  return undefined;
}

/** True when `value` is a valid TFN: finite components with `l ≤ m ≤ u`. */
export function isTfn(value: unknown): value is TFN {
  return tfnProblem(value) === undefined;
}

/**
 * Builds a TFN from components that are already known to be ordered. Adding `0` turns a
 * negative zero into `+0` (JSON cannot store `-0`) and changes no other value.
 *
 * Internal: used by the operations of this package, whose results are ordered by
 * construction. Not exported from the package.
 */
export function makeTfn(l: number, m: number, u: number): TFN {
  return { l: l + 0, m: m + 0, u: u + 0 };
}

/**
 * The checked constructor. Throws `EngineError('NON_FINITE_VALUE')` for a component that
 * is not finite and `EngineError('INVALID_ARGUMENT')` when `l ≤ m ≤ u` does not hold.
 * User data is validated with `tfnProblem` / `checkTfnMatrix` instead, which never throw.
 */
export function tfn(l: number, m: number, u: number): TFN {
  const problem = tfnProblem({ l, m, u });
  if (problem === 'order') {
    throw new EngineError(
      'INVALID_ARGUMENT',
      `(${l}, ${m}, ${u}) is not a triangular fuzzy number: l ≤ m ≤ u must hold.`,
      { l, m, u },
    );
  }
  if (problem !== undefined) {
    throw new EngineError(
      'NON_FINITE_VALUE',
      'The components of a triangular fuzzy number must be finite numbers.',
      { l: String(l), m: String(m), u: String(u) },
    );
  }
  return makeTfn(l, m, u);
}

/** The degenerate TFN `(x, x, x)` that stands for the crisp number `x`. */
export function fromCrisp(x: number): TFN {
  return tfn(x, x, x);
}

/** Checked conversion from `[l, m, u]`. */
export function fromTuple(tuple: TfnTuple): TFN {
  return tfn(tuple[0], tuple[1], tuple[2]);
}

export function toTuple(value: TFN): [l: number, m: number, u: number] {
  return [value.l, value.m, value.u];
}

/** True for `(x, x, x)`. */
export function isDegenerate(value: TFN): boolean {
  return value.l === value.m && value.m === value.u;
}

/** Exact component-wise equality. */
export function tfnEquals(a: TFN, b: TFN): boolean {
  return a.l === b.l && a.m === b.m && a.u === b.u;
}
