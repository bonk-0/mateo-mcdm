/**
 * Trace integration: how TFNs appear in step traces and the traced TFN operations.
 *
 * A TFN cell is stored as the triple `{ type: 'tfn', components: { l, m, u } }`, in cells
 * and in every node of a derivation. `tfnOps` mirrors the engine's `crisp` helpers: each
 * function computes its result with the pure function of this package and records the
 * derivation in the same step. `TFN_EVALUATORS` lets `verifyTrace` recompute them.
 */
import type {
  Encoder,
  OperationEvaluator,
  TraceCompositeValue,
  TraceValue,
  Tracked,
  TrackedRange,
} from '@mateo/engine';
import {
  EngineError,
  constant,
  derive,
  encodeCrisp,
  isTracked,
  isTrackedRange,
} from '@mateo/engine';
import {
  tfnArithmeticMean,
  tfnGeometricMean,
  tfnMax,
  tfnMin,
  tfnMinMeanMax,
  tfnNorm,
  tfnProduct,
  tfnSum,
} from './aggregation';
import {
  tfnAdd,
  tfnAddScalar,
  tfnDivide,
  tfnDivideByScalar,
  tfnMultiply,
  tfnMultiplyByScalar,
  tfnPower,
  tfnScalarDividedBy,
  tfnScalarMinus,
  tfnSubtract,
  tfnSubtractScalar,
} from './arithmetic';
import { vertexDistance } from './distance';
import type { DefuzzificationId } from './defuzzification';
import { centroid, gradedMean, isDefuzzificationId } from './defuzzification';
import type { TFN } from './tfn';
import { fromCrisp, makeTfn, tfnProblem } from './tfn';

/** `TraceCompositeValue.type` of a TFN. */
export const TFN_TRACE_TYPE = 'tfn';

/** A TFN as stored in a trace. */
export interface TfnTraceValue extends TraceCompositeValue {
  readonly type: typeof TFN_TRACE_TYPE;
  readonly components: { readonly l: number; readonly m: number; readonly u: number };
}

/**
 * Encoder for TFN cells. A trace never holds an invalid TFN: a component that is not finite
 * throws `EngineError('NON_FINITE_VALUE')` (as for crisp numbers) and a broken order throws
 * `EngineError('INVALID_ARGUMENT')`.
 */
export const encodeTfn: Encoder<TFN> = (value): TfnTraceValue => {
  const problem = tfnProblem(value);
  if (problem === 'non-finite') {
    throw new EngineError('NON_FINITE_VALUE', 'A trace value must have finite components.', {
      value: [String(value.l), String(value.m), String(value.u)],
    });
  }
  if (problem !== undefined) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      'A TFN trace value must be a triangular fuzzy number with l ≤ m ≤ u.',
      { value },
    );
  }
  const { l, m, u } = makeTfn(value.l, value.m, value.u);
  return { type: TFN_TRACE_TYPE, components: { l, m, u } };
};

/** True when a trace value is a TFN triple. Does not check `l ≤ m ≤ u`. */
export function isTfnTraceValue(value: TraceValue): value is TfnTraceValue {
  if (typeof value !== 'object' || value === null || value.type !== TFN_TRACE_TYPE) return false;
  const keys = Object.keys(value.components);
  return (
    keys.length === 3 &&
    typeof value.components['l'] === 'number' &&
    typeof value.components['m'] === 'number' &&
    typeof value.components['u'] === 'number'
  );
}

/** The TFN of a trace value. Throws when the value is not a valid TFN triple. */
export function decodeTfn(value: TraceValue): TFN {
  if (isTfnTraceValue(value)) {
    const candidate = { l: value.components.l, m: value.components.m, u: value.components.u };
    if (tfnProblem(candidate) === undefined) return candidate;
  }
  throw new EngineError('INVALID_ARGUMENT', 'The trace value is not a triangular fuzzy number.', {
    value,
  });
}

type OperandKind = 'tfn' | 'crisp';
type OperandValue = TFN | number;

