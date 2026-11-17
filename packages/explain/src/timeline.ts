import type {
  CellRef,
  DerivationNode,
  RangeRef,
  Trace,
  TraceStep,
  TraceValue,
} from '@mateo/engine';
import { expandRange, findCell, findStep, getStep } from '@mateo/engine';
import { cellKey, formulaOfCell, operandRefs } from './cell';
import { ExplainError } from './errors';
import type {
  CellFlight,
  CellReveal,
  ExplainSequence,
  FormulaScene,
  MatrixScene,
  Scene,
  SceneView,
  Span,
  StepPlan,
  Timeline,
  TimelineStep,
  VectorItem,
  VectorScene,
} from './types';

/** More flights than this in one scene are thinned out (see {@link buildTimeline}). */
export const MAX_FLIGHTS_PER_SCENE = 600;

const FORMULA_BEATS = 1.6;
const FORMULA_FLIGHT: Span = { start: 0.25, end: 0.75 };
const FORMULA_REVEAL: Span = { start: 0.6, end: 0.85 };

function defaultView(step: TraceStep): SceneView {
  const { shape } = step.output;
  if (shape === 'matrix') return 'matrix';
  if (shape === 'scalar') return 'value';
  return step.visualization.view === 'ranking' ? 'ranking' : 'bars';
}

function viewOf(step: TraceStep, plan: StepPlan): SceneView {
  const view = plan.view ?? defaultView(step);
  const { shape } = step.output;
  const fits =
    view === 'matrix' ||
    (view === 'value' && shape === 'scalar') ||
    ((view === 'bars' || view === 'ranking') &&
      (shape === 'column-vector' || shape === 'row-vector'));
  if (!fits) {
    throw new ExplainError(
      'INVALID_PLAN',
      `Step "${step.id}" has the shape "${shape}" and cannot be drawn as "${view}".`,
      { step: step.id, shape, view },
    );
  }
  return view;
}

function sourcesOf(trace: Trace, step: TraceStep, plan: StepPlan): string[] {
  const sources =
    plan.sources ?? step.sources.flatMap((source) => (source.kind === 'step' ? [source.step] : []));
  for (const id of sources) {
    const source = findStep(trace, id);
    if (source === undefined || source.index >= step.index) {
      throw new ExplainError(
        'INVALID_PLAN',
        `Step "${step.id}" cannot show "${id}" as a source: it is not an earlier step.`,
        { step: step.id, source: id },
      );
    }
  }
  return [...new Set(sources)];
}

/**
 * When a cell appears while its table is filled: row after row (column after column for a
 * single row), each row slightly staggered from left to right.
 */
function fillSpan(row: number, column: number, rows: number, columns: number): Span {
  const major = rows > 1 ? row / rows : column / Math.max(1, columns);
  const minor = rows > 1 ? column / Math.max(1, columns) : 0;
  const lines = rows > 1 ? rows : columns;
  const start = 0.04 + 0.7 * major + 0.05 * minor;
  const length = Math.min(0.3, Math.max(0.14, 0.9 / Math.max(1, lines)));
  return { start, end: Math.min(0.98, start + length) };
}

function flightsInto(
  trace: Trace,
  target: CellRef,
  sources: ReadonlySet<string>,
  mode: 'all' | 'direct',
  at: Span,
  /** Collects the flights that start at a single cell rather than at a whole range. */
  directOut?: Set<CellFlight>,
): CellFlight[] {
  const cell = findCell(trace, target);
  if (cell === undefined) return [];
  const carried = cell.derivation.kind === 'ref';
  const flights: CellFlight[] = [];
  const seen = new Set<string>();
  for (const operand of operandRefs(trace, cell.derivation)) {
    if (!sources.has(operand.ref.step)) continue;
    if (mode === 'direct' && !operand.direct) continue;
    const key = cellKey(operand.ref);
    if (seen.has(key)) continue;
    const from = findCell(trace, operand.ref);
    if (from === undefined) continue;
    seen.add(key);
    const flight: CellFlight = {
      from: operand.ref,
      to: target,
      value: from.value,
      carried,
      at,
      ...(operand.term === undefined ? {} : { term: operand.term }),
    };
    flights.push(flight);
    if (operand.direct) directOut?.add(flight);
  }
  return flights;
}

/**
 * While a whole table fills, one value per source table flies into each cell: the cell at
 * the same place if there is one, otherwise the cells of the same row, otherwise all of
 * them. The other operands (the ideal value every cell of a column is divided by, say)
 * are shown in the formula scene, where a single cell is explained.
 */
