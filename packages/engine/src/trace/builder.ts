import { EngineError } from '../errors';
import type { Alternative } from '../model/alternative';
import type { Criterion } from '../model/criterion';
import type { DecisionMatrix } from '../model/matrix';
import type { TextParams } from '../model/text';
import { textKey } from '../model/text';
import type { WeightVector } from '../model/weights';
import { alignWeights } from '../model/weights';
import { formulaProblems } from './formula';
import type { Encoder, Tracked, TrackedRange } from './tracked';
import { encodeCrisp, isTracked } from './tracked';
import type {
  DerivationNode,
  StepRole,
  StepSource,
  Trace,
  TraceAxisItem,
  TraceCell,
  TraceFormula,
  TraceStep,
  TraceTableShape,
  TraceValue,
  ValueNode,
  VisualizationHint,
} from './types';
import { TRACE_FORMAT_VERSION } from './types';

/** What every step records besides its output. */
export interface StepMeta {
  /** Stable id, unique within the trace. */
  readonly id: string;
  /** i18n key of the step name. */
  readonly nameKey: string;
  /** i18n key of the explanation text. */
  readonly explanationKey: string;
  readonly explanationParams?: TextParams;
  readonly formulas?: readonly TraceFormula[];
  /** Default: `matrix`, `bars` or `value`, chosen from the shape of the output. */
  readonly visualization?: VisualizationHint;
  /** Default: `input` for input steps, otherwise `intermediate`. */
  readonly role?: StepRole;
}

/** An axis item with its position, as passed to cell callbacks. */
export interface AxisPosition extends TraceAxisItem {
  readonly index: number;
}

/**
 * What a cell callback returns: the tracked value, optionally with the id of the step
 * formula that produced it (when benefit and cost cells use different formulas, say).
 */
export type CellOutput<T> = Tracked<T> | { readonly tracked: Tracked<T>; readonly formula: string };

/** Selects a row or column by position or by axis item id. */
export type AxisSelector = number | string;

/**
 * The output of a recorded step. Later steps read their operands from it, which is how
 * the derivation of a cell comes to reference the cells it was computed from.
 */
export interface StepHandle<T> {
  readonly id: string;
  readonly shape: TraceTableShape;
  readonly rows: readonly TraceAxisItem[];
  readonly columns: readonly TraceAxisItem[];
  /** One cell as an operand. */
  cell(row: AxisSelector, column: AxisSelector): Tracked<T>;
  /** Item of a vector (by position or id), or the value of a scalar (`at()`). */
  at(item?: AxisSelector): Tracked<T>;
  /** A whole row as the operands of an aggregate. */
  row(row: AxisSelector): TrackedRange<T>;
  /** A whole column as the operands of an aggregate. */
  column(column: AxisSelector): TrackedRange<T>;
  /** Every cell, in row-major order. */
  all(): TrackedRange<T>;
  /** A block. Omitted axes select everything. */
  range(selection: {
    readonly rows?: readonly AxisSelector[];
    readonly columns?: readonly AxisSelector[];
  }): TrackedRange<T>;
  /** The raw values, `values()[row][column]`. */
  values(): T[][];
}

type EncodeOption<T> = [T] extends [number]
  ? { readonly encode?: Encoder<T> }
  : { readonly encode: Encoder<T> };

export type InputStepSpec<T> = StepMeta &
  EncodeOption<T> & {
    /** Name of the method input slot the values come from. */
    readonly input: string;
    readonly rows: readonly TraceAxisItem[];
    readonly columns: readonly TraceAxisItem[];
    readonly values: readonly (readonly T[])[];
  };

export type InputMatrixSpec<T> = StepMeta &
  EncodeOption<T> & {
    /** Default `matrix`. */
    readonly input?: string;
    readonly matrix: DecisionMatrix<T>;
  };

export type InputWeightsSpec<T> = StepMeta &
  EncodeOption<T> & {
    /** Default `weights`. */
    readonly input?: string;
    readonly weights: WeightVector<T>;
    /** Criteria in the column order the method works in. */
    readonly criteria: readonly Criterion[];
    /** Header of the single row. Default: id `w`, label key `trace.axis.weight`. */
    readonly row?: TraceAxisItem;
  };