/**
 * How an operation is recomputed from the values of its operands. The traced helpers and
 * `verifyTrace` share this table, which is what makes a stored trace auditable.
 */
export interface TfnOperationSpec {
  /** Kinds of the operands in order, or a list of TFNs of any length. */
  readonly operands: readonly OperandKind[] | 'tfn-list';
  readonly result: OperandKind;
  readonly evaluate: (args: readonly OperandValue[]) => OperandValue;
}

const tfnTfnToCrisp = (fn: (a: TFN, b: TFN) => number): TfnOperationSpec => ({
  operands: ['tfn', 'tfn'],
  result: 'crisp',
  evaluate: (args) => fn(args[0] as TFN, args[1] as TFN),
});

const tfnTfn = (fn: (a: TFN, b: TFN) => TFN): TfnOperationSpec => ({
  operands: ['tfn', 'tfn'],
  result: 'tfn',
  evaluate: (args) => fn(args[0] as TFN, args[1] as TFN),
});

const tfnScalar = (fn: (a: TFN, k: number) => TFN): TfnOperationSpec => ({
  operands: ['tfn', 'crisp'],
  result: 'tfn',
  evaluate: (args) => fn(args[0] as TFN, args[1] as number),
});

const scalarTfn = (fn: (k: number, a: TFN) => TFN): TfnOperationSpec => ({
  operands: ['crisp', 'tfn'],
  result: 'tfn',
  evaluate: (args) => fn(args[0] as number, args[1] as TFN),
});

const tfnList = (fn: (values: readonly TFN[]) => TFN): TfnOperationSpec => ({
  operands: 'tfn-list',
  result: 'tfn',
  evaluate: (args) => fn(args as readonly TFN[]),
});

const tfnToCrisp = (fn: (a: TFN) => number): TfnOperationSpec => ({
  operands: ['tfn'],
  result: 'crisp',
  evaluate: (args) => fn(args[0] as TFN),
});

/** Every operation `tfnOps` can record, keyed by the id stored in the trace. */
export const TFN_OPERATIONS = {
  'tfn.add': tfnTfn(tfnAdd),
  'tfn.subtract': tfnTfn(tfnSubtract),
  'tfn.multiply': tfnTfn(tfnMultiply),
  'tfn.divide': tfnTfn(tfnDivide),
  'tfn.power': tfnTfn(tfnPower),
  'tfn.add-scalar': tfnScalar(tfnAddScalar),
  'tfn.subtract-scalar': tfnScalar(tfnSubtractScalar),
  'tfn.scalar-minus': scalarTfn(tfnScalarMinus),
  'tfn.multiply-by-scalar': tfnScalar(tfnMultiplyByScalar),
  'tfn.divide-by-scalar': tfnScalar(tfnDivideByScalar),
  'tfn.scalar-divided-by': scalarTfn(tfnScalarDividedBy),
  'tfn.sum': tfnList(tfnSum),
  'tfn.norm': tfnList(tfnNorm),
  'tfn.product': tfnList(tfnProduct),
  'tfn.vertex-distance': tfnTfnToCrisp(vertexDistance),
  'tfn.min': tfnList(tfnMin),
  'tfn.max': tfnList(tfnMax),
  'tfn.arithmetic-mean': tfnList(tfnArithmeticMean),
  'tfn.geometric-mean': tfnList(tfnGeometricMean),
  'tfn.min-mean-max': tfnList(tfnMinMeanMax),
  'tfn.graded-mean': tfnToCrisp(gradedMean),
  'tfn.centroid': tfnToCrisp(centroid),
  'tfn.lower': tfnToCrisp((a) => a.l),
  'tfn.modal': tfnToCrisp((a) => a.m),
  'tfn.upper': tfnToCrisp((a) => a.u),
  'tfn.from-crisp': {
    operands: ['crisp'],
    result: 'tfn',
    evaluate: (args) => fromCrisp(args[0] as number),
  },
} as const satisfies Record<string, TfnOperationSpec>;

export type TfnOperationId = keyof typeof TFN_OPERATIONS;

