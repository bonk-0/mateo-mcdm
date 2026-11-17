import { EngineError } from '../errors';
import type {
  CellRef,
  DerivationNode,
  OperationOptions,
  Trace,
  TraceCell,
  TraceCompositeValue,
  TraceStep,
  TraceValue,
  ValueNode,
} from './types';

/**
 * The stored form of a trace (`encodeTrace` / `decodeTrace`).
 *
 * The in-memory trace shares its derivation nodes: one column maximum is the operand of
 * every cell of the column, and a reference carries the value of the cell it points to.
 * Written as plain JSON, every use became a full copy, so a 500 × 50 run stored 25–50 MB.
 * Format 2 keeps the sharing:
 *
 * - every distinct node is written once, in `nodes`, and is referred to by its position.
 *   Nodes come after their operands, so a reader builds them in one pass. Nodes that are
 *   structurally equal are written once too, whether or not they were one object;
 * - a cell is the position of its derivation node: its value is the node's value;
 * - a reference to a cell of an earlier step names the step and the row and column by
 *   position and leaves out the value, which is the value of that cell;
 * - names (operations, terms, inputs, parameters...) are positions in `strings`, and
 *   composite values keep their type and component names in `shapes`.
 *
 * Step metadata (names, formulas, axes...) is kept as it is. Format 1 was the in-memory
 * trace as plain JSON; `decodeTrace` still reads it.
 *
 * Node layouts, by the kind code in the first position. A field in brackets is optional:
 * it is left out at the end and written as `null` when a later field is present.
 *
 * | Code | Kind      | Layout                                                    |
 * | ---- | --------- | --------------------------------------------------------- |
 * | 0    | input     | `[0, value, input, [row], [column], [term]]`              |
 * | 1    | ref       | `[1, step, row, column, [term], [value]]`                 |
 * | 2    | range     | `[2, step, rows, columns, [term]]`                        |
 * | 3    | constant  | `[3, value, [term]]`                                      |
 * | 4    | parameter | `[4, name, value, [term]]`                                |
 * | 5    | operation | `[5, operation, operands, value, [term], [options]]`      |
 * | 6    | empty     | `[6, [reasonKey], [term]]`                                |
 *
 * `step`, `row` and `column` of `ref` and `range` are positions in the trace and in the
 * axes of that step. `rows` and `columns` of a range are `"all"` or a list of positions in
 * which `[first, last]` stands for the ascending run `first, first + 1, ..., last`.
 * A `ref` holds a value only when it differs from the cell it points to (never in a trace
 * made by the `TraceBuilder`). A value is a number, a string, `null`, or
 * `[shape, ...components]` for a composite value.
 *
 * A cell is `node`, `[node, formula]` (a position in the step's formulas) or, when its
 * value differs from its derivation's (never in a trace made by the builder),
 * `[node, formula or null, value]`.
 */
export const TRACE_FORMAT_VERSION = 2;

/** Stored trace formats that {@link decodeTrace} reads. */
export const READABLE_TRACE_FORMAT_VERSIONS: readonly number[] = [1, TRACE_FORMAT_VERSION];

export type EncodedValue = number | string | null | readonly (number | string)[];
export type EncodedNode = readonly unknown[];
export type EncodedCell = number | readonly unknown[];

export interface EncodedStep extends Omit<TraceStep, 'output'> {
  readonly output: Omit<TraceStep['output'], 'cells'> & {
    readonly cells: readonly (readonly EncodedCell[])[];
  };
}

export interface EncodedTrace {
  readonly formatVersion: typeof TRACE_FORMAT_VERSION;
  readonly methodId: string;
  readonly methodVersion: string;
  readonly strings: readonly string[];
  /** `[type, ...component names]` of each kind of composite value. */
  readonly shapes: readonly (readonly string[])[];
  readonly nodes: readonly EncodedNode[];
  readonly steps: readonly EncodedStep[];
}

const KIND_CODE = {
  input: 0,
  ref: 1,
  range: 2,
  constant: 3,
  parameter: 4,
  operation: 5,
  empty: 6,
} as const satisfies Record<DerivationNode['kind'], number>;

/**
 * The fields of each node kind. Encoding refuses a node with any other field, so a field
 * added to the trace model cannot be dropped silently: it fails here until the format
 * learns it.
 */
