/**
 * The trace operations of BWM. Their values come from linear programmes, so they are not
 * crisp arithmetic: each operation records its operands (the two preference vectors, and
 * ξ* for a weight bound), the positions of the best and worst criteria and the solver that
 * produced it. {@link bwmOperationEvaluators} recomputes them with a solver, which lets
 * `verifyTrace` audit a BWM trace like any other.
 */
import type { LinearSolver, OperationEvaluator, OperationOptions, TraceValue } from '@mateo/engine';
import { solverLabel } from '@mateo/engine';
import type { BwmVectors, WeightBound } from './model';
import { inputThreshold } from './consistency';
import { linearOptimum, nonlinearXi, weightBound } from './model';

export const BWM_OPERATIONS = {
  /** ξ* of the nonlinear model. Operands: a_B·, a_·W. */
  nonlinearXi: 'bwm.nonlinear-xi',
  /** min or max w_j over the optimal set of the nonlinear model. Operands: a_B·, a_·W, ξ*. */
  weightBound: 'bwm.weight-bound',
  /** ξ^L* of the linear model. Operands: a_B·, a_·W. */
  linearXi: 'bwm.linear-xi',
  /** w_j of the linear model. Operands: a_B·, a_·W. */
  linearWeight: 'bwm.linear-weight',
  /** Threshold of CR^I (Liang et al. 2020, Table 3). No operands; options: criteria, scale. */
  inputThreshold: 'bwm.input-threshold',
} as const;

/** Options shared by every BWM operation. */
export function bwmOptions(vectors: BwmVectors, solver: LinearSolver): OperationOptions {
  return { best: vectors.best, worst: vectors.worst, solver: solverLabel(solver) };
}

type Evaluation = ReturnType<OperationEvaluator>;

/**
 * Evaluators for the BWM operations, computing with `solver`. A value recorded with a
 * different solver (or solver version) is reported instead of being compared, because the
 * last digits of an optimum may legitimately differ between solvers.
 */
export function bwmOperationEvaluators(
  solver: LinearSolver,
): Readonly<Record<string, OperationEvaluator>> {
  const label = solverLabel(solver);

  const evaluate =
    (
      withXi: boolean,
      compute: (vectors: BwmVectors, xi: number, options: OperationOptions) => number,
    ) =>
    (args: readonly TraceValue[], options: OperationOptions): Evaluation => {
      if (options['solver'] !== label) {
        return {
          problem: `recorded with ${String(options['solver'])}, audited with ${label}`,
          kind: 'operand',
        };
      }
      if (!args.every((value): value is number => typeof value === 'number')) {
        return { problem: 'an operand is not a crisp number', kind: 'operand' };
      }
      const vectorLength = args.length - (withXi ? 1 : 0);
      if (vectorLength < 4 || vectorLength % 2 !== 0) {
        return { problem: `unexpected number of operands (${args.length})`, kind: 'arity' };
      }
      const n = vectorLength / 2;
      const vectors: BwmVectors = {
        bo: args.slice(0, n),
        ow: args.slice(n, 2 * n),
        best: Number(options['best']),
        worst: Number(options['worst']),
      };
      try {
        const value = compute(vectors, withXi ? args[2 * n]! : 0, options);
        return { value: value === 0 ? 0 : value };
      } catch (error) {
        return { problem: error instanceof Error ? error.message : String(error), kind: 'operand' };
      }
    };

  const threshold = (args: readonly TraceValue[], options: OperationOptions): Evaluation => {
    if (args.length !== 0) {
      return { problem: `unexpected number of operands (${args.length})`, kind: 'arity' };
    }
    const value = inputThreshold(Number(options['criteria']), Number(options['scale']));
    return value === null
      ? { problem: 'the paper gives no threshold for these options', kind: 'operand' }
      : { value };
  };

  return {
    [BWM_OPERATIONS.inputThreshold]: threshold,
    [BWM_OPERATIONS.nonlinearXi]: evaluate(false, (vectors) => nonlinearXi(solver, vectors)),
    [BWM_OPERATIONS.weightBound]: evaluate(true, (vectors, xi, options) =>
      weightBound(
        solver,
        vectors,
        xi,
        Number(options['criterion']),
        options['bound'] as WeightBound,
      ),
    ),
    [BWM_OPERATIONS.linearXi]: evaluate(false, (vectors) => linearOptimum(solver, vectors).xi),
    [BWM_OPERATIONS.linearWeight]: evaluate(
      false,
      (vectors, _xi, options) =>
        linearOptimum(solver, vectors).weights[Number(options['criterion'])]!,
    ),
  };
}