export interface TableStepSpec<T> extends StepMeta {
  readonly rows: readonly TraceAxisItem[];
  readonly columns: readonly TraceAxisItem[];
  readonly cell: (row: AxisPosition, column: AxisPosition) => CellOutput<T>;
}

export interface ColumnVectorStepSpec<T> extends StepMeta {
  /** One row per item, typically the alternatives. */
  readonly items: readonly TraceAxisItem[];
  /** Header of the single column. Default: id = step id, label = step name key. */
  readonly column?: TraceAxisItem;
  readonly cell: (item: AxisPosition) => CellOutput<T>;
}

export interface RowVectorStepSpec<T> extends StepMeta {
  /** One column per item, typically the criteria. */
  readonly items: readonly TraceAxisItem[];
  /** Header of the single row. Default: id = step id, label = step name key. */
  readonly row?: TraceAxisItem;
  readonly cell: (item: AxisPosition) => CellOutput<T>;
}

export interface ScalarStepSpec<T> extends StepMeta {
  readonly value: CellOutput<T>;
}

/**
 * Records the steps of one method run.
 *
 * ```ts
 * const tb = createTraceBuilder({ methodId: 'my-method', methodVersion: '1.0.0' });
 * const x = tb.inputMatrix({ id: 'initial', nameKey, explanationKey, matrix });
 * const n = tb.table({
 *   id: 'normalized', nameKey, explanationKey, rows: x.rows, columns: x.columns,
 *   cell: (row, column) => crisp.divide(x.cell(row.index, column.index), crisp.max(x.column(column.index))),
 * });
 * return { result, trace: tb.build() };
 * ```
 */
export interface TraceBuilder {
  /** Echoes arbitrary input values into the trace. */
  input<T>(spec: InputStepSpec<T>): StepHandle<T>;
  /** Echoes a decision matrix: rows are alternatives, columns are criteria. */
  inputMatrix<T>(spec: InputMatrixSpec<T>): StepHandle<T>;
  /** Echoes a weight vector as a single row over the criteria. */
  inputWeights<T>(spec: InputWeightsSpec<T>): StepHandle<T>;
  table<T>(spec: TableStepSpec<T>): StepHandle<T>;
  columnVector<T>(spec: ColumnVectorStepSpec<T>): StepHandle<T>;
  rowVector<T>(spec: RowVectorStepSpec<T>): StepHandle<T>;
  scalar<T>(spec: ScalarStepSpec<T>): StepHandle<T>;
  /** The trace recorded so far. */
  build(): Trace;
}

export function alternativeAxis(alternatives: readonly Alternative[]): TraceAxisItem[] {
  return alternatives.map(({ id, name }) => ({ id, label: name, kind: 'alternative' }));
}

export function criterionAxis(criteria: readonly Criterion[]): TraceAxisItem[] {
  return criteria.map(({ id, name }) => ({ id, label: name, kind: 'criterion' }));
}

const DEFAULT_VIEW: Record<TraceTableShape, VisualizationHint['view']> = {
  matrix: 'matrix',
  'column-vector': 'bars',
  'row-vector': 'bars',
  scalar: 'value',
};

class Handle<T> implements StepHandle<T> {
  readonly id: string;
  readonly shape: TraceTableShape;
  readonly rows: readonly TraceAxisItem[];
  readonly columns: readonly TraceAxisItem[];
  readonly #raw: readonly (readonly T[])[];
  readonly #encoded: readonly (readonly TraceValue[])[];
  readonly #rowIndex: ReadonlyMap<string, number>;
  readonly #columnIndex: ReadonlyMap<string, number>;
  /**
   * Whole rows, whole columns and the whole table, built once. Methods read them inside
   * cell callbacks (a column maximum for every cell of the column), so building them anew
   * on every call made a step cost rows × columns × rows.
   */
  readonly #rowRanges = new Map<number, TrackedRange<T>>();
  readonly #columnRanges = new Map<number, TrackedRange<T>>();
  #allRange: TrackedRange<T> | undefined;
  readonly #cells: (Tracked<T> | undefined)[][] = [];

  constructor(
    id: string,
    shape: TraceTableShape,
    rows: readonly TraceAxisItem[],
    columns: readonly TraceAxisItem[],
    raw: readonly (readonly T[])[],
    encoded: readonly (readonly TraceValue[])[],
  ) {
    this.id = id;
    this.shape = shape;
    this.rows = rows;
    this.columns = columns;
    this.#raw = raw;
    this.#encoded = encoded;
    this.#rowIndex = new Map(this.rows.map((item, index) => [item.id, index]));
    this.#columnIndex = new Map(this.columns.map((item, index) => [item.id, index]));
  }