function leadFlights(flights: readonly CellFlight[]): CellFlight[] {
  const bySource = new Map<string, CellFlight[]>();
  for (const flight of flights) {
    const list = bySource.get(flight.from.step);
    if (list === undefined) bySource.set(flight.from.step, [flight]);
    else list.push(flight);
  }
  return [...bySource.values()].flatMap((group) => {
    const sameRow = group.filter((flight) => flight.from.row === flight.to.row);
    const samePlace = sameRow.filter((flight) => flight.from.column === flight.to.column);
    return samePlace.length > 0 ? samePlace : sameRow.length > 0 ? sameRow : group;
  });
}

/** An operand of a derivation as written: a single cell or a whole range, unexpanded. */
type Operand =
  | { readonly kind: 'ref'; readonly ref: CellRef; readonly term: string | undefined }
  | { readonly kind: 'range'; readonly ref: RangeRef; readonly term: string | undefined };

/** The cell and range operands of a derivation, in the order `operandRefs` visits them. */
function operandsOf(derivation: DerivationNode): Operand[] {
  const result: Operand[] = [];
  const visit = (node: DerivationNode, inherited: string | undefined) => {
    const term = node.term ?? inherited;
    if (node.kind === 'ref') result.push({ kind: 'ref', ref: node.ref, term });
    else if (node.kind === 'range') result.push({ kind: 'range', ref: node.ref, term });
    else if (node.kind === 'operation') {
      for (const operand of node.operands) visit(operand, term);
    }
  };
  visit(derivation, undefined);
  return result;
}

const axisCache = new WeakMap<Trace, Map<string, Record<'rows' | 'columns', Set<string>>>>();

/** The row and column ids of a step, as sets; `undefined` for an unknown step. */
function axesOf(trace: Trace, stepId: string): Record<'rows' | 'columns', Set<string>> | undefined {
  let byStep = axisCache.get(trace);
  if (byStep === undefined) {
    byStep = new Map();
    axisCache.set(trace, byStep);
  }
  let axes = byStep.get(stepId);
  if (axes === undefined) {
    const step = findStep(trace, stepId);
    if (step === undefined) return undefined;
    axes = {
      rows: new Set(step.output.rows.map((item) => item.id)),
      columns: new Set(step.output.columns.map((item) => item.id)),
    };
    byStep.set(stepId, axes);
  }
  return axes;
}

/** Whether a row (column) id is on the axis a range selects, as `expandRange` lists it. */
function onAxis(trace: Trace, ref: RangeRef, axis: 'rows' | 'columns', id: string): boolean {
  const selected = ref[axis];
  if (selected !== 'all') return selected.includes(id);
  const axes = axesOf(trace, ref.step);
  if (axes === undefined) getStep(trace, ref.step); // throws, as expandRange does
  return axes![axis].has(id);
}

function covers(trace: Trace, operand: Operand, cell: CellRef): boolean {
  if (operand.ref.step !== cell.step) return false;
  if (operand.kind === 'ref') {
    return operand.ref.row === cell.row && operand.ref.column === cell.column;
  }
  return (
    onAxis(trace, operand.ref, 'rows', cell.row) &&
    onAxis(trace, operand.ref, 'columns', cell.column)
  );
}

/** The existing column ids of a range, in the order `expandRange` lists them. */
function rangeColumns(trace: Trace, ref: RangeRef): string[] {
  const step = getStep(trace, ref.step);
  const columns = axesOf(trace, ref.step)!.columns;
  return ref.columns === 'all'
    ? step.output.columns.map((item) => item.id)
    : ref.columns.filter((id) => columns.has(id));
}

/** Whether a range has a cell that exists in row `row` (any row when `row` is undefined). */
function rangeHasCellIn(trace: Trace, ref: RangeRef, row: string | undefined): boolean {
  const axes = axesOf(trace, ref.step);
  if (axes === undefined) return false;
  const hasRow =
    row === undefined
      ? ref.rows === 'all'
        ? axes.rows.size > 0
        : ref.rows.some((id) => axes.rows.has(id))
      : axes.rows.has(row) && (ref.rows === 'all' || ref.rows.includes(row));
  if (!hasRow) return false;
  return ref.columns === 'all' || ref.columns.some((id) => axes.columns.has(id));
}

/**
 * `flightsInto(trace, target, sources, 'direct', at)` without expanding ranges: a range
 * only matters here for hiding a later single cell with the same term, as in `operandRefs`.
 * (A rank cell reads every score of the ranking as one range.)
 */