const NODE_FIELDS: Record<DerivationNode['kind'], ReadonlySet<string>> = {
  input: new Set(['kind', 'source', 'value', 'term']),
  ref: new Set(['kind', 'ref', 'value', 'term']),
  range: new Set(['kind', 'ref', 'term']),
  constant: new Set(['kind', 'value', 'term']),
  parameter: new Set(['kind', 'name', 'value', 'term']),
  operation: new Set(['kind', 'operation', 'operands', 'options', 'value', 'term']),
  empty: new Set(['kind', 'value', 'reasonKey', 'term']),
};
const CELL_FIELDS: ReadonlySet<string> = new Set(['value', 'derivation', 'formula']);
const COMPOSITE_FIELDS: ReadonlySet<string> = new Set(['type', 'components']);
const INPUT_SOURCE_FIELDS: ReadonlySet<string> = new Set(['input', 'row', 'column']);
const CELL_REF_FIELDS: ReadonlySet<string> = new Set(['step', 'row', 'column']);
const RANGE_REF_FIELDS: ReadonlySet<string> = new Set(['step', 'rows', 'columns']);

function invalid(message: string, details: Record<string, unknown> = {}): never {
  throw new EngineError('INVALID_TRACE', message, details);
}

function assertFields(value: object, allowed: ReadonlySet<string>, what: string): void {
  // `for...in` rather than Object.keys: this runs for every node and allocates nothing.
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;
    if (!allowed.has(key) && (value as Record<string, unknown>)[key] !== undefined) {
      invalid(`Cannot store the field "${key}" of ${what}: the trace format does not know it.`, {
        field: key,
      });
    }
  }
}

/** Exact equality of trace values: `Object.is` on numbers, component names in order. */
function sameValue(a: TraceValue, b: TraceValue): boolean {
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return Object.is(a, b);
  }
  if (a.type !== b.type) return false;
  const keysA = Object.keys(a.components);
  const keysB = Object.keys(b.components);
  return (
    keysA.length === keysB.length &&
    keysA.every(
      (key, index) => key === keysB[index] && Object.is(a.components[key], b.components[key]),
    )
  );
}

/** Drops trailing `null`s, which stand for absent optional fields. */
function trimmed(fields: unknown[]): unknown[] {
  let end = fields.length;
  while (end > 0 && fields[end - 1] === null) end -= 1;
  return end === fields.length ? fields : fields.slice(0, end);
}

/** Key of an encoded node for structural sharing; `-0` must not meet `0`. */
function negativeZeroKey(fields: readonly unknown[]): string {
  return JSON.stringify(fields, (_key, value: unknown) => (Object.is(value, -0) ? '-0' : value));
}

/**
 * A list of axis positions, with each ascending run of three or more written as
 * `[first, last]`: "every column but j" takes a few numbers instead of n.
 */
function compactPositions(positions: readonly number[]): (number | [number, number])[] {
  const out: (number | [number, number])[] = [];
  let start = 0;
  while (start < positions.length) {
    let end = start;
    while (
      end + 1 < positions.length &&
      (positions[end + 1] as number) === (positions[end] as number) + 1
    ) {
      end += 1;
    }
    if (end - start >= 2) {
      out.push([positions[start] as number, positions[end] as number]);
    } else {
      for (let index = start; index <= end; index += 1) out.push(positions[index] as number);
    }
    start = end + 1;
  }
  return out;
}

interface StepIndex {
  readonly position: number;
  readonly rows: ReadonlyMap<string, number>;
  readonly columns: ReadonlyMap<string, number>;
}

