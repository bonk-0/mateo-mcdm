/**
 * The trace operations of DEMATEL that are not plain arithmetic: the entries of
 * (I − X)⁻¹, the component-wise product sum of fuzzy DEMATEL and the CFCS defuzzification.
 *
 * Each operation records its operands (the whole matrix or set it works on) and the
 * position of the entry, and {@link dematelOperationEvaluators} recomputes it from them,
 * which lets `verifyTrace` audit a DEMATEL trace like any other.
 */
import type {
  OperationEvaluator,
  OperationOptions,
  TraceValue,
  Tracked,
  TrackedRange,
} from '@mateo/engine';
import { derive, encodeCrisp } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import { decodeTfn, encodeTfn, isTfnTraceValue } from '@mateo/fuzzy';
import type { Matrix } from './linear';
import { inverseOfIdentityMinus } from './linear';

export const DEMATEL_OPERATIONS = {
  /** Entry (row, column) of (I − X)⁻¹. Operands: every entry of X in row-major order. */
  inverse: 'dematel.inverse',
  /** The same for the l, m and u matrices of a fuzzy X, as a TFN. */
  fuzzyInverse: 'dematel.fuzzy-inverse',
  /** `(Σ x_l · y_l, Σ x_m · y_m, Σ x_u · y_u)`. Operands: the TFNs of x, then those of y. */
  componentwiseProduct: 'dematel.componentwise-product',
  /** CFCS defuzzification of one TFN of a set. Operands: the whole set; option: index. */
  cfcs: 'dematel.cfcs',
} as const;

/** Splits row-major values into an `order × order` matrix. */
function square<T>(values: readonly T[], order: number): T[][] {
  return Array.from({ length: order }, (_, row) => values.slice(row * order, (row + 1) * order));
}

/** (I − X)⁻¹, or `undefined` when I − X is singular or too ill-conditioned to invert. */
export function inverseMatrix(x: Matrix): number[][] | undefined {
  const outcome = inverseOfIdentityMinus(x);
  return outcome.kind === 'ok' ? outcome.inverse : undefined;
}

/**
 * (I − X)⁻¹ of a fuzzy matrix, component by component. Rounding can leave the three
 * components of an entry out of order by an ulp where X_l, X_m and X_u differ only
 * slightly; the exact inverse is monotone (it is Σ Xᵏ), so the order is restored.
 */
export function fuzzyInverseMatrix(x: readonly (readonly TFN[])[]): TFN[][] | undefined {
  const parts = (['l', 'm', 'u'] as const).map((key) =>
    inverseMatrix(x.map((row) => row.map((value) => value[key]))),
  );
  const [l, m, u] = parts;
  if (l === undefined || m === undefined || u === undefined) return undefined;
  return l.map((row, i) =>
    row.map((lower, j) => {
      const modal = Math.max(lower, (m[i] as number[])[j] as number);
      const upper = Math.max(modal, (u[i] as number[])[j] as number);
      return { l: lower + 0, m: modal + 0, u: upper + 0 };
    }),
  );
}

/** `(Σ x_l · y_l, Σ x_m · y_m, Σ x_u · y_u)`, strictly left to right. */
export function componentwiseProduct(x: readonly TFN[], y: readonly TFN[]): TFN {
  let l = 0;
  let m = 0;
  let u = 0;
  x.forEach((a, k) => {
    const b = y[k] as TFN;
    l += a.l * b.l;
    m += a.m * b.m;
    u += a.u * b.u;
  });
  return { l, m, u };
}

/**
 * Crisp values of a set of TFNs by the CFCS method (converting fuzzy data into crisp
 * scores: Opricovic, Tzeng 2003, formula not checked against the paper): normalize with the smallest l and the range
 * max u − min l, take the left and right crisp bounds, weight them, and scale back.
 * Applied to a set because the normalization depends on all of its members. A set whose
 * members are all the same crisp number is returned unchanged.
 */
export function cfcs(values: readonly TFN[]): number[] {
  const minL = Math.min(...values.map((value) => value.l));
  const maxU = Math.max(...values.map((value) => value.u));
  const delta = maxU - minL;
  if (delta === 0) return values.map(() => minL + 0);
  return values.map(({ l, m, u }) => {
    const ln = (l - minL) / delta;
    const mn = (m - minL) / delta;
    const un = (u - minL) / delta;
    const ls = mn / (1 + mn - ln);
    const us = un / (1 + un - mn);
    const crispNormalized = (ls * (1 - ls) + us * us) / (1 - ls + us);
    return minL + crispNormalized * delta + 0;
  });
}

// --------------------------------------------------------------------------- traced forms

const optionsOf = (order: number, row: number, column: number): OperationOptions => ({
  order,
  row,
  column,
});

/** Entry of a precomputed (I − X)⁻¹ recorded as an operation on `x`. */
export function tracedInverse(
  x: TrackedRange<number>,
  inverse: readonly (readonly number[])[],
  row: number,
  column: number,
): Tracked<number> {
  return derive(
    DEMATEL_OPERATIONS.inverse,
    [x],
    (inverse[row] as readonly number[])[column] as number,
    encodeCrisp,
    optionsOf(inverse.length, row, column),
  );
}