function directFlightsInto(
  trace: Trace,
  target: CellRef,
  sources: ReadonlySet<string>,
  at: Span,
  directOut: Set<CellFlight>,
): CellFlight[] {
  const cell = findCell(trace, target);
  if (cell === undefined) return [];
  const carried = cell.derivation.kind === 'ref';
  const operands = operandsOf(cell.derivation);
  const flights: CellFlight[] = [];
  operands.forEach((operand, index) => {
    if (operand.kind !== 'ref' || !sources.has(operand.ref.step)) return;
    const { ref, term } = operand;
    const hidden = operands
      .slice(0, index)
      .some((other) => other.term === term && covers(trace, other, ref));
    if (hidden) return;
    if (
      flights.some(
        (f) => f.from.step === ref.step && f.from.row === ref.row && f.from.column === ref.column,
      )
    ) {
      return;
    }
    const from = findCell(trace, ref);
    if (from === undefined) return;
    const flight: CellFlight = {
      from: ref,
      to: target,
      value: from.value,
      carried,
      at,
      ...(term === undefined ? {} : { term }),
    };
    flights.push(flight);
    directOut.add(flight);
  });
  return flights;
}

/**
 * `leadFlights(flightsInto(trace, target, sources, 'all', at, direct))`, without expanding
 * a range when only one of its rows can fly: a cell of a 500-row column used to list 500
 * flights only to keep the one in its own row. With `onlyDirect`, gives just the flights
 * that start at a single cell, which is all a fill scene past its flight limit keeps.
 */
function leadFlightsAll(
  trace: Trace,
  target: CellRef,
  sources: ReadonlySet<string>,
  at: Span,
  direct: Set<CellFlight> | undefined,
  onlyDirect: boolean,
): CellFlight[] {
  const cell = findCell(trace, target);
  if (cell === undefined) return [];
  const carried = cell.derivation.kind === 'ref';
  const flight = (ref: CellRef, term: string | undefined, isDirect: boolean): CellFlight => {
    const created: CellFlight = {
      from: ref,
      to: target,
      value: findCell(trace, ref)!.value,
      carried,
      at,
      ...(term === undefined ? {} : { term }),
    };
    if (isDirect) direct?.add(created);
    return created;
  };

  // Group the operands by source step, in order of first appearance of a cell that exists,
  // and note whether a group has a cell at the place or in the row of the target.
  interface Group {
    readonly operands: Operand[];
    samePlace: boolean;
    sameRow: boolean;
  }
  const groups = new Map<string, Group>();
  for (const operand of operandsOf(cell.derivation)) {
    const stepId = operand.ref.step;
    if (!sources.has(stepId)) continue;
    const exists =
      operand.kind === 'ref'
        ? findCell(trace, operand.ref) !== undefined
        : rangeHasCellIn(trace, operand.ref, undefined);
    if (!exists) continue;
    let group = groups.get(stepId);
    if (group === undefined) {
      group = { operands: [], samePlace: false, sameRow: false };
      groups.set(stepId, group);
    }
    group.operands.push(operand);
    const place = { step: stepId, row: target.row, column: target.column };
    const inRow =
      operand.kind === 'ref'
        ? operand.ref.row === target.row
        : rangeHasCellIn(trace, operand.ref, target.row);
    if (inRow) {
      group.sameRow = true;
      if (findCell(trace, place) !== undefined && covers(trace, operand, place)) {
        group.samePlace = true;
      }
    }
  }

  const result: CellFlight[] = [];
  for (const [stepId, group] of groups) {
    const { operands } = group;
    // A cell flies once, from the first operand that has it.
    const firstCover = (ref: CellRef, before: number) =>
      operands.slice(0, before).some((other) => covers(trace, other, ref));
    if (group.samePlace) {
      const place = { step: stepId, row: target.row, column: target.column };
      const first = operands.find((operand) => covers(trace, operand, place))!;
      const isDirect = first.kind === 'ref';
      if (isDirect || !onlyDirect) {
        result.push(flight(isDirect ? first.ref : place, first.term, isDirect));
      }
      continue;
    }
    if (group.sameRow) {
      const seen = new Set<string>();
      operands.forEach((operand) => {
        if (operand.kind === 'ref') {
          if (operand.ref.row !== target.row || seen.has(operand.ref.column)) return;
          seen.add(operand.ref.column);
          result.push(flight(operand.ref, operand.term, true));
          return;
        }
        if (!rangeHasCellIn(trace, operand.ref, target.row)) return;
        for (const column of rangeColumns(trace, operand.ref)) {
          if (seen.has(column)) continue;
          seen.add(column);
          if (!onlyDirect) {
            result.push(flight({ step: stepId, row: target.row, column }, operand.term, false));
          }
        }
      });
      continue;
    }
    // No cell of the row: every cell of the group flies.
    operands.forEach((operand, index) => {
      if (operand.kind === 'ref') {
        if (!firstCover(operand.ref, index)) result.push(flight(operand.ref, operand.term, true));
        return;
      }
      if (onlyDirect) return;
      const seen = new Set<string>();
      for (const ref of expandRange(trace, operand.ref)) {
        const key = `${ref.row}\u0000${ref.column}`;
        if (seen.has(key) || findCell(trace, ref) === undefined || firstCover(ref, index)) {
          continue;
        }
        seen.add(key);
        result.push(flight(ref, operand.term, false));
      }
    });
  }
  return result;
}

