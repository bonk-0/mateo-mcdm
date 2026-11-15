import { EngineError } from '../errors';
import type { CrispOperationSpec } from './crisp-ops';
import { CRISP_OPERATIONS } from './crisp-ops';
import { formulaProblems } from './formula';
import { expandRange, findCell, traceValuesEqual } from './inspect';
import type {
  DerivationNode,
  OperationNode,
  OperationOptions,
  Trace,
  TraceStep,
  TraceTableShape,
  TraceValue,
} from './types';
import { TRACE_FORMAT_VERSION } from './types';

export type TraceProblemCode =
  | 'format-version'
  | 'duplicate-step'
  | 'step-index'
  | 'table-shape'
  | 'duplicate-axis-id'
  | 'missing-derivation'
  | 'value-mismatch'
  | 'non-finite-value'
  | 'unknown-reference'
  | 'forward-reference'
  | 'stale-reference'
  | 'unknown-formula'
  | 'invalid-formula'
  | 'unknown-term'
  | 'missing-source'
  | 'unknown-operation'
  | 'operation-arity'
  | 'operation-operand'
  | 'operation-mismatch';

export interface TraceProblem {
  readonly code: TraceProblemCode;
  readonly message: string;
  readonly step?: string;
  readonly row?: string;
  readonly column?: string;
}

/**
 * Recomputes an operation from the trace values of its operands (ranges are expanded).
 * Returns the value, or a string describing why the operands cannot be evaluated.
 */
export type OperationEvaluator = (
  args: readonly TraceValue[],
  options: OperationOptions,
) =>
  { readonly value: TraceValue } | { readonly problem: string; readonly kind: 'arity' | 'operand' };

function crispEvaluator(operation: string, spec: CrispOperationSpec): OperationEvaluator {
  return (args, options) => {
    if (spec.arity !== 'variadic' && args.length !== spec.arity) {
      return {
        problem: `"${operation}" takes ${spec.arity} operand(s), found ${args.length}`,
        kind: 'arity',
      };
    }
    if (!args.every((value): value is number => typeof value === 'number')) {
      return {
        problem: `"${operation}" has an operand that is not a crisp number`,
        kind: 'operand',
      };
    }
    const value = spec.evaluate(args, options);
    return { value: value === 0 ? 0 : value };
  };
}

/** Evaluators for every operation of the `crisp` helpers. */
export const CRISP_EVALUATORS: Readonly<Record<string, OperationEvaluator>> = Object.fromEntries(
  Object.entries(CRISP_OPERATIONS).map(([operation, spec]) => [
    operation,
    crispEvaluator(operation, spec),
  ]),
);

export interface VerifyTraceOptions {
  /**
   * Evaluators for operations of other packages (fuzzy arithmetic...), keyed by operation
   * id. The crisp operations are always known.
   */
  readonly operations?: Readonly<Record<string, OperationEvaluator>>;
  /** Report operations that have no evaluator. Default `false`: they are skipped. */
  readonly requireKnownOperations?: boolean;
}

const EXPECTED_SHAPE = (rows: number, columns: number): TraceTableShape[] => {
  if (rows === 1 && columns === 1) return ['scalar', 'row-vector', 'column-vector', 'matrix'];
  if (rows === 1) return ['row-vector', 'matrix'];
  if (columns === 1) return ['column-vector', 'matrix'];
  return ['matrix'];
};

function isFiniteValue(value: TraceValue): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || typeof value === 'string') return true;
  return Object.values(value.components).every((component) => Number.isFinite(component));
}

/**
 * Audits a trace without trusting it. Checks that
 * - steps and axis items have unique ids and the tables are well formed,
 * - every cell has a derivation whose value is the value of the cell,
 * - every reference points to an existing cell of an *earlier* step and carries that
 *   cell's value,
 * - formulas are well formed and every named term and formula exists,
 * - every operation with a known evaluator gives exactly the recorded value when it is
 *   recomputed from its operands.
 *
 * Returns the problems found; an empty list means the trace is consistent.
 */
