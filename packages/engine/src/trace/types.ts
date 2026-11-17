import type { TextParams, TextRef } from '../model/text';

/**
 * A value that is not a single number, for example a triangular fuzzy number
 * `{ type: 'tfn', components: { l: 1, m: 2, u: 3 } }`. The engine does not interpret it;
 * the package that owns the number type encodes and renders it.
 */
export interface TraceCompositeValue {
  readonly type: string;
  readonly components: Readonly<Record<string, number>>;
}

/**
 * Everything a trace can hold in a cell. All of it is plain JSON, and numbers are always
 * finite, so a trace survives `JSON.parse(JSON.stringify(trace))` unchanged.
 * `null` is an intentionally empty cell (see {@link EmptyNode}).
 */
export type TraceValue = number | string | null | TraceCompositeValue;

/** One cell of the output of a step. `row` and `column` are axis item ids. */
export interface CellRef {
  readonly step: string;
  readonly row: string;
  readonly column: string;
}

/**
 * A set of cells of one step, in row-major order. `'all'` selects the whole axis, so
 * `{ rows: 'all', columns: ['c1'] }` is the column `c1`.
 */
export interface RangeRef {
  readonly step: string;
  readonly rows: 'all' | readonly string[];
  readonly columns: 'all' | readonly string[];
}

/** A value of one of the method's inputs (`InputSlot.name`), outside the trace. */
export interface InputRef {
  readonly input: string;
  readonly row?: string;
  readonly column?: string;
}

interface NodeBase {
  /**
   * Name of the formula term this operand stands for (see {@link FormulaTerm}). This is
   * the link that lets the UI highlight matrix cells from a formula term and back.
   */
  readonly term?: string;
}

/** A value taken from a method input as-is. */
export interface InputNode extends NodeBase {
  readonly kind: 'input';
  readonly source: InputRef;
  readonly value: TraceValue;
}

/** A value taken from a cell of an earlier step. */
export interface RefNode extends NodeBase {
  readonly kind: 'ref';
  readonly ref: CellRef;
  readonly value: TraceValue;
}

/**
 * A whole row, column or block of an earlier step used as the operands of an aggregate
 * (`max` over a column...). The values are not copied; resolve them with `resolveRange`.
 */
export interface RangeNode extends NodeBase {
  readonly kind: 'range';
  readonly ref: RangeRef;
}

/** A literal that is part of the formula, such as the `1` in `1 - x`. */
export interface ConstantNode extends NodeBase {
  readonly kind: 'constant';
  readonly value: TraceValue;
}

/** The value of a method parameter. */
export interface ParameterNode extends NodeBase {
  readonly kind: 'parameter';
  readonly name: string;
  readonly value: TraceValue;
}

export type OperationOptions = Readonly<Record<string, string | number | boolean>>;

/** The result of applying a named operation to operands. */
export interface OperationNode extends NodeBase {
  readonly kind: 'operation';
  /** Operation id: a {@link CrispOperationId} or one defined by another package. */
  readonly operation: string;
  readonly operands: readonly DerivationNode[];
  /** Settings of the operation that are not operands, such as the tie rule of `rank`. */
  readonly options?: OperationOptions;
  readonly value: TraceValue;
}

/** A cell that has no value by definition (for example the first row of a SWARA table). */
export interface EmptyNode extends NodeBase {
  readonly kind: 'empty';
  readonly value: null;
  readonly reasonKey?: string;
}

/** A node that carries one value. Only these can be the derivation of a cell. */
export type ValueNode =
  InputNode | RefNode | ConstantNode | ParameterNode | OperationNode | EmptyNode;

/**
 * A node of a derivation tree. The tree of a cell says exactly how its value was produced:
 * which operation, on which operands, coming from which cells.
 */
export type DerivationNode = ValueNode | RangeNode;

