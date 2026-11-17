import type {
  CellRef,
  DerivationNode,
  FormulaTerm,
  InputRef,
  Trace,
  TraceCell,
  TraceFormula,
  TraceStep,
  TraceValue,
} from '@mateo/engine';
import { expandRange, formulaTermNames, getStep, resolveCell, walkDerivation } from '@mateo/engine';

/** A value that stands for a formula term in the derivation of one cell. */
export interface BoundOperand {
  readonly value: TraceValue;
  /** The cell the value was taken from, when it is a cell of an earlier step. */
  readonly ref?: CellRef;
  /** The method input the value was taken from. */
  readonly input?: InputRef;
}

/** A term of a formula with the values it has for one cell. */
export interface TermBinding {
  readonly term: FormulaTerm;
  /** `result`: the term the formula defines. `operand`: a term it is calculated from. */
  readonly role: 'result' | 'operand';
  readonly operands: readonly BoundOperand[];
  /** The term stands for a whole row, column or block (the operands of an aggregate). */
  readonly range: boolean;
}

/** Everything the trace says about how one cell was produced. */
export interface CellExplanation {
  readonly ref: CellRef;
  readonly step: TraceStep;
  readonly cell: TraceCell;
  /** The formula that produced the cell. `null` for input and carried-over cells. */
  readonly formula: TraceFormula | null;
  /** The terms of `formula` that have a value for this cell, in the order of the template. */
  readonly bindings: readonly TermBinding[];
  /** The cell the value was carried over from unchanged, if it was. */
  readonly carriedFrom: CellRef | null;
}

/** A cell of an earlier step that a derivation uses. */
export interface OperandRef {
  readonly ref: CellRef;
  readonly term?: string;
  /** False when the cell is part of a whole row, column or block. */
  readonly direct: boolean;
}

const refKey = (ref: CellRef): string => JSON.stringify([ref.step, ref.row, ref.column]);

/** Stable text key of a cell reference, for maps and element lookups. */
export function cellKey(ref: CellRef): string {
  return refKey(ref);
}

/**
 * Every cell of an earlier step that a derivation reads, each once per term, in the order
 * of the derivation. A node inherits the term of the closest operation above it that has
 * one, so `term(sum(row), 'S')` marks the cells of the row as `S`.
 */
export function operandRefs(trace: Trace, derivation: DerivationNode): OperandRef[] {
  const result: OperandRef[] = [];
  const seen = new Set<string>();
  const add = (ref: CellRef, term: string | undefined, direct: boolean) => {
    const key = `${refKey(ref)}|${term ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ref, direct, ...(term === undefined ? {} : { term }) });
  };
  const visit = (node: DerivationNode, inherited: string | undefined) => {
    const term = node.term ?? inherited;
    if (node.kind === 'ref') add(node.ref, term, true);
    else if (node.kind === 'range') {
      for (const ref of expandRange(trace, node.ref)) add(ref, term, false);
    } else if (node.kind === 'operation') {
      for (const operand of node.operands) visit(operand, term);
    }
  };
  visit(derivation, undefined);
  return result;
}

const RESULT_TERM = /^\s*\{\{\s*([A-Za-z0-9_.:-]+)\s*\}\}\s*=/u;

/** The term a formula defines: the single placeholder left of its first `=`, if any. */
export function resultTermName(formula: TraceFormula): string | undefined {
  return RESULT_TERM.exec(formula.template)?.[1];
}

/** The formula a cell was produced by, or `null` when no formula applies to it. */
export function formulaOfCell(step: TraceStep, cell: TraceCell): TraceFormula | null {
  if (cell.formula !== undefined) {
    return step.formulas.find((formula) => formula.id === cell.formula) ?? null;
  }
  if (step.formulas.length === 1 && cell.derivation.kind === 'operation') {
    return step.formulas[0] ?? null;
  }
  return null;
}

function operandsOf(trace: Trace, nodes: readonly DerivationNode[]): BoundOperand[] {
  const operands: BoundOperand[] = [];
  const seen = new Set<string>();
  const addCell = (ref: CellRef, value: TraceValue) => {
    const key = refKey(ref);
    if (seen.has(key)) return;
    seen.add(key);
    operands.push({ value, ref });
  };
  for (const node of nodes) {
    if (node.kind === 'ref') addCell(node.ref, node.value);
    else if (node.kind === 'range') {
      for (const ref of expandRange(trace, node.ref)) addCell(ref, resolveCell(trace, ref).value);
    } else if (node.kind === 'input') operands.push({ value: node.value, input: node.source });
    else operands.push({ value: node.value });
  }
  return operands;
}

/**
 * How a cell was produced: its formula and the value of every term for this cell. Only
 * reads the trace; a value that is not in the trace is never made up.
 */
export function explainCell(trace: Trace, ref: CellRef): CellExplanation {
  const step = getStep(trace, ref.step);
  const cell = resolveCell(trace, ref);
  const formula = formulaOfCell(step, cell);
  const carriedFrom = cell.derivation.kind === 'ref' ? cell.derivation.ref : null;
  if (formula === null) return { ref, step, cell, formula, bindings: [], carriedFrom };

  // A term can mark a cell, a whole range or the result of an operation such as a sum.
  const byTerm = new Map<string, DerivationNode[]>();
  walkDerivation(cell.derivation, (node) => {
    if (node.term === undefined) return;
    const list = byTerm.get(node.term);
    if (list === undefined) byTerm.set(node.term, [node]);
    else list.push(node);
  });

  const result = resultTermName(formula);
  const terms = new Map(formula.terms.map((term) => [term.name, term]));
  const bindings: TermBinding[] = [];
  for (const name of formulaTermNames(formula.template)) {
    const term = terms.get(name);
    if (term === undefined) continue;
    const nodes = byTerm.get(name);
    if (nodes !== undefined) {
      bindings.push({
        term,
        role: 'operand',
        operands: operandsOf(trace, nodes),
        range: nodes.some((node) => node.kind === 'range'),
      });
    } else if (name === result) {
      bindings.push({ term, role: 'result', operands: [{ value: cell.value, ref }], range: false });
    }
  }
  return { ref, step, cell, formula, bindings, carriedFrom };
}
