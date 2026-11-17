import { EngineError } from '../errors';
import type { RankOptions } from '../math/rank';
import { rankValues, resolveRankOptions } from '../math/rank';
import {
  maximum,
  mean as meanOf,
  minimum,
  product as productOf,
  sum as sumOf,
  sumOfReciprocals as sumOfReciprocalsOf,
  sumOfSquares as sumOfSquaresOf,
  weightedSum as weightedSumOf,
} from '../math/reduce';
import type { Tracked, TrackedRange } from './tracked';
import { constant, derive, encodeCrisp, isTrackedRange } from './tracked';
import type { OperationOptions } from './types';

/**
 * How an operation is recomputed from the values of its operands. `verifyTrace` uses the
 * same table that produced the values, which is what makes a stored trace auditable.
 */
export interface CrispOperationSpec {
  /** Number of operand values, or `variadic` for aggregates. */
  readonly arity: number | 'variadic';
  readonly evaluate: (args: readonly number[], options: OperationOptions) => number;
}

const arg = (args: readonly number[], index: number): number => args[index] as number;

function rankOptionsFrom(options: OperationOptions): RankOptions {
  return {
    order: options['order'] === 'ascending' ? 'ascending' : 'descending',
    ties: options['ties'] as NonNullable<RankOptions['ties']>,
    tolerance: Number(options['tolerance']),
  };
}

/** Every operation the crisp helpers can record, keyed by the id stored in the trace. */
export const CRISP_OPERATIONS = {
  add: { arity: 2, evaluate: (a) => arg(a, 0) + arg(a, 1) },
  subtract: { arity: 2, evaluate: (a) => arg(a, 0) - arg(a, 1) },
  multiply: { arity: 2, evaluate: (a) => arg(a, 0) * arg(a, 1) },
  divide: { arity: 2, evaluate: (a) => arg(a, 0) / arg(a, 1) },
  power: { arity: 2, evaluate: (a) => arg(a, 0) ** arg(a, 1) },
  negate: { arity: 1, evaluate: (a) => -arg(a, 0) },
  abs: { arity: 1, evaluate: (a) => Math.abs(arg(a, 0)) },
  sqrt: { arity: 1, evaluate: (a) => Math.sqrt(arg(a, 0)) },
  ln: { arity: 1, evaluate: (a) => Math.log(arg(a, 0)) },
  exp: { arity: 1, evaluate: (a) => Math.exp(arg(a, 0)) },
  sum: { arity: 'variadic', evaluate: (a) => sumOf(a) },
  product: { arity: 'variadic', evaluate: (a) => productOf(a) },
  'sum-of-squares': { arity: 'variadic', evaluate: (a) => sumOfSquaresOf(a) },
  'sum-of-reciprocals': { arity: 'variadic', evaluate: (a) => sumOfReciprocalsOf(a) },
  /**
   * Operands: two ranges of the same length, `a` then `b`; the value is `Σ a[i] · b[i]`.
   * One node per cell instead of one product per pair, which keeps a dot product over the
   * rows of a large matrix (a correlation, say) small in the trace.
   */
  'sum-of-products': {
    arity: 'variadic',
    evaluate: (a) =>
      a.length % 2 === 0
        ? weightedSumOf(a.slice(0, a.length / 2), a.slice(a.length / 2))
        : Number.NaN,
  },
  mean: { arity: 'variadic', evaluate: (a) => meanOf(a) },
  min: { arity: 'variadic', evaluate: (a) => minimum(a) },
  max: { arity: 'variadic', evaluate: (a) => maximum(a) },
  /** Operands: the score being ranked, then every score of the ranking. */
  rank: {
    arity: 'variadic',
    evaluate: (a, options) =>
      rankValues(a.slice(1), rankOptionsFrom(options))[Number(options['index'])] ?? Number.NaN,
  },
} as const satisfies Record<string, CrispOperationSpec>;

export type CrispOperationId = keyof typeof CRISP_OPERATIONS;

/** A tracked number, or a bare number that is recorded as a formula constant. */
export type Operand = Tracked<number> | number;

/** The operands of an aggregate: a range of an earlier step, or a list of operands. */
export type Operands = TrackedRange<number> | readonly Operand[];

function lift(operand: Operand): Tracked<number> {
  return typeof operand === 'number' ? constant(operand) : operand;
}

