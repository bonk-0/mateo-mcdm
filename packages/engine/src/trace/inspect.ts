import { EngineError } from '../errors';
import type {
  CellRef,
  DerivationNode,
  RangeRef,
  Trace,
  TraceCell,
  TraceStep,
  TraceValue,
} from './types';

interface StepIndex {
  readonly step: TraceStep;
  readonly rows: ReadonlyMap<string, number>;
  readonly columns: ReadonlyMap<string, number>;
}

const indexCache = new WeakMap<Trace, ReadonlyMap<string, StepIndex>>();

function indexOf(trace: Trace): ReadonlyMap<string, StepIndex> {
  let index = indexCache.get(trace);
  if (index === undefined) {
    const built = new Map<string, StepIndex>();
    for (const step of trace.steps) {
      if (built.has(step.id)) continue; // duplicates are reported by verifyTrace
      built.set(step.id, {
        step,
        rows: new Map(step.output.rows.map((item, position) => [item.id, position])),
        columns: new Map(step.output.columns.map((item, position) => [item.id, position])),
      });
    }
    index = built;
    indexCache.set(trace, index);
  }
  return index;
}

/** The step with the given id, or `undefined`. */
export function findStep(trace: Trace, stepId: string): TraceStep | undefined {
  return indexOf(trace).get(stepId)?.step;
}

/** The step with the given id. Throws when the trace has no such step. */
export function getStep(trace: Trace, stepId: string): TraceStep {
  const step = findStep(trace, stepId);
  if (step === undefined) {
    throw new EngineError('UNKNOWN_REFERENCE', `The trace has no step "${stepId}".`, { stepId });
  }
  return step;
}

/** The cell a reference points to, or `undefined` when the step, row or column is unknown. */
export function findCell(trace: Trace, ref: CellRef): TraceCell | undefined {
  const entry = indexOf(trace).get(ref.step);
  if (entry === undefined) return undefined;
  const row = entry.rows.get(ref.row);
  const column = entry.columns.get(ref.column);
  if (row === undefined || column === undefined) return undefined;
  return entry.step.output.cells[row]?.[column];
}

/** The cell a reference points to. Throws when it does not exist. */
export function resolveCell(trace: Trace, ref: CellRef): TraceCell {
  const cell = findCell(trace, ref);
  if (cell === undefined) {
    throw new EngineError(
      'UNKNOWN_REFERENCE',
      `The trace has no cell (${ref.row}, ${ref.column}) in step "${ref.step}".`,
      { ...ref },
    );
  }
  return cell;
}

/** The single-cell references a range stands for, in row-major order. */
export function expandRange(trace: Trace, ref: RangeRef): CellRef[] {
  const step = getStep(trace, ref.step);
  const rows = ref.rows === 'all' ? step.output.rows.map((item) => item.id) : ref.rows;
  const columns = ref.columns === 'all' ? step.output.columns.map((item) => item.id) : ref.columns;
  return rows.flatMap((row) => columns.map((column) => ({ step: ref.step, row, column })));
}

/** The cells of a range, in row-major order. Throws when any of them does not exist. */
export function resolveRange(trace: Trace, ref: RangeRef): TraceCell[] {
  return expandRange(trace, ref).map((cellRef) => resolveCell(trace, cellRef));
}

/** Visits a derivation tree depth-first, parents before their operands. */
export function walkDerivation(node: DerivationNode, visit: (node: DerivationNode) => void): void {
  visit(node);
  if (node.kind === 'operation') {
    for (const operand of node.operands) walkDerivation(operand, visit);
  }
}

/**
 * The operands of a cell that stand for formula terms, grouped by term name. This is what
 * linked highlighting needs: for each term of the formula, the cells or ranges behind it.
 */
export function termOperands(derivation: DerivationNode): Map<string, DerivationNode[]> {
  const result = new Map<string, DerivationNode[]>();
  walkDerivation(derivation, (node) => {
    if (node.term === undefined) return;
    const list = result.get(node.term);
    if (list === undefined) result.set(node.term, [node]);
    else list.push(node);
  });
  return result;
}

/** Structural equality of two trace values. */
export function traceValuesEqual(a: TraceValue, b: TraceValue): boolean {
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (a.type !== b.type) return false;
  const keys = Object.keys(a.components);
  if (keys.length !== Object.keys(b.components).length) return false;
  return keys.every((key) => key in b.components && a.components[key] === b.components[key]);
}