interface StepContext {
  readonly maxFlights: number;
  readonly trace: Trace;
  readonly step: TraceStep;
  readonly plan: StepPlan;
  readonly sources: readonly string[];
}

function sceneBase({ step, sources }: StepContext) {
  return {
    stepId: step.id,
    stepIndex: step.index,
    nameKey: step.nameKey,
    explanationKey: step.explanationKey,
    ...(step.explanationParams === undefined ? {} : { explanationParams: step.explanationParams }),
    sources,
  };
}

function formulaScenes(context: StepContext): Omit<FormulaScene, 'index'>[] {
  const { trace, step, plan } = context;
  if (plan.formulaScenes === false) return [];
  const shown = new Set(context.sources);
  const scenes: Omit<FormulaScene, 'index'>[] = [];
  for (const formula of step.formulas) {
    // The first cell the formula produced, preferably of an alternative: the anti-ideal
    // and ideal rows make poor examples.
    let example: CellRef | undefined;
    let value: TraceValue | undefined;
    for (const preferRegular of [true, false]) {
      for (const [r, row] of step.output.cells.entries()) {
        if (example !== undefined) break;
        const item = step.output.rows[r]!;
        if (preferRegular && item.kind === 'reference') continue;
        for (const [c, cell] of row.entries()) {
          if (formulaOfCell(step, cell)?.id !== formula.id) continue;
          example = { step: step.id, row: item.id, column: step.output.columns[c]!.id };
          value = cell.value;
          break;
        }
      }
    }
    // A formula no cell used (no cost criterion, say) has nothing to show.
    if (example === undefined || value === undefined) continue;
    const narration = plan.narration?.[formula.id];
    scenes.push({
      ...sceneBase(context),
      id: `${step.id}/${formula.id}`,
      kind: 'formula',
      formulaId: formula.id,
      example,
      reveals: [{ ref: example, value, at: FORMULA_REVEAL }],
      flights:
        plan.flights === 'none'
          ? []
          : flightsInto(trace, example, shown, plan.flights ?? 'all', FORMULA_FLIGHT),
      beats: FORMULA_BEATS,
      ...(narration === undefined ? {} : { narration: { key: narration } }),
    });
  }
  return scenes;
}