/** Writes a trace in the stored format (see {@link TRACE_FORMAT_VERSION}). */
export function encodeTrace(trace: Trace): EncodedTrace {
  const strings: string[] = [];
  const stringIndex = new Map<string, number>();
  const shapes: string[][] = [];
  const shapeIndex = new Map<string, number>();
  const nodes: EncodedNode[] = [];
  const byKey = new Map<string, number>();
  const byObject = new Map<DerivationNode, number>();
  const steps = new Map<string, StepIndex>();
  /** Per step, the value of each cell, for references to leave out. */
  const cellValues: (readonly (readonly TraceValue[])[])[] = [];

  const str = (value: string): number => {
    let index = stringIndex.get(value);
    if (index === undefined) {
      index = strings.length;
      strings.push(value);
      stringIndex.set(value, index);
    }
    return index;
  };
  const optionalStr = (value: string | undefined): number | null =>
    value === undefined ? null : str(value);

  /** Set when the node being encoded holds a -0, which JSON text would write as 0. */
  let negativeZero = false;
  const encodeValue = (value: TraceValue): EncodedValue => {
    if (typeof value !== 'object' || value === null) {
      if (Object.is(value, -0)) negativeZero = true;
      return value;
    }
    assertFields(value, COMPOSITE_FIELDS, 'a composite value');
    const names = Object.keys(value.components);
    const shape = [value.type, ...names];
    const key = JSON.stringify(shape);
    let index = shapeIndex.get(key);
    if (index === undefined) {
      index = shapes.length;
      shapes.push(shape);
      shapeIndex.set(key, index);
    }
    return [
      index,
      ...names.map((name) => {
        const component = value.components[name] as number;
        if (Object.is(component, -0)) negativeZero = true;
        return component;
      }),
    ];
  };

  const lookup = (step: string, what: string): StepIndex =>
    steps.get(step) ??
    invalid(`Cannot store ${what} to the step "${step}", which comes later or does not exist.`, {
      step,
    });
  const axisPosition = (map: ReadonlyMap<string, number>, id: string, step: string): number =>
    map.get(id) ??
    invalid(`Cannot store a reference to "${id}", which step "${step}" does not have.`, {
      step,
      id,
    });

  const encodeRef = (ref: CellRef): [number, number, number, TraceValue] => {
    assertFields(ref, CELL_REF_FIELDS, 'a cell reference');
    const target = lookup(ref.step, 'a reference');
    const row = axisPosition(target.rows, ref.row, ref.step);
    const column = axisPosition(target.columns, ref.column, ref.step);
    const value = (cellValues[target.position] as TraceValue[][])[row]?.[column] as TraceValue;
    return [target.position, row, column, value];
  };

  const options = (value: OperationOptions | undefined): OperationOptions | null => {
    if (value === undefined) return null;
    if (Object.values(value).some((item) => Object.is(item, -0))) negativeZero = true;
    return value;
  };

  /** The fields of a node whose operands are already encoded. */
  const fieldsOf = (node: DerivationNode): unknown[] => {
    assertFields(node, NODE_FIELDS[node.kind] ?? invalid(`Unknown node kind.`), `a node`);
    const term = optionalStr(node.term);
    switch (node.kind) {
      case 'input':
        assertFields(node.source, INPUT_SOURCE_FIELDS, 'an input reference');
        return trimmed([
          KIND_CODE.input,
          encodeValue(node.value),
          str(node.source.input),
          optionalStr(node.source.row),
          optionalStr(node.source.column),
          term,
        ]);
      case 'ref': {
        const [step, row, column, target] = encodeRef(node.ref);
        return sameValue(node.value, target)
          ? trimmed([KIND_CODE.ref, step, row, column, term])
          : [KIND_CODE.ref, step, row, column, term, encodeValue(node.value)];
      }
      case 'range': {
        assertFields(node.ref, RANGE_REF_FIELDS, 'a range reference');
        const target = lookup(node.ref.step, 'a range');
        const positions = (
          ids: 'all' | readonly string[],
          map: ReadonlyMap<string, number>,
        ): 'all' | (number | [number, number])[] =>
          ids === 'all'
            ? 'all'
            : compactPositions(ids.map((id) => axisPosition(map, id, node.ref.step)));
        return trimmed([
          KIND_CODE.range,
          target.position,
          positions(node.ref.rows, target.rows),
          positions(node.ref.columns, target.columns),
          term,
        ]);
      }
      case 'constant':
        return trimmed([KIND_CODE.constant, encodeValue(node.value), term]);
      case 'parameter':
        return trimmed([KIND_CODE.parameter, str(node.name), encodeValue(node.value), term]);
      case 'operation':
        return trimmed([
          KIND_CODE.operation,
          str(node.operation),
          node.operands.map((operand) => byObject.get(operand) as number),
          encodeValue(node.value),
          term,
          options(node.options),
        ]);
      case 'empty':
        if (node.value !== null) invalid('An empty node must have the value null.');
        return trimmed([KIND_CODE.empty, optionalStr(node.reasonKey), term]);
    }
  };

  // Work lists of encodeNode, reused across calls: a trace has hundreds of thousands of nodes.
  const pending: DerivationNode[] = [];
  /** Operations of `pending` whose operands have been queued. */
  const open = new Set<DerivationNode>();

  /** Writes a node after its operands, without recursion (derivations can be deep). */
  const encodeNode = (root: DerivationNode): number => {
    const known = byObject.get(root);
    if (known !== undefined) return known;
    pending.push(root);
    while (pending.length > 0) {
      const node = pending[pending.length - 1] as DerivationNode;
      if (node.kind === 'operation' && !open.has(node)) {
        if (byObject.has(node)) {
          // Queued twice (an operand used twice) and written meanwhile.
          pending.pop();
          continue;
        }
        open.add(node);
        for (let index = node.operands.length - 1; index >= 0; index -= 1) {
          const operand = node.operands[index] as DerivationNode;
          if (open.has(operand)) invalid('A derivation contains itself.');
          if (!byObject.has(operand)) pending.push(operand);
        }
        continue;
      }
      pending.pop();
      open.delete(node);
      if (byObject.has(node)) continue;
      negativeZero = false;
      const fields = fieldsOf(node);
      const key = negativeZero ? negativeZeroKey(fields) : JSON.stringify(fields);
      let position = byKey.get(key);
      if (position === undefined) {
        position = nodes.length;
        nodes.push(fields);
        byKey.set(key, position);
      }
      byObject.set(node, position);
    }
    return byObject.get(root) as number;
  };

  const encodedSteps = trace.steps.map((step, position): EncodedStep => {
    const { rows, columns, cells } = step.output;
    const formulaIndex = new Map(step.formulas.map((formula, index) => [formula.id, index]));
    const values: TraceValue[][] = [];
    const encodedCells = cells.map((cellRow, r) => {
      const valueRow: TraceValue[] = [];
      const encodedRow = cellRow.map((cell: TraceCell): EncodedCell => {
        assertFields(cell, CELL_FIELDS, 'a cell');
        const node = encodeNode(cell.derivation);
        valueRow.push(cell.value);
        let formula: number | null = null;
        if (cell.formula !== undefined) {
          formula =
            formulaIndex.get(cell.formula) ??
            invalid(`Step "${step.id}", row ${r}: the cell names the unknown formula.`, {
              step: step.id,
              formula: cell.formula,
            });
        }
        if (!sameValue(cell.value, cell.derivation.value)) {
          return [node, formula, encodeValue(cell.value)];
        }
        return formula === null ? node : [node, formula];
      });
      values.push(valueRow);
      return encodedRow;
    });
    // Registered after its cells: a step can only reference earlier steps.
    if (steps.has(step.id)) invalid(`Duplicate step id "${step.id}".`, { step: step.id });
    steps.set(step.id, {
      position,
      rows: axisMap(rows, step.id),
      columns: axisMap(columns, step.id),
    });
    cellValues.push(values);
    return { ...step, output: { ...step.output, cells: encodedCells } };
  });

  return {
    formatVersion: TRACE_FORMAT_VERSION,
    methodId: trace.methodId,
    methodVersion: trace.methodVersion,
    strings,
    shapes,
    nodes,
    steps: encodedSteps,
  };
}