export function tracedFuzzyInverse(
  x: TrackedRange<TFN>,
  inverse: readonly (readonly TFN[])[],
  row: number,
  column: number,
): Tracked<TFN> {
  return derive(
    DEMATEL_OPERATIONS.fuzzyInverse,
    [x],
    (inverse[row] as readonly TFN[])[column] as TFN,
    encodeTfn,
    optionsOf(inverse.length, row, column),
  );
}

export function tracedComponentwiseProduct(
  x: TrackedRange<TFN>,
  y: TrackedRange<TFN>,
): Tracked<TFN> {
  return derive(
    DEMATEL_OPERATIONS.componentwiseProduct,
    [x, y],
    componentwiseProduct(
      x.items.map((item) => item.value),
      y.items.map((item) => item.value),
    ),
    encodeTfn,
  );
}

/** One CFCS value of the set `all`, from the precomputed values of the whole set. */
export function tracedCfcs(
  all: TrackedRange<TFN>,
  values: readonly number[],
  index: number,
): Tracked<number> {
  return derive(DEMATEL_OPERATIONS.cfcs, [all], values[index] as number, encodeCrisp, { index });
}

// --------------------------------------------------------------------------- evaluators

type Evaluation = ReturnType<OperationEvaluator>;

const operand = (problem: string): Evaluation => ({ problem, kind: 'operand' });

/** Remembers the last result: every cell of a step evaluates the same operands. */
function memoized<T>(compute: (args: readonly TraceValue[], order: number) => T) {
  let lastKey: string | undefined;
  let lastValue: T | undefined;
  return (args: readonly TraceValue[], order: number): T => {
    const key = `${order}:${JSON.stringify(args)}`;
    if (key !== lastKey || lastValue === undefined) {
      lastValue = compute(args, order);
      lastKey = key;
    }
    return lastValue;
  };
}

function entryPosition(
  count: number,
  options: OperationOptions,
): { order: number; row: number; column: number } | string {
  const order = Number(options['order']);
  const row = Number(options['row']);
  const column = Number(options['column']);
  if (!Number.isInteger(order) || order < 1 || count !== order * order) {
    return `${count} operands do not form a square matrix of order ${String(options['order'])}`;
  }
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0) {
    return 'the position of the entry is missing';
  }
  if (row >= order || column >= order) return 'the position of the entry is outside the matrix';
  return { order, row, column };
}

const crispInverse = memoized((args, order) =>
  inverseMatrix(square(args as readonly number[], order)),
);
const tfnInverse = memoized((args, order) =>
  fuzzyInverseMatrix(square(args.map(decodeTfn), order)),
);
const cfcsSet = memoized((args) => cfcs(args.map(decodeTfn)));

const SINGULAR = 'I − X is singular or too ill-conditioned to invert';

/** Evaluators for the DEMATEL operations, for the trace auditor. */
export const dematelOperationEvaluators: Readonly<Record<string, OperationEvaluator>> = {
  [DEMATEL_OPERATIONS.inverse]: (args, options): Evaluation => {
    if (!args.every((value): value is number => typeof value === 'number')) {
      return operand('an operand is not a crisp number');
    }
    const position = entryPosition(args.length, options);
    if (typeof position === 'string') return operand(position);
    const inverse = crispInverse(args, position.order);
    if (inverse === undefined) return operand(SINGULAR);
    return { value: encodeCrisp((inverse[position.row] as number[])[position.column] as number) };
  },

  [DEMATEL_OPERATIONS.fuzzyInverse]: (args, options): Evaluation => {
    if (!args.every(isTfnTraceValue)) return operand('an operand is not a fuzzy number');
    const position = entryPosition(args.length, options);
    if (typeof position === 'string') return operand(position);
    const inverse = tfnInverse(args, position.order);
    if (inverse === undefined) return operand(SINGULAR);
    return {
      value: encodeTfn((inverse[position.row] as TFN[])[position.column] as TFN),
    };
  },

  [DEMATEL_OPERATIONS.componentwiseProduct]: (args): Evaluation => {
    if (args.length === 0 || args.length % 2 !== 0 || !args.every(isTfnTraceValue)) {
      return { problem: 'expected two equally long lists of fuzzy numbers', kind: 'arity' };
    }
    const half = args.length / 2;
    const fuzzy = args.map(decodeTfn);
    return { value: encodeTfn(componentwiseProduct(fuzzy.slice(0, half), fuzzy.slice(half))) };
  },

  [DEMATEL_OPERATIONS.cfcs]: (args, options): Evaluation => {
    if (args.length === 0 || !args.every(isTfnTraceValue)) {
      return operand('expected a non-empty set of fuzzy numbers');
    }
    const index = Number(options['index']);
    if (!Number.isInteger(index) || index < 0 || index >= args.length) {
      return operand('the position of the value is outside the set');
    }
    return { value: encodeCrisp(cfcsSet(args, 0)[index] as number) };
  },
};