export function verifyTrace(trace: Trace, options: VerifyTraceOptions = {}): TraceProblem[] {
  const problems: TraceProblem[] = [];
  const evaluators = { ...options.operations, ...CRISP_EVALUATORS };

  if (trace.formatVersion !== TRACE_FORMAT_VERSION) {
    problems.push({
      code: 'format-version',
      message: `Unsupported trace format version ${String(trace.formatVersion)}.`,
    });
  }

  const stepPosition = new Map<string, number>();
  trace.steps.forEach((step, position) => {
    if (stepPosition.has(step.id)) {
      problems.push({ code: 'duplicate-step', message: `Duplicate step id.`, step: step.id });
    } else {
      stepPosition.set(step.id, position);
    }
    if (step.index !== position) {
      problems.push({
        code: 'step-index',
        message: `Step index ${step.index} does not match its position ${position}.`,
        step: step.id,
      });
    }
  });

  trace.steps.forEach((step, position) => {
    verifyStep(trace, step, position, stepPosition, evaluators, options, problems);
  });
  return problems;
}

function verifyStep(
  trace: Trace,
  step: TraceStep,
  position: number,
  stepPosition: ReadonlyMap<string, number>,
  evaluators: Readonly<Record<string, OperationEvaluator>>,
  options: VerifyTraceOptions,
  problems: TraceProblem[],
): void {
  const { rows, columns, cells, shape } = step.output;
  const at = { step: step.id };

  for (const [axis, items] of [
    ['row', rows],
    ['column', columns],
  ] as const) {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) {
        problems.push({
          code: 'duplicate-axis-id',
          message: `Duplicate ${axis} id "${item.id}".`,
          ...at,
        });
      }
      seen.add(item.id);
    }
  }

  const rectangular =
    rows.length > 0 &&
    columns.length > 0 &&
    cells.length === rows.length &&
    cells.every((row) => row.length === columns.length);
  if (!rectangular || !EXPECTED_SHAPE(rows.length, columns.length).includes(shape)) {
    problems.push({
      code: 'table-shape',
      message: `The output is not a well-formed ${shape} (${rows.length} × ${columns.length}).`,
      ...at,
    });
    if (!rectangular) return;
  }

  const formulaIds = new Set<string>();
  const termNames = new Set<string>();
  for (const formula of step.formulas) {
    formulaIds.add(formula.id);
    formula.terms.forEach((term) => termNames.add(term.name));
    for (const problem of formulaProblems(formula)) {
      problems.push({
        code: 'invalid-formula',
        message: `Formula "${formula.id}": ${problem}.`,
        ...at,
      });
    }
  }

  const declaredSources = new Set(
    step.sources.map((source) => (source.kind === 'step' ? `step:${source.step}` : '')),
  );
  // Shared nodes (a column maximum used by every cell of the column) are checked once.
  const checked = new WeakSet<object>();

  rows.forEach((rowItem, rowIndex) => {
    columns.forEach((columnItem, columnIndex) => {
      const where = { ...at, row: rowItem.id, column: columnItem.id };
      const cell = (cells[rowIndex] as (typeof cells)[number])[columnIndex];
      const derivation = cell?.derivation as DerivationNode | undefined;
      if (cell === undefined || derivation === undefined || derivation.kind === 'range') {
        problems.push({
          code: 'missing-derivation',
          message: 'The cell has no derivation.',
          ...where,
        });
        return;
      }
      if (!traceValuesEqual(cell.value, derivation.value)) {
        problems.push({
          code: 'value-mismatch',
          message: 'The value of the cell differs from the value of its derivation.',
          ...where,
        });
      }
      if (cell.formula !== undefined && !formulaIds.has(cell.formula)) {
        problems.push({
          code: 'unknown-formula',
          message: `The cell names the unknown formula "${cell.formula}".`,
          ...where,
        });
      }

      const visit = (node: DerivationNode): void => {
        if (checked.has(node)) return;
        checked.add(node);
        if (node.term !== undefined && step.formulas.length > 0 && !termNames.has(node.term)) {
          problems.push({
            code: 'unknown-term',
            message: `The term "${node.term}" is not defined by any formula of the step.`,
            ...where,
          });
        }
        if (node.kind !== 'range' && !isFiniteValue(node.value)) {
          problems.push({
            code: 'non-finite-value',
            message: 'A value is not finite.',
            ...where,
          });
        }
        if (node.kind === 'ref' || node.kind === 'range') {
          const target = stepPosition.get(node.ref.step);
          if (target === undefined) {
            problems.push({
              code: 'unknown-reference',
              message: `Reference to the unknown step "${node.ref.step}".`,
              ...where,
            });
            return;
          }
          if (target >= position) {
            problems.push({
              code: 'forward-reference',
              message: `Reference to step "${node.ref.step}", which is not an earlier step.`,
              ...where,
            });
            return;
          }
          if (!declaredSources.has(`step:${node.ref.step}`)) {
            problems.push({
              code: 'missing-source',
              message: `Step "${node.ref.step}" is used but not listed in the step sources.`,
              ...where,
            });
          }
          const refs = node.kind === 'ref' ? [node.ref] : expandRange(trace, node.ref);
          for (const ref of refs) {
            const referenced = findCell(trace, ref);
            if (referenced === undefined) {
              problems.push({
                code: 'unknown-reference',
                message: `Reference to the unknown cell (${ref.row}, ${ref.column}) of step "${ref.step}".`,
                ...where,
              });
            } else if (node.kind === 'ref' && !traceValuesEqual(referenced.value, node.value)) {
              problems.push({
                code: 'stale-reference',
                message: `The referenced cell (${ref.row}, ${ref.column}) of step "${ref.step}" holds another value.`,
                ...where,
              });
            }
          }
          return;
        }
        if (node.kind === 'operation') {
          node.operands.forEach(visit);
          verifyOperation(trace, node, evaluators, options, where, problems);
        }
      };
      visit(derivation);
    });
  });
}