function fillScene(context: StepContext): Omit<MatrixScene, 'index'> | Omit<VectorScene, 'index'> {
  const { trace, step, plan } = context;
  const { output } = step;
  const view = viewOf(step, plan);
  const shown = new Set(context.sources);
  const reveals: CellReveal[] = [];
  const mode = plan.flights ?? 'all';
  // A scene keeps all its flights up to MAX_FLIGHTS_PER_SCENE. Past that it keeps only the
  // flights that start at a single cell, and none if those are still too many. Once the
  // limit is passed, only those flights are collected, without expanding ranges.
  const all: CellFlight[] = [];
  const direct = new Set<CellFlight>();
  let kept: CellFlight[] | undefined;
  let overflow = false;
  output.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const ref = { step: step.id, row: output.rows[r]!.id, column: output.columns[c]!.id };
      const at = fillSpan(r, c, output.rows.length, output.columns.length);
      reveals.push({ ref, value: cell.value, at });
      if (mode === 'none' || overflow) return;
      if (kept === undefined) {
        all.push(
          ...(mode === 'all'
            ? leadFlightsAll(trace, ref, shown, at, direct, false)
            : leadFlights(directFlightsInto(trace, ref, shown, at, direct))),
        );
        if (all.length > context.maxFlights) kept = all.filter((f) => direct.has(f));
      } else {
        // Only reached in the `all` mode: in the `direct` mode every flight is direct, so
        // passing the limit means passing it with direct flights too.
        kept.push(...leadFlightsAll(trace, ref, shown, at, undefined, true));
      }
      if (kept !== undefined && kept.length > context.maxFlights) overflow = true;
    }),
  );
  const flights = kept === undefined ? all : overflow ? [] : kept;
  const lines = output.rows.length > 1 ? output.rows.length : output.columns.length;
  const base = {
    ...sceneBase(context),
    id: step.id,
    reveals,
    flights,
    beats: 1 + 0.12 * Math.min(12, lines),
  };
  if (view === 'matrix') {
    return {
      ...base,
      kind: 'matrix',
      view,
      highlightRows: step.visualization.highlightRows ?? [],
      highlightColumns: step.visualization.highlightColumns ?? [],
    };
  }
  const byRow = output.shape !== 'row-vector';
  const axis = byRow ? output.rows : output.columns;
  const items: VectorItem[] = axis.map((item, i) => {
    const r = byRow ? i : 0;
    const c = byRow ? 0 : i;
    return {
      item,
      ref: { step: step.id, row: output.rows[r]!.id, column: output.columns[c]!.id },
      value: output.cells[r]![c]!.value,
    };
  });
  if (view !== 'ranking') return { ...base, kind: 'vector', view, items };
  // Best first by comparing the ranks of the trace; equal ranks keep the trace order.
  const order = items
    .map((entry, position) => ({ entry, position }))
    .sort((a, b) => {
      const x = typeof a.entry.value === 'number' ? a.entry.value : Number.POSITIVE_INFINITY;
      const y = typeof b.entry.value === 'number' ? b.entry.value : Number.POSITIVE_INFINITY;
      return x === y ? a.position - b.position : x < y ? -1 : 1;
    })
    .map(({ entry }) => entry.item.id);
  return { ...base, kind: 'vector', view, items, order };
}

/**
 * Turns the trace of a method run into the timeline its explain sequence describes: for
 * every step one scene per formula that was used, then a scene that fills the output.
 *
 * Nothing is calculated here. Values are copied from the trace, flights follow the
 * derivations the engine recorded, and the timing only depends on where a cell is in its
 * table. Throws {@link ExplainError} when the sequence and the trace do not fit, so a new
 * step of a method can never be silently left unexplained.
 */
export function buildTimeline(
  trace: Trace,
  sequence: ExplainSequence,
  options: { readonly maxFlightsPerScene?: number } = {},
): Timeline {
  checkTimeline(trace, sequence);
  const scenes: Scene[] = [];
  const steps: TimelineStep[] = [];
  for (const step of trace.steps) {
    const plan = sequence.steps[step.id]!;
    const context = {
      trace,
      step,
      plan,
      sources: sourcesOf(trace, step, plan),
      maxFlights: options.maxFlightsPerScene ?? MAX_FLIGHTS_PER_SCENE,
    };
    const firstScene = scenes.length;
    for (const scene of [...formulaScenes(context), fillScene(context)]) {
      scenes.push({ ...scene, index: scenes.length });
    }
    steps.push({
      stepId: step.id,
      stepIndex: step.index,
      nameKey: step.nameKey,
      firstScene,
      sceneCount: scenes.length - firstScene,
    });
  }
  return { methodId: trace.methodId, methodVersion: trace.methodVersion, scenes, steps };
}

/**
 * Throws the {@link ExplainError} that {@link buildTimeline} would throw for this trace and
 * sequence, without building the scenes. Lets a page decide whether a trace can be
 * explained and build the timeline only when it is shown.
 */
export function checkTimeline(trace: Trace, sequence: ExplainSequence): void {
  if (trace.methodId !== sequence.methodId) {
    throw new ExplainError(
      'METHOD_MISMATCH',
      `The sequence of "${sequence.methodId}" cannot explain a trace of "${trace.methodId}".`,
      { sequence: sequence.methodId, trace: trace.methodId },
    );
  }
  for (const [id, plan] of Object.entries(sequence.steps)) {
    if (plan.optional !== true && findStep(trace, id) === undefined) {
      throw new ExplainError('MISSING_STEP', `The trace has no step "${id}".`, { step: id });
    }
  }
  for (const step of trace.steps) {
    const plan = sequence.steps[step.id];
    if (plan === undefined) {
      throw new ExplainError(
        'UNPLANNED_STEP',
        `The sequence of "${sequence.methodId}" has no plan for the step "${step.id}".`,
        { step: step.id },
      );
    }
    sourcesOf(trace, step, plan);
    viewOf(step, plan);
  }
}

/** The scenes of one step, in order. */
export function scenesOfStep(timeline: Timeline, stepId: string): Scene[] {
  return timeline.scenes.filter((scene) => scene.stepId === stepId);
}