export interface TraceCell {
  readonly value: TraceValue;
  /**
   * How `value` was produced. A bare {@link RefNode} means the value was carried over
   * unchanged from an earlier step.
   */
  readonly derivation: ValueNode;
  /** Id of the step formula that produced this cell, when the step has several. */
  readonly formula?: string;
}

export type AxisItemKind =
  | 'alternative'
  | 'criterion'
  /** Rows or columns added by the method, such as the ideal and anti-ideal solutions. */
  | 'reference'
  /** A computed quantity, such as the column `S_i` of a vector. */
  | 'quantity'
  | (string & Record<never, never>);

/** A row or column header of a step output. */
export interface TraceAxisItem {
  /** Unique within the axis. For alternatives and criteria this is the entity id. */
  readonly id: string;
  readonly label: TextRef;
  readonly kind?: AxisItemKind;
}

export type TraceTableShape = 'matrix' | 'column-vector' | 'row-vector' | 'scalar';

/**
 * The output of a step. Vectors and scalars are tables with a single row and/or column,
 * so every output cell is addressed the same way.
 */
export interface TraceTable {
  readonly shape: TraceTableShape;
  readonly rows: readonly TraceAxisItem[];
  readonly columns: readonly TraceAxisItem[];
  /** `cells[r][c]` belongs to `rows[r]` and `columns[c]`. */
  readonly cells: readonly (readonly TraceCell[])[];
}

export interface FormulaTerm {
  /** Name used in `{{name}}` placeholders and in `DerivationNode.term`. */
  readonly name: string;
  /** LaTeX of the term in the notation of the source paper, for example `x_{ij}`. */
  readonly latex: string;
  readonly description?: TextRef;
}

/**
 * A formula in LaTeX with named terms. The template marks every term with a
 * `{{name}}` placeholder: `{{n}} = \frac{ {{x}} }{ {{x_ai}} }`. `renderFormula` turns it
 * into LaTeX, optionally wrapping or substituting terms.
 */
export interface TraceFormula {
  /** Unique within the step. */
  readonly id: string;
  readonly template: string;
  readonly terms: readonly FormulaTerm[];
  /** When the formula applies, for example "for benefit criteria". */
  readonly condition?: TextRef;
}

export type VisualizationView =
  'matrix' | 'bars' | 'ranking' | 'value' | (string & Record<never, never>);

/** Advice for the presentation layer. It never changes any value. */
export interface VisualizationHint {
  readonly view: VisualizationView;
  /** Step whose output this one visually grows out of (cell flights start there). */
  readonly basedOn?: string;
  /** Axis items worth drawing attention to. */
  readonly highlightRows?: readonly string[];
  readonly highlightColumns?: readonly string[];
}

/** Something a step consumed. Collected automatically from the derivations of its cells. */
export type StepSource =
  | { readonly kind: 'step'; readonly step: string }
  | { readonly kind: 'input'; readonly input: string }
  | { readonly kind: 'parameter'; readonly name: string };

/**
 * `input`: echoes method input into the trace. `intermediate`: a calculation step.
 * `result`: a step whose output is part of the final result.
 */
export type StepRole = 'input' | 'intermediate' | 'result';

export interface TraceStep {
  /** Stable id, unique within the trace. Explain sequences map to it. */
  readonly id: string;
  /** Position in the trace, from 0. */
  readonly index: number;
  readonly role: StepRole;
  readonly nameKey: string;
  readonly explanationKey: string;
  readonly explanationParams?: TextParams;
  readonly formulas: readonly TraceFormula[];
  readonly sources: readonly StepSource[];
  readonly output: TraceTable;
  readonly visualization: VisualizationHint;
}

/**
 * The ordered record of one method run. Derivation nodes may be shared between cells (a
 * column maximum is one node used by every cell of its column), so treat them as
 * immutable. A trace is stored with `encodeTrace`, which keeps that sharing, and read with
 * `decodeTrace`; any change to these types must be reflected there (see `codec.ts`).
 */
export interface Trace {
  readonly methodId: string;
  readonly methodVersion: string;
  readonly steps: readonly TraceStep[];
}