function evaluatorFor(operation: string, spec: TfnOperationSpec): OperationEvaluator {
  return (args) => {
    const kinds: readonly OperandKind[] =
      spec.operands === 'tfn-list' ? args.map(() => 'tfn') : spec.operands;
    if (args.length !== kinds.length || args.length === 0) {
      const expected = spec.operands === 'tfn-list' ? 'at least 1' : String(kinds.length);
      return {
        problem: `"${operation}" takes ${expected} operand(s), found ${args.length}`,
        kind: 'arity',
      };
    }
    const values: OperandValue[] = [];
    for (const [index, arg] of args.entries()) {
      if (kinds[index] === 'crisp') {
        if (typeof arg !== 'number') {
          return {
            problem: `operand ${index + 1} of "${operation}" is not a crisp number`,
            kind: 'operand',
          };
        }
        values.push(arg);
      } else {
        if (!isTfnTraceValue(arg) || tfnProblem(arg.components) !== undefined) {
          return {
            problem: `operand ${index + 1} of "${operation}" is not a triangular fuzzy number`,
            kind: 'operand',
          };
        }
        values.push(decodeTfn(arg));
      }
    }
    try {
      const value = spec.evaluate(values);
      return { value: typeof value === 'number' ? encodeCrisp(value) : encodeTfn(value) };
    } catch (error) {
      if (error instanceof EngineError) {
        return { problem: `"${operation}" cannot be evaluated: ${error.message}`, kind: 'operand' };
      }
      throw error;
    }
  };
}

/**
 * Evaluators for every operation of `tfnOps`, for the trace auditor:
 * `verifyTrace(trace, { operations: TFN_EVALUATORS, requireKnownOperations: true })`.
 */
export const TFN_EVALUATORS: Readonly<Record<string, OperationEvaluator>> = Object.fromEntries(
  Object.entries(TFN_OPERATIONS).map(([operation, spec]) => [
    operation,
    evaluatorFor(operation, spec),
  ]),
);

/** A tracked TFN, or a bare TFN that is recorded as a formula constant. */
export type TfnOperand = Tracked<TFN> | TFN;

/** A tracked number, or a bare number that is recorded as a formula constant. */
export type ScalarOperand = Tracked<number> | number;

/** The operands of an aggregate: a range of an earlier step, or a list of operands. */
export type TfnOperands = TrackedRange<TFN> | readonly TfnOperand[];

function liftTfn(operand: TfnOperand): Tracked<TFN> {
  return isTracked(operand) ? operand : constant(operand, undefined, encodeTfn);
}

function liftScalar(operand: ScalarOperand): Tracked<number> {
  return typeof operand === 'number' ? constant(operand) : operand;
}

function apply<R extends OperandValue>(
  operation: TfnOperationId,
  operands: readonly (Tracked<OperandValue> | TrackedRange<TFN>)[],
): Tracked<R> {
  const values: OperandValue[] = [];
  for (const operand of operands) {
    if (isTrackedRange(operand)) values.push(...operand.items.map((item) => item.value));
    else values.push(operand.value);
  }
  const spec: TfnOperationSpec = TFN_OPERATIONS[operation];
  const value = spec.evaluate(values);
  const encode = (spec.result === 'crisp' ? encodeCrisp : encodeTfn) as Encoder<OperandValue>;
  return derive(operation, operands, value, encode) as Tracked<R>;
}

const binary =
  (operation: TfnOperationId) =>
  (a: TfnOperand, b: TfnOperand): Tracked<TFN> =>
    apply(operation, [liftTfn(a), liftTfn(b)]);

const binaryToCrisp =
  (operation: TfnOperationId) =>
  (a: TfnOperand, b: TfnOperand): Tracked<number> =>
    apply(operation, [liftTfn(a), liftTfn(b)]);

const withScalar =
  (operation: TfnOperationId) =>
  (a: TfnOperand, k: ScalarOperand): Tracked<TFN> =>
    apply(operation, [liftTfn(a), liftScalar(k)]);

const scalarFirst =
  (operation: TfnOperationId) =>
  (k: ScalarOperand, a: TfnOperand): Tracked<TFN> =>
    apply(operation, [liftScalar(k), liftTfn(a)]);