function operandValues(trace: Trace, node: OperationNode): TraceValue[] | undefined {
  const values: TraceValue[] = [];
  for (const operand of node.operands) {
    if (operand.kind !== 'range') {
      values.push(operand.value);
      continue;
    }
    if (!trace.steps.some((step) => step.id === operand.ref.step)) return undefined;
    for (const ref of expandRange(trace, operand.ref)) {
      const cell = findCell(trace, ref);
      if (cell === undefined) return undefined;
      values.push(cell.value);
    }
  }
  return values;
}

function verifyOperation(
  trace: Trace,
  node: OperationNode,
  evaluators: Readonly<Record<string, OperationEvaluator>>,
  options: VerifyTraceOptions,
  where: { step: string; row: string; column: string },
  problems: TraceProblem[],
): void {
  const evaluate = Object.hasOwn(evaluators, node.operation)
    ? evaluators[node.operation]
    : undefined;
  if (evaluate === undefined) {
    if (options.requireKnownOperations === true) {
      problems.push({
        code: 'unknown-operation',
        message: `No evaluator for the operation "${node.operation}".`,
        ...where,
      });
    }
    return;
  }
  const args = operandValues(trace, node);
  if (args === undefined) return; // the broken reference is already reported
  const outcome = evaluate(args, node.options ?? {});
  if ('problem' in outcome) {
    problems.push({
      code: outcome.kind === 'arity' ? 'operation-arity' : 'operation-operand',
      message: outcome.problem,
      ...where,
    });
  } else if (!traceValuesEqual(outcome.value, node.value)) {
    problems.push({
      code: 'operation-mismatch',
      message: `Recomputing "${node.operation}" gives ${JSON.stringify(outcome.value)}, the trace records ${JSON.stringify(node.value)}.`,
      ...where,
    });
  }
}

/** Throws `EngineError('INVALID_TRACE')` listing the problems when the trace is not consistent. */
export function assertValidTrace(trace: Trace, options: VerifyTraceOptions = {}): void {
  const problems = verifyTrace(trace, options);
  if (problems.length > 0) {
    const first = problems
      .slice(0, 5)
      .map((p) => `[${p.code}] ${p.step ?? ''} ${p.row ?? ''} ${p.column ?? ''} ${p.message}`)
      .join('\n');
    throw new EngineError(
      'INVALID_TRACE',
      `The trace has ${problems.length} problem(s):\n${first}`,
      { problems },
    );
  }
}