function axisMap(items: readonly { readonly id: string }[], step: string): Map<string, number> {
  const map = new Map<string, number>();
  items.forEach((item, index) => {
    if (map.has(item.id)) invalid(`Step "${step}" has the axis id "${item.id}" twice.`, { step });
    map.set(item.id, index);
  });
  return map;
}

// ---------------------------------------------------------------------------------------
// Reading

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads a stored trace of any format in {@link READABLE_TRACE_FORMAT_VERSIONS}. Stored
 * data is not trusted: anything malformed throws `EngineError('INVALID_TRACE')`. Nodes
 * that the stored form shares are shared objects in the result.
 */
export function decodeTrace(stored: unknown): Trace {
  if (!isRecord(stored)) invalid('A stored trace must be an object.');
  const version = stored['formatVersion'];
  if (version === 1) return decodeV1(stored);
  if (version === TRACE_FORMAT_VERSION) return decodeV2(stored);
  return invalid(`Unknown trace format version ${String(version)}.`, { version });
}

/** Format 1 is the in-memory trace as plain JSON. */
function decodeV1(stored: Record<string, unknown>): Trace {
  const { methodId, methodVersion, steps } = stored;
  if (typeof methodId !== 'string' || typeof methodVersion !== 'string' || !Array.isArray(steps)) {
    invalid('A stored trace needs a method id, a method version and steps.');
  }
  return { methodId, methodVersion, steps: steps as TraceStep[] };
}

