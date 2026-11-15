import { EngineError } from '../errors';
import type { CriterionDirection } from '../model/criterion';
import type { Operand, Operands } from '../trace/crisp-ops';
import { crisp } from '../trace/crisp-ops';
import type { Tracked, TrackedRange } from '../trace/tracked';
import { constant, isTrackedRange, term } from '../trace/tracked';

/**
 * Column-wise crisp normalizations (`x` is a cell, the aggregates run over its criterion):
 *
 * | Variant          | Benefit                       | Cost                          |
 * | ---------------- | ----------------------------- | ----------------------------- |
 * | `max`            | `x / max`                     | `min / x`                     |
 * | `max-complement` | `x / max`                     | `1 - x / max`                 |
 * | `sum`            | `x / Σx`                      | `(1 / x) / Σ(1 / x)`          |
 * | `vector`         | `x / √Σx²`                    | `1 - x / √Σx²`                |
 * | `min-max`        | `(x - min) / (max - min)`     | `(max - x) / (max - min)`     |
 *
 * These are building blocks, not defaults. A method uses one only when it is exactly the
 * normalization of its reference paper, and writes its own otherwise.
 */
export type NormalizationVariant = 'max' | 'max-complement' | 'sum' | 'vector' | 'min-max';

export const NORMALIZATION_VARIANTS: readonly NormalizationVariant[] = [
  'max',
  'max-complement',
  'sum',
  'vector',
  'min-max',
];

/** Formula term names to attach to the operands, so cells link to the step formula. */
export interface NormalizationTerms {
  /** The cell being normalized. */
  readonly value?: string;
  readonly max?: string;
  readonly min?: string;
  /** `Σx` (benefit) or `Σ(1/x)` (cost) of the `sum` variant. */
  readonly sum?: string;
  /** `√Σx²` of the `vector` variant. */
  readonly norm?: string;
}

export interface ColumnNormalizer {
  readonly variant: NormalizationVariant;
  readonly direction: CriterionDirection;
  /** Normalizes one cell of the column the normalizer was created for. */
  normalize(value: Operand): Tracked<number>;
}

function named<T extends Tracked<number>>(operand: T, name: string | undefined): Tracked<number> {
  return name === undefined ? operand : term(operand, name);
}

/**
 * Prepares the normalization of one criterion. The column aggregates are computed once
 * and shared by every cell, both in memory and in the recorded derivations.
 *
 * `column` is normally a range of an earlier step (`x.column(j)`), which keeps the trace
 * compact: the aggregate references the column instead of listing its cells.
 */
export function createColumnNormalizer(
  variant: NormalizationVariant,
  direction: CriterionDirection,
  column: Operands,
  terms: NormalizationTerms = {},
): ColumnNormalizer {
  const size = isTrackedRange(column) ? column.items.length : column.length;
  if (size === 0) {
    throw new EngineError('INVALID_ARGUMENT', 'Cannot normalize an empty column.', { variant });
  }
  const cell = (value: Operand): Tracked<number> =>
    named(typeof value === 'number' ? constant(value) : value, terms.value);
  const max = (): Tracked<number> => named(crisp.max(column), terms.max);
  const min = (): Tracked<number> => named(crisp.min(column), terms.min);

  let normalize: (value: Operand) => Tracked<number>;
  switch (variant) {
    case 'max': {
      if (direction === 'benefit') {
        const columnMax = max();
        normalize = (value) => crisp.divide(cell(value), columnMax);
      } else {
        const columnMin = min();
        normalize = (value) => crisp.divide(columnMin, cell(value));
      }
      break;
    }
    case 'max-complement': {
      const columnMax = max();
      normalize =
        direction === 'benefit'
          ? (value) => crisp.divide(cell(value), columnMax)
          : (value) => crisp.subtract(1, crisp.divide(cell(value), columnMax));
      break;
    }
    case 'sum': {
      if (direction === 'benefit') {
        const total = named(crisp.sum(column), terms.sum);
        normalize = (value) => crisp.divide(cell(value), total);
      } else {
        const total = named(crisp.sumOfReciprocals(column), terms.sum);
        normalize = (value) => crisp.divide(crisp.divide(1, cell(value)), total);
      }
      break;
    }
    case 'vector': {
      const norm = named(crisp.sqrt(crisp.sumOfSquares(column)), terms.norm);
      normalize =
        direction === 'benefit'
          ? (value) => crisp.divide(cell(value), norm)
          : (value) => crisp.subtract(1, crisp.divide(cell(value), norm));
      break;
    }
    case 'min-max': {
      const columnMax = max();
      const columnMin = min();
      const span = crisp.subtract(columnMax, columnMin);
      normalize =
        direction === 'benefit'
          ? (value) => crisp.divide(crisp.subtract(cell(value), columnMin), span)
          : (value) => crisp.divide(crisp.subtract(columnMax, cell(value)), span);
      break;
    }
  }
  return { variant, direction, normalize };
}

/**
 * Normalizes every cell of a range of an earlier step, in order. Shorthand for
 * `createColumnNormalizer(...)` followed by `normalize` on each item.
 */
export function normalizeColumn(
  variant: NormalizationVariant,
  direction: CriterionDirection,
  column: TrackedRange<number>,
  terms: NormalizationTerms = {},
): Tracked<number>[] {
  const normalizer = createColumnNormalizer(variant, direction, column, terms);
  return column.items.map((item) => normalizer.normalize(item));
}

/**
 * Normalizes plain numbers, without a trace. It runs the very same code as the traced
 * form, so the two can never disagree. Throws `EngineError('NON_FINITE_VALUE')` when a
 * result is not finite (a zero denominator).
 */
export function normalizeValues(
  values: readonly number[],
  direction: CriterionDirection,
  variant: NormalizationVariant,
): number[] {
  const normalizer = createColumnNormalizer(variant, direction, values);
  return values.map((value) => normalizer.normalize(value).value);
}