  #resolve(axis: 'row' | 'column', selector: AxisSelector): number {
    const items = axis === 'row' ? this.rows : this.columns;
    const index =
      typeof selector === 'number'
        ? selector
        : (axis === 'row' ? this.#rowIndex : this.#columnIndex).get(selector);
    if (index === undefined || !Number.isInteger(index) || index < 0 || index >= items.length) {
      throw new EngineError(
        'UNKNOWN_REFERENCE',
        `Step "${this.id}" has no ${axis} "${String(selector)}".`,
        { step: this.id, axis, selector },
      );
    }
    return index;
  }

  #tracked(row: number, column: number): Tracked<T> {
    // One operand object per cell, shared by every later cell that reads it. Ranges
    // (a row without one column, say) would otherwise allocate a fresh object per item.
    let cached = this.#cells[row];
    if (cached === undefined) {
      cached = new Array<Tracked<T> | undefined>(this.columns.length);
      this.#cells[row] = cached;
    }
    const hit = cached[column];
    if (hit !== undefined) return hit;
    const created = this.#createTracked(row, column);
    cached[column] = created;
    return created;
  }

  #createTracked(row: number, column: number): Tracked<T> {
    return {
      value: (this.#raw[row] as readonly T[])[column] as T,
      node: {
        kind: 'ref',
        ref: {
          step: this.id,
          row: (this.rows[row] as TraceAxisItem).id,
          column: (this.columns[column] as TraceAxisItem).id,
        },
        value: (this.#encoded[row] as readonly TraceValue[])[column] as TraceValue,
      },
    };
  }

  cell(row: AxisSelector, column: AxisSelector): Tracked<T> {
    return this.#tracked(this.#resolve('row', row), this.#resolve('column', column));
  }

  at(item?: AxisSelector): Tracked<T> {
    if (this.shape === 'scalar' && item === undefined) return this.#tracked(0, 0);
    if (this.shape === 'column-vector' && item !== undefined) return this.cell(item, 0);
    if (this.shape === 'row-vector' && item !== undefined) return this.cell(0, item);
    throw new EngineError(
      'INVALID_ARGUMENT',
      `at() addresses an item of a vector or the value of a scalar; step "${this.id}" is a ${this.shape}. Use cell(row, column).`,
      { step: this.id, shape: this.shape },
    );
  }

  #block(rows: readonly number[] | 'all', columns: readonly number[] | 'all'): TrackedRange<T> {
    const rowList = rows === 'all' ? this.rows.map((_, index) => index) : rows;
    const columnList = columns === 'all' ? this.columns.map((_, index) => index) : columns;
    return {
      items: rowList.flatMap((row) => columnList.map((column) => this.#tracked(row, column))),
      node: {
        kind: 'range',
        ref: {
          step: this.id,
          rows: rows === 'all' ? 'all' : rows.map((row) => (this.rows[row] as TraceAxisItem).id),
          columns:
            columns === 'all'
              ? 'all'
              : columns.map((column) => (this.columns[column] as TraceAxisItem).id),
        },
      },
    };
  }

  row(row: AxisSelector): TrackedRange<T> {
    const index = this.#resolve('row', row);
    let range = this.#rowRanges.get(index);
    if (range === undefined) {
      range = this.#block([index], 'all');
      this.#rowRanges.set(index, range);
    }
    return range;
  }

  column(column: AxisSelector): TrackedRange<T> {
    const index = this.#resolve('column', column);
    let range = this.#columnRanges.get(index);
    if (range === undefined) {
      range = this.#block('all', [index]);
      this.#columnRanges.set(index, range);
    }
    return range;
  }

  all(): TrackedRange<T> {
    this.#allRange ??= this.#block('all', 'all');
    return this.#allRange;
  }

  range(selection: {
    readonly rows?: readonly AxisSelector[];
    readonly columns?: readonly AxisSelector[];
  }): TrackedRange<T> {
    return this.#block(
      selection.rows?.map((row) => this.#resolve('row', row)) ?? 'all',
      selection.columns?.map((column) => this.#resolve('column', column)) ?? 'all',
    );
  }

  values(): T[][] {
    return this.#raw.map((cells) => [...cells]);
  }
}

function fail(stepId: string, message: string, details: Record<string, unknown> = {}): never {
  throw new EngineError('INVALID_TRACE', `Step "${stepId}": ${message}`, {
    step: stepId,
    ...details,
  });
}

function assertUniqueIds(stepId: string, axis: string, items: readonly TraceAxisItem[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new EngineError(
        'DUPLICATE_ID',
        `Step "${stepId}": duplicate ${axis} id "${item.id}".`,
        {
          step: stepId,
          axis,
          id: item.id,
        },
      );
    }
    seen.add(item.id);
  }
}

let recording = true;

/**
 * Runs `fn` with every trace builder created inside it in no-record mode. Steps still
 * compute their values, so the result of a method is the same, but nothing is stored for
 * the trace: no cells, derivations, sources or formula checks, and `build()` returns a
 * trace without steps. This is how a caller that only reads the result (a sensitivity
 * scenario) skips the cost of tracing without any change to the method.
 *
 * Checks that only audit the recorded trace (formula terms, unknown formula ids, terms a
 * formula does not define) are skipped too; they are method bugs that any traced run, and
 * the method's own tests, report.
 */
export function withoutTraceRecording<T>(fn: () => T): T {
  const previous = recording;
  recording = false;
  try {
    return fn();
  } finally {
    recording = previous;
  }
}

export function createTraceBuilder(options: {
  readonly methodId: string;
  readonly methodVersion: string;
}): TraceBuilder {
  const recordsTrace = recording;
  const steps: TraceStep[] = [];
  const stepIds = new Set<string>();

  function record<T>(
    meta: StepMeta,
    shape: TraceTableShape,
    rows: readonly TraceAxisItem[],
    columns: readonly TraceAxisItem[],
    defaultRole: StepRole,
    produce: (row: AxisPosition, column: AxisPosition) => CellOutput<T>,
  ): StepHandle<T> {
    if (meta.id === '') fail(meta.id, 'the step id is empty.');
    if (stepIds.has(meta.id)) {
      throw new EngineError('DUPLICATE_ID', `The trace already has a step "${meta.id}".`, {
        step: meta.id,
      });
    }
    if (rows.length === 0 || columns.length === 0) {
      fail(meta.id, 'a step output needs at least one row and one column.');
    }
    assertUniqueIds(meta.id, 'row', rows);
    assertUniqueIds(meta.id, 'column', columns);

    if (!recordsTrace) return produceUntraced(meta.id, shape, rows, columns, produce);

    const formulas = meta.formulas ?? [];
    const formulaIds = new Set<string>();
    const termNames = new Set<string>();
    for (const formula of formulas) {
      if (formulaIds.has(formula.id)) fail(meta.id, `duplicate formula id "${formula.id}".`);
      formulaIds.add(formula.id);
      const problems = formulaProblems(formula);
      if (problems.length > 0) {
        fail(meta.id, `formula "${formula.id}": ${problems.join('; ')}.`, { formula: formula.id });
      }
      formula.terms.forEach((term) => termNames.add(term.name));
    }

    const sources: StepSource[] = [];
    const sourceKeys = new Set<string>();
    const addSource = (source: StepSource, key: string): void => {
      if (sourceKeys.has(key)) return;
      sourceKeys.add(key);
      sources.push(source);
    };
    // Aggregates such as a column maximum are shared by many cells; visit each node once.
    // A visited node's operands were visited with it, so the walk stops there.
    const visited = new WeakSet<object>();
    const inspect = (root: ValueNode, row: string, column: string): void => {
      const walk = (node: DerivationNode): void => {
        if (visited.has(node)) return;
        visited.add(node);
        if (node.term !== undefined && formulas.length > 0 && !termNames.has(node.term)) {
          fail(
            meta.id,
            `cell (${row}, ${column}) uses the term "${node.term}", which no formula of the step defines.`,
            {
              row,
              column,
              term: node.term,
            },
          );
        }
        if (node.kind === 'ref' || node.kind === 'range') {
          if (!stepIds.has(node.ref.step)) {
            throw new EngineError(
              'UNKNOWN_REFERENCE',
              `Step "${meta.id}": cell (${row}, ${column}) references step "${node.ref.step}", which this trace has not recorded.`,
              { step: meta.id, row, column, referenced: node.ref.step },
            );
          }
          addSource({ kind: 'step', step: node.ref.step }, `step:${node.ref.step}`);
        } else if (node.kind === 'input') {
          addSource({ kind: 'input', input: node.source.input }, `input:${node.source.input}`);
        } else if (node.kind === 'parameter') {
          addSource({ kind: 'parameter', name: node.name }, `parameter:${node.name}`);
        } else if (node.kind === 'operation') {
          for (const operand of node.operands) walk(operand);
        }
      };
      walk(root);
    };

    const raw: T[][] = [];
    const cells: TraceCell[][] = [];
    rows.forEach((rowItem, rowIndex) => {
      const rawRow: T[] = [];
      const cellRow: TraceCell[] = [];
      columns.forEach((columnItem, columnIndex) => {
        let output: CellOutput<T>;
        try {
          output = produce({ ...rowItem, index: rowIndex }, { ...columnItem, index: columnIndex });
        } catch (error) {
          if (error instanceof EngineError && error.code === 'NON_FINITE_VALUE') {
            throw new EngineError(
              error.code,
              `Step "${meta.id}", cell (${rowItem.id}, ${columnItem.id}): ${error.message}`,
              { ...error.details, step: meta.id, row: rowItem.id, column: columnItem.id },
            );
          }
          throw error;
        }
        // Checked at run time as well: a cell callback is where method bugs surface.
        const candidate: unknown = output;
        const wrapped =
          typeof candidate === 'object' && candidate !== null && 'tracked' in candidate
            ? (output as { readonly tracked: Tracked<T>; readonly formula: string })
            : undefined;
        const tracked = wrapped === undefined ? (output as Tracked<T>) : wrapped.tracked;
        const formula = wrapped?.formula;
        if (!isTracked(tracked)) {
          fail(meta.id, `cell (${rowItem.id}, ${columnItem.id}) did not return a tracked value.`);
        }
        if (formula !== undefined && !formulaIds.has(formula)) {
          fail(
            meta.id,
            `cell (${rowItem.id}, ${columnItem.id}) names the unknown formula "${formula}".`,
            {
              formula,
            },
          );
        }
        inspect(tracked.node, rowItem.id, columnItem.id);
        rawRow.push(tracked.value);
        cellRow.push({
          value: tracked.node.value,
          derivation: tracked.node,
          ...(formula === undefined ? {} : { formula }),
        });
      });
      raw.push(rawRow);
      cells.push(cellRow);
    });

    const step: TraceStep = {
      id: meta.id,
      index: steps.length,
      role: meta.role ?? defaultRole,
      nameKey: meta.nameKey,
      explanationKey: meta.explanationKey,
      ...(meta.explanationParams === undefined
        ? {}
        : { explanationParams: meta.explanationParams }),
      formulas,
      sources,
      output: { shape, rows, columns, cells },
      visualization: meta.visualization ?? { view: DEFAULT_VIEW[shape] },
    };
    steps.push(step);
    stepIds.add(step.id);
    return new Handle<T>(
      step.id,
      shape,
      rows,
      columns,
      raw,
      cells.map((cellRow) => cellRow.map((cell) => cell.value)),
    );
  }

  /** The no-record counterpart of the second half of `record`: values only. */
  function produceUntraced<T>(
    id: string,
    shape: TraceTableShape,
    rows: readonly TraceAxisItem[],
    columns: readonly TraceAxisItem[],
    produce: (row: AxisPosition, column: AxisPosition) => CellOutput<T>,
  ): StepHandle<T> {
    const raw: T[][] = [];
    const encoded: TraceValue[][] = [];
    rows.forEach((rowItem, rowIndex) => {
      const rawRow: T[] = [];
      const encodedRow: TraceValue[] = [];
      const row: AxisPosition = { ...rowItem, index: rowIndex };
      columns.forEach((columnItem, columnIndex) => {
        let output: CellOutput<T>;
        try {
          output = produce(row, { ...columnItem, index: columnIndex });
        } catch (error) {
          if (error instanceof EngineError && error.code === 'NON_FINITE_VALUE') {
            throw new EngineError(
              error.code,
              `Step "${id}", cell (${rowItem.id}, ${columnItem.id}): ${error.message}`,
              { ...error.details, step: id, row: rowItem.id, column: columnItem.id },
            );
          }
          throw error;
        }
        const candidate: unknown = output;
        const tracked =
          typeof candidate === 'object' && candidate !== null && 'tracked' in candidate
            ? (output as { readonly tracked: Tracked<T> }).tracked
            : (output as Tracked<T>);
        if (!isTracked(tracked)) {
          fail(id, `cell (${rowItem.id}, ${columnItem.id}) did not return a tracked value.`);
        }
        rawRow.push(tracked.value);
        encodedRow.push(tracked.node.value);
      });
      raw.push(rawRow);
      encoded.push(encodedRow);
    });
    stepIds.add(id);
    return new Handle<T>(id, shape, rows, columns, raw, encoded);
  }

  function input<T>(spec: InputStepSpec<T>, forcedShape?: TraceTableShape): StepHandle<T> {
    const encode = spec.encode ?? encodeCrisp;
    if (spec.values.length !== spec.rows.length) {
      fail(spec.id, 'the number of value rows differs from the number of row headers.');
    }
    const shape: TraceTableShape =
      forcedShape ??
      (spec.rows.length === 1 && spec.columns.length === 1
        ? 'scalar'
        : spec.rows.length === 1
          ? 'row-vector'
          : spec.columns.length === 1
            ? 'column-vector'
            : 'matrix');
    return record<T>(spec, shape, spec.rows, spec.columns, 'input', (row, column) => {
      const cells = spec.values[row.index] as readonly T[];
      if (cells.length !== spec.columns.length) {
        fail(
          spec.id,
          `row "${row.id}" has ${cells.length} values for ${spec.columns.length} columns.`,
        );
      }
      const value = cells[column.index] as T;
      return {
        value,
        node: {
          kind: 'input',
          source: { input: spec.input, row: row.id, column: column.id },
          value: encode(value),
        },
      };
    });
  }

  const single = (meta: StepMeta, item: TraceAxisItem | undefined): TraceAxisItem =>
    item ?? { id: meta.id, label: textKey(meta.nameKey), kind: 'quantity' };

  return {
    input: (spec) => input(spec),
    inputMatrix<T>(spec: InputMatrixSpec<T>): StepHandle<T> {
      const { matrix, input: slot, ...rest } = spec;
      const inputSpec = {
        ...rest,
        input: slot ?? 'matrix',
        rows: alternativeAxis(matrix.alternatives),
        columns: criterionAxis(matrix.criteria),
        values: matrix.values,
      } as InputStepSpec<T>;
      // A decision matrix is a matrix even when it has a single row or column.
      return input<T>(inputSpec, 'matrix');
    },
    inputWeights<T>(spec: InputWeightsSpec<T>): StepHandle<T> {
      const { weights, criteria, row, input: slot, ...rest } = spec;
      const values = alignWeights(
        weights,
        criteria.map((criterion) => criterion.id),
      );
      values.forEach((value, index) => {
        if (value === undefined) {
          fail(spec.id, `no weight for criterion "${(criteria[index] as Criterion).id}".`);
        }
      });
      const inputSpec = {
        ...rest,
        input: slot ?? 'weights',
        rows: [row ?? { id: 'w', label: textKey('trace.axis.weight'), kind: 'quantity' }],
        columns: criterionAxis(criteria),
        values: [values as T[]],
      } as InputStepSpec<T>;
      return input<T>(inputSpec, 'row-vector');
    },
    table: (spec) => record(spec, 'matrix', spec.rows, spec.columns, 'intermediate', spec.cell),
    columnVector: (spec) =>
      record(
        spec,
        'column-vector',
        spec.items,
        [single(spec, spec.column)],
        'intermediate',
        (row) => spec.cell(row),
      ),
    rowVector: (spec) =>
      record(
        spec,
        'row-vector',
        [single(spec, spec.row)],
        spec.items,
        'intermediate',
        (_row, column) => spec.cell(column),
      ),
    scalar: (spec) => {
      const item = single(spec, undefined);
      return record(spec, 'scalar', [item], [item], 'intermediate', () => spec.value);
    },
    build: () => ({
      formatVersion: TRACE_FORMAT_VERSION,
      methodId: options.methodId,
      methodVersion: options.methodVersion,
      steps: [...steps],
    }),
  };
}