function decodeV2(stored: Record<string, unknown>): Trace {
  const { methodId, methodVersion, strings, shapes, nodes, steps } = stored;
  if (typeof methodId !== 'string' || typeof methodVersion !== 'string') {
    invalid('A stored trace needs a method id and a method version.');
  }
  if (!Array.isArray(strings) || !strings.every((item) => typeof item === 'string')) {
    invalid('The strings of a stored trace must be a list of strings.');
  }
  if (
    !Array.isArray(shapes) ||
    !shapes.every(
      (shape) =>
        Array.isArray(shape) &&
        shape.length >= 1 &&
        shape.every((item) => typeof item === 'string'),
    )
  ) {
    invalid('The shapes of a stored trace must be lists of names.');
  }
  if (!Array.isArray(nodes) || !Array.isArray(steps)) {
    invalid('A stored trace needs nodes and steps.');
  }
  const text = strings as readonly string[];
  const shapeList = shapes as readonly (readonly string[])[];

  const string = (value: unknown, what: string): string => {
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 0 ||
      value >= text.length
    ) {
      return invalid(`The ${what} of a stored node is not a known name.`);
    }
    return text[value] as string;
  };
  const optionalString = (value: unknown, what: string): string | undefined =>
    value === undefined || value === null ? undefined : string(value, what);

  const value = (encoded: unknown): TraceValue => {
    if (encoded === null || typeof encoded === 'string') return encoded;
    if (typeof encoded === 'number') {
      if (!Number.isFinite(encoded)) invalid('A stored value is not a finite number.');
      return encoded;
    }
    if (Array.isArray(encoded)) {
      const shape = shapeList[encoded[0] as number];
      if (!Number.isInteger(encoded[0]) || shape === undefined || encoded.length !== shape.length) {
        invalid('A stored composite value does not match its shape.');
      }
      const components: Record<string, number> = {};
      for (let index = 1; index < shape.length; index += 1) {
        const component: unknown = encoded[index];
        if (typeof component !== 'number' || !Number.isFinite(component)) {
          invalid('A stored composite value has a component that is not a finite number.');
        }
        components[shape[index] as string] = component;
      }
      const composite: TraceCompositeValue = { type: shape[0] as string, components };
      return composite;
    }
    return invalid('A stored value has an unknown form.');
  };

  // Steps first, so references can name their rows and columns.
  const stepList = (steps as unknown[]).map((step, position) => {
    if (!isRecord(step) || !isRecord(step['output'])) {
      invalid(`Stored step ${position} is malformed.`);
    }
    const output = step['output'];
    const { rows, columns, cells } = output;
    if (
      typeof step['id'] !== 'string' ||
      !Array.isArray(rows) ||
      !Array.isArray(columns) ||
      !Array.isArray(cells) ||
      !rows.every((item) => isRecord(item) && typeof item['id'] === 'string') ||
      !columns.every((item) => isRecord(item) && typeof item['id'] === 'string')
    ) {
      invalid(`Stored step ${position} is malformed.`);
    }
    const formulas: unknown = step['formulas'];
    return {
      step,
      output,
      id: step['id'],
      rowIds: (rows as { id: string }[]).map((item) => item.id),
      columnIds: (columns as { id: string }[]).map((item) => item.id),
      formulaIds: (Array.isArray(formulas) ? formulas : []).map((formula: unknown) =>
        isRecord(formula) && typeof formula['id'] === 'string'
          ? formula['id']
          : invalid(`Stored step ${position} has a formula without an id.`),
      ),
      cells: parseCells(cells as unknown[], rows.length, columns.length),
    };
  });
  type StepEntry = (typeof stepList)[number];

  const decoded: DerivationNode[] = [];
  const nodeList = nodes as unknown[];
  /** Values of the cells of the steps before `known`, `[step][row][column]`. */
  const cellValues: TraceValue[][][] = [];
  let known = 0;

  const index = (encoded: unknown, length: number, what: string): number => {
    if (
      typeof encoded !== 'number' ||
      !Number.isInteger(encoded) ||
      encoded < 0 ||
      encoded >= length
    ) {
      return invalid(`A stored trace refers to an unknown ${what}.`);
    }
    return encoded;
  };

  /**
   * Makes the cells of every step whose nodes have all been read known. The writer emits
   * the nodes of a step's cells before any node of a later step, so a reference (which
   * only points to earlier steps) always finds its cell known.
   */
  const learnCells = (read: number): void => {
    while (known < stepList.length) {
      const { cells } = stepList[known] as StepEntry;
      if (cells.maxNode >= read) return;
      cellValues.push(
        cells.nodes.map((row, r) =>
          row.map((node, c) => {
            const derivation = decoded[node] as DerivationNode;
            if (derivation.kind === 'range') invalid('A stored cell is derived from a range.');
            const stored = (cells.values[r] as unknown[])[c];
            return stored === undefined ? derivation.value : value(stored);
          }),
        ),
      );
      known += 1;
    }
  };

  const nodeObject = (encoded: unknown, at: number): DerivationNode => {
    if (!Array.isArray(encoded)) return invalid(`Stored node ${at} is not a list.`);
    const kind: unknown = encoded[0];
    const term = optionalString(encoded[KIND_TERM_POSITION[kind as number] ?? -1], 'term');
    const withTerm = <N extends DerivationNode>(node: N): N =>
      term === undefined ? node : { ...node, term };
    switch (kind) {
      case KIND_CODE.input: {
        const row = optionalString(encoded[3], 'row');
        const column = optionalString(encoded[4], 'column');
        return withTerm({
          kind: 'input',
          source: {
            input: string(encoded[2], 'input'),
            ...(row === undefined ? {} : { row }),
            ...(column === undefined ? {} : { column }),
          },
          value: value(encoded[1]),
        });
      }
      case KIND_CODE.ref: {
        const step = index(encoded[1], known, 'step');
        const target = stepList[step] as StepEntry;
        const row = index(encoded[2], target.rowIds.length, 'row');
        const column = index(encoded[3], target.columnIds.length, 'column');
        return withTerm({
          kind: 'ref',
          ref: {
            step: target.id,
            row: target.rowIds[row] as string,
            column: target.columnIds[column] as string,
          },
          value:
            encoded.length > 5
              ? value(encoded[5])
              : ((cellValues[step] as TraceValue[][])[row] as TraceValue[])[column]!,
        });
      }
      case KIND_CODE.range: {
        const step = index(encoded[1], known, 'step');
        const target = stepList[step] as StepEntry;
        const ids = (selection: unknown, all: readonly string[], what: string) => {
          if (selection === 'all') return 'all' as const;
          if (!Array.isArray(selection)) return invalid(`A stored range has malformed ${what}.`);
          const list: string[] = [];
          for (const item of selection as unknown[]) {
            if (Array.isArray(item)) {
              const first = index(item[0], all.length, what);
              const last = index(item[1], all.length, what);
              if (item.length !== 2 || last < first)
                invalid(`A stored range has malformed ${what}.`);
              for (let position = first; position <= last; position += 1) {
                list.push(all[position] as string);
              }
            } else {
              list.push(all[index(item, all.length, what)] as string);
            }
          }
          return list;
        };
        return withTerm({
          kind: 'range',
          ref: {
            step: target.id,
            rows: ids(encoded[2], target.rowIds, 'rows'),
            columns: ids(encoded[3], target.columnIds, 'columns'),
          },
        });
      }
      case KIND_CODE.constant:
        return withTerm({ kind: 'constant', value: value(encoded[1]) });
      case KIND_CODE.parameter:
        return withTerm({
          kind: 'parameter',
          name: string(encoded[1], 'parameter name'),
          value: value(encoded[2]),
        });
      case KIND_CODE.operation: {
        const operands: unknown = encoded[2];
        if (!Array.isArray(operands)) return invalid(`Stored node ${at} has no operand list.`);
        const options: unknown = encoded[5];
        if (options !== undefined && !isOptions(options)) {
          invalid(`Stored node ${at} has malformed options.`);
        }
        return withTerm({
          kind: 'operation',
          operation: string(encoded[1], 'operation'),
          operands: operands.map((item) => decoded[index(item, at, 'operand')] as DerivationNode),
          ...(options === undefined ? {} : { options }),
          value: value(encoded[3]),
        });
      }
      case KIND_CODE.empty: {
        const reasonKey = optionalString(encoded[1], 'reason');
        return withTerm({
          kind: 'empty',
          value: null,
          ...(reasonKey === undefined ? {} : { reasonKey }),
        });
      }
      default:
        return invalid(`Stored node ${at} has an unknown kind.`);
    }
  };

  for (let at = 0; at < nodeList.length; at += 1) {
    learnCells(at);
    decoded.push(nodeObject(nodeList[at], at));
  }
  learnCells(nodeList.length);
  if (known !== stepList.length) invalid('A stored cell names a node that does not exist.');

  return {
    methodId,
    methodVersion,
    steps: stepList.map(({ step, output, cells, formulaIds }, position): TraceStep => {
      const values = cellValues[position] as TraceValue[][];
      const decodedCells = cells.nodes.map((row, r) =>
        row.map((node, c): TraceCell => {
          const formula = (cells.formulas[r] as (number | null)[])[c];
          return {
            value: (values[r] as TraceValue[])[c] as TraceValue,
            derivation: decoded[node] as ValueNode,
            ...(formula === null || formula === undefined
              ? {}
              : { formula: formulaIds[index(formula, formulaIds.length, 'formula')] }),
          };
        }),
      );
      return { ...step, output: { ...output, cells: decodedCells } } as unknown as TraceStep;
    }),
  };
}