const aggregate =
  (operation: TfnOperationId) =>
  (operands: TfnOperands): Tracked<TFN> => {
    const list = isTrackedRange(operands) ? [operands] : operands.map(liftTfn);
    const count = isTrackedRange(operands) ? operands.items.length : list.length;
    if (count === 0) {
      throw new EngineError('INVALID_ARGUMENT', `"${operation}" needs at least one operand.`, {
        operation,
      });
    }
    return apply(operation, list);
  };

const toCrisp =
  (operation: TfnOperationId) =>
  (a: TfnOperand): Tracked<number> =>
    apply(operation, [liftTfn(a)]);

const DEFUZZIFICATION_OPERATIONS: Record<DefuzzificationId, TfnOperationId> = {
  'graded-mean': 'tfn.graded-mean',
  centroid: 'tfn.centroid',
};

function defuzzifyTracked(id: DefuzzificationId, a: TfnOperand): Tracked<number> {
  if (!isDefuzzificationId(id)) {
    throw new EngineError('INVALID_ARGUMENT', `Unknown defuzzification "${String(id)}".`, { id });
  }
  return apply(DEFUZZIFICATION_OPERATIONS[id], [liftTfn(a)]);
}

/**
 * Traced arithmetic on TFNs, the counterpart of the engine's `crisp`. Each function
 * computes its result with the pure function of the same name (`tfnOps.divide` is
 * `tfnDivide`) and records the derivation in one step. Bare TFNs and bare numbers are
 * accepted as operands and recorded as constants.
 *
 * A result that is not a finite, valid TFN throws an `EngineError`; a method's `validate`
 * must reject the input that leads there (a divisor containing zero, say).
 */
export const tfnOps = {
  add: binary('tfn.add'),
  subtract: binary('tfn.subtract'),
  multiply: binary('tfn.multiply'),
  divide: binary('tfn.divide'),
  /** `a ^ b` with the power rule `(l^w_u, m^w_m, u^w_l)`; see `tfnPower`. */
  power: binary('tfn.power'),
  addScalar: withScalar('tfn.add-scalar'),
  subtractScalar: withScalar('tfn.subtract-scalar'),
  scalarMinus: scalarFirst('tfn.scalar-minus'),
  multiplyByScalar: withScalar('tfn.multiply-by-scalar'),
  divideByScalar: withScalar('tfn.divide-by-scalar'),
  scalarDividedBy: scalarFirst('tfn.scalar-divided-by'),
  sum: aggregate('tfn.sum'),
  /** `(√Σ lₖ², √Σ mₖ², √Σ uₖ²)` of non-negative TFNs: the norm of each component. */
  norm: aggregate('tfn.norm'),
  product: aggregate('tfn.product'),
  /** Vertex distance of two TFNs, a crisp number. */
  vertexDistance: binaryToCrisp('tfn.vertex-distance'),
  min: aggregate('tfn.min'),
  max: aggregate('tfn.max'),
  arithmeticMean: aggregate('tfn.arithmetic-mean'),
  geometricMean: aggregate('tfn.geometric-mean'),
  minMeanMax: aggregate('tfn.min-mean-max'),
  gradedMean: toCrisp('tfn.graded-mean'),
  centroid: toCrisp('tfn.centroid'),
  /** The formula chosen by a method parameter; recorded as that formula's own operation. */
  defuzzify: defuzzifyTracked,
  /** The component `l` as a crisp value (`x^l` in the formulas of Fuzzy MARCOS). */
  lower: toCrisp('tfn.lower'),
  /** The component `m` as a crisp value. */
  modal: toCrisp('tfn.modal'),
  /** The component `u` as a crisp value. */
  upper: toCrisp('tfn.upper'),
  /** A crisp value as the degenerate TFN `(x, x, x)`, for example a crisp weight. */
  fromCrisp: (x: ScalarOperand): Tracked<TFN> => apply('tfn.from-crisp', [liftScalar(x)]),
} as const;
