import type { CellRef, Trace, TraceStep, TraceValue } from '@mateo/engine';
import { findCell, findStep } from '@mateo/engine';
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

/** Keeps a scene light: whole-range flights go first, then all of them. */
function thin(flights: CellFlight[], direct: (flight: CellFlight) => boolean): CellFlight[] {
  if (flights.length <= MAX_FLIGHTS_PER_SCENE) return flights;
  const kept = flights.filter(direct);
  return kept.length <= MAX_FLIGHTS_PER_SCENE ? kept : [];
}

interface StepContext {
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
  const all: CellFlight[] = [];
  const direct = new Set<CellFlight>();
  output.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      const ref = { step: step.id, row: output.rows[r]!.id, column: output.columns[c]!.id };
      const at = fillSpan(r, c, output.rows.length, output.columns.length);
      reveals.push({ ref, value: cell.value, at });
      if (plan.flights === 'none') return;
      all.push(...leadFlights(flightsInto(trace, ref, shown, plan.flights ?? 'all', at, direct)));
    }),
  );
  const flights = thin(all, (flight) => direct.has(flight));
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
export function buildTimeline(trace: Trace, sequence: ExplainSequence): Timeline {
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

  const scenes: Scene[] = [];
  const steps: TimelineStep[] = [];
  for (const step of trace.steps) {
    const plan = sequence.steps[step.id];
    if (plan === undefined) {
      throw new ExplainError(
        'UNPLANNED_STEP',
        `The sequence of "${sequence.methodId}" has no plan for the step "${step.id}".`,
        { step: step.id },
      );
    }
    const context = { trace, step, plan, sources: sourcesOf(trace, step, plan) };
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

/** The scenes of one step, in order. */
export function scenesOfStep(timeline: Timeline, stepId: string): Scene[] {
  return timeline.scenes.filter((scene) => scene.stepId === stepId);
}