/** Position of the optional term in each node layout. */
const KIND_TERM_POSITION: Readonly<Record<number, number>> = {
  [KIND_CODE.input]: 5,
  [KIND_CODE.ref]: 4,
  [KIND_CODE.range]: 4,
  [KIND_CODE.constant]: 2,
  [KIND_CODE.parameter]: 3,
  [KIND_CODE.operation]: 4,
  [KIND_CODE.empty]: 2,
};

function isOptions(value: unknown): value is OperationOptions {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => ['string', 'number', 'boolean'].includes(typeof item))
  );
}

interface ParsedCells {
  /** Node position of each cell. */
  readonly nodes: number[][];
  /** Formula position of each cell, or `null`. */
  readonly formulas: (number | null)[][];
  /** Stored value of a cell whose value differs from its node's, else `undefined`. */
  readonly values: unknown[][];
  readonly maxNode: number;
}

function parseCells(cells: readonly unknown[], rows: number, columns: number): ParsedCells {
  if (cells.length !== rows) invalid('A stored step has a different number of cell rows.');
  let maxNode = -1;
  const nodes: number[][] = [];
  const formulas: (number | null)[][] = [];
  const values: unknown[][] = [];
  for (const row of cells) {
    if (!Array.isArray(row) || row.length !== columns) {
      invalid('A stored step has a row with a different number of cells.');
    }
    const nodeRow: number[] = [];
    const formulaRow: (number | null)[] = [];
    const valueRow: unknown[] = [];
    for (const cell of row as unknown[]) {
      const list = Array.isArray(cell) ? (cell as unknown[]) : undefined;
      const node: unknown = list === undefined ? cell : list[0];
      if (typeof node !== 'number' || !Number.isInteger(node) || node < 0) {
        invalid('A stored cell does not name its node.');
      }
      const formula: unknown = list?.[1] ?? null;
      if (formula !== null && typeof formula !== 'number') {
        invalid('A stored cell names its formula wrongly.');
      }
      if (node > maxNode) maxNode = node;
      nodeRow.push(node);
      formulaRow.push(formula);
      valueRow.push(list !== undefined && list.length > 2 ? list[2] : undefined);
    }
    nodes.push(nodeRow);
    formulas.push(formulaRow);
    values.push(valueRow);
  }
  return { nodes, formulas, values, maxNode };
}
