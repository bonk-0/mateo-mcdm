import { EngineError } from '../errors';
import type {
  ConstantNode,
  DerivationNode,
  EmptyNode,
  OperationNode,
  OperationOptions,
  ParameterNode,
  RangeNode,
  TraceValue,
  ValueNode,
} from './types';

/**
 * A value together with the record of how it was produced.
 *
 * Methods compute with tracked values instead of bare numbers: every operation returns
 * the result *and* its derivation node in one step, so the number in the trace can never
 * drift from the number that was actually computed.
 */
export interface Tracked<T> {
  readonly value: T;
  readonly node: ValueNode;
}

/** A row, column or block of an earlier step, used as the operands of an aggregate. */
export interface TrackedRange<T> {
  readonly items: readonly Tracked<T>[];
  readonly node: RangeNode;
}

/** Turns a raw value into its trace representation. */
export type Encoder<T> = (value: T) => TraceValue;

export function isTrackedRange<T>(
  value: Tracked<T> | TrackedRange<T> | readonly unknown[] | number,
): value is TrackedRange<T> {
  return typeof value === 'object' && 'items' in value && 'node' in value;
}

export function isTracked(value: unknown): value is Tracked<unknown> {
  return typeof value === 'object' && value !== null && 'node' in value && 'value' in value;
}

/** Encoder for crisp numbers. Refuses `NaN` and infinities: a trace never contains them. */
export const encodeCrisp: Encoder<number> = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new EngineError('NON_FINITE_VALUE', `A trace value must be a finite number.`, {
      value: String(value),
    });
  }
  // JSON has no negative zero; storing +0 keeps a trace identical after a round trip.
  return value === 0 ? 0 : value;
};

/** A literal that is part of a formula. */
export function constant(value: number, term?: string): Tracked<number>;
export function constant<T>(value: T, term: string | undefined, encode: Encoder<T>): Tracked<T>;
export function constant<T>(value: T, term?: string, encode?: Encoder<T>): Tracked<T> {
  const encoded = encode === undefined ? encodeCrisp(value as number) : encode(value);
  const node: ConstantNode =
    term === undefined
      ? { kind: 'constant', value: encoded }
      : { kind: 'constant', value: encoded, term };
  return { value, node };
}

/** The value of a method parameter. */
export function parameter(name: string, value: number, term?: string): Tracked<number> {
  const base: ParameterNode = { kind: 'parameter', name, value: encodeCrisp(value) };
  return { value, node: term === undefined ? base : { ...base, term } };
}

/** An intentionally empty cell. */
export function empty(reasonKey?: string): Tracked<null> {
  const node: EmptyNode =
    reasonKey === undefined
      ? { kind: 'empty', value: null }
      : { kind: 'empty', value: null, reasonKey };
  return { value: null, node };
}

/**
 * Names the formula term an operand stands for:
 * `crisp.divide(term(x.cell(i, j), 'x'), term(colMax, 'x_max'))`.
 */
export function term<T>(operand: Tracked<T>, name: string): Tracked<T>;
export function term<T>(operand: TrackedRange<T>, name: string): TrackedRange<T>;
export function term<T>(
  operand: Tracked<T> | TrackedRange<T>,
  name: string,
): Tracked<T> | TrackedRange<T> {
  if (isTrackedRange(operand)) {
    return { items: operand.items, node: { ...operand.node, term: name } };
  }
  return { value: operand.value, node: { ...operand.node, term: name } };
}

/**
 * The primitive every traced operation is built on. Packages that add number types use it
 * to define their own operations:
 *
 * ```ts
 * const tfnAdd = (a: Tracked<TFN>, b: Tracked<TFN>) =>
 *   derive('tfn.add', [a, b], addTfn(a.value, b.value), encodeTfn);
 * ```
 */
export function derive<T>(
  operation: string,
  operands: readonly (Tracked<unknown> | TrackedRange<unknown>)[],
  value: T,
  encode: Encoder<T>,
  options?: OperationOptions,
): Tracked<T> {
  let encoded: TraceValue;
  try {
    encoded = encode(value);
  } catch (error) {
    if (error instanceof EngineError && error.code === 'NON_FINITE_VALUE') {
      throw new EngineError(
        'NON_FINITE_VALUE',
        `Operation "${operation}" produced a value that is not finite. ` +
          'Validation must reject the input that leads here (for example a zero denominator).',
        { ...error.details, operation, operands: operands.map(describeOperand) },
      );
    }
    throw error;
  }
  const node: OperationNode = {
    kind: 'operation',
    operation,
    operands: operands.map((operand): DerivationNode => operand.node),
    ...(options === undefined ? {} : { options }),
    value: encoded,
  };
  return { value, node };
}

function describeOperand(operand: Tracked<unknown> | TrackedRange<unknown>): unknown {
  return isTrackedRange(operand)
    ? operand.items.map((item) => item.node.value)
    : operand.node.value;
}