function apply(
  operation: CrispOperationId,
  operands: readonly (Tracked<number> | TrackedRange<number>)[],
  options?: OperationOptions,
): Tracked<number> {
  const values: number[] = [];
  for (const operand of operands) {
    if (isTrackedRange(operand)) values.push(...operand.items.map((item) => item.value));
    else values.push(operand.value);
  }
  const spec: CrispOperationSpec = CRISP_OPERATIONS[operation];
  return derive(operation, operands, spec.evaluate(values, options ?? {}), encodeCrisp, options);
}

const unary =
  (operation: CrispOperationId) =>
  (a: Operand): Tracked<number> =>
    apply(operation, [lift(a)]);

const binary =
  (operation: CrispOperationId) =>
  (a: Operand, b: Operand): Tracked<number> =>
    apply(operation, [lift(a), lift(b)]);

const aggregate =
  (operation: CrispOperationId) =>
  (operands: Operands): Tracked<number> => {
    const list = isTrackedRange(operands) ? [operands] : operands.map(lift);
    const count = isTrackedRange(operands) ? operands.items.length : list.length;
    if (count === 0) {
      throw new EngineError('INVALID_ARGUMENT', `"${operation}" needs at least one operand.`, {
        operation,
      });
    }
    return apply(operation, list);
  };

function weightedSum(values: readonly Operand[], weights: readonly Operand[]): Tracked<number> {
  if (values.length !== weights.length || values.length === 0) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      'A weighted sum needs the same, non-zero number of values and weights.',
      { values: values.length, weights: weights.length },
    );
  }
  return crisp.sum(values.map((value, index) => crisp.multiply(value, weights[index] as Operand)));
}

/**
 * `Σ a[i] · b[i]` over two ranges of the same length, recorded as one `sum-of-products`
 * node that references both ranges. Same value, bit for bit, as `sum` of the `multiply`s.
 */
function sumOfProducts(a: TrackedRange<number>, b: TrackedRange<number>): Tracked<number> {
  if (a.items.length !== b.items.length || a.items.length === 0) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      'A sum of products needs two ranges of the same, non-zero length.',
      { a: a.items.length, b: b.items.length },
    );
  }
  return apply('sum-of-products', [a, b]);
}

function rank(scores: Operands, options: RankOptions = {}): Tracked<number>[] {
  const resolved = resolveRankOptions(options);
  const items = isTrackedRange(scores) ? scores.items : scores.map(lift);
  const all = isTrackedRange(scores) ? [scores] : items;
  // Every rank node records all scores, but the ranking itself is computed once: computing
  // it per item made ranking n alternatives cost n sorts. The value is exactly what the
  // `rank` evaluator gives for the node (verifyTrace recomputes it).
  const ranks = rankValues(
    items.map((item) => item.value),
    resolved,
  );
  return items.map((own, index) => {
    const options = { ...resolved, index };
    return derive('rank', [own, ...all], ranks[index] as number, encodeCrisp, options);
  });
}

/**
 * Traced arithmetic on crisp numbers. Each function computes its result and records the
 * derivation in one step. Bare numbers are accepted as operands and recorded as constants.
 *
 * A result that is not finite (division by zero, logarithm of a non-positive number)
 * throws `EngineError('NON_FINITE_VALUE')`. A method's `validate` must reject such input
 * first; the throw is the guarantee that a wrong number is never shown as a result.
 */
export const crisp = {
  add: binary('add'),
  subtract: binary('subtract'),
  multiply: binary('multiply'),
  divide: binary('divide'),
  power: binary('power'),
  negate: unary('negate'),
  abs: unary('abs'),
  sqrt: unary('sqrt'),
  ln: unary('ln'),
  exp: unary('exp'),
  sum: aggregate('sum'),
  product: aggregate('product'),
  sumOfSquares: aggregate('sum-of-squares'),
  sumOfReciprocals: aggregate('sum-of-reciprocals'),
  mean: aggregate('mean'),
  min: aggregate('min'),
  max: aggregate('max'),
  /** `Σ values[i] · weights[i]`, recorded as a sum of products. */
  weightedSum,
  /** `Σ a[i] · b[i]` over two equally long ranges, recorded as one node. */
  sumOfProducts,
  /** Rank of every score among all of them, in input order. See `rankValues`. */
  rank,
} as const;
