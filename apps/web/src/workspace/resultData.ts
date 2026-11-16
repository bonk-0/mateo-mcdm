import type {
  Trace,
  TraceAxisItem,
  TraceStep,
  TraceTable,
  TraceValue,
  TextRef,
} from '@mateo/engine';

/** The step of a trace with the given id, if the method has it. */
export function findStep(trace: Trace, id: string): TraceStep | undefined {
  return trace.steps.find((step) => step.id === id);
}

/**
 * A single plottable number for a trace value: a number as it is, a fuzzy number as its
 * most likely value `m`. This only selects, it never calculates.
 */
export function plotValue(value: TraceValue): number | null {
  if (typeof value === 'number') return value;
  if (value !== null && typeof value === 'object') {
    const m = value.components['m'];
    if (typeof m === 'number') return m;
  }
  return null;
}

export interface LabelledValue {
  readonly id: string;
  readonly label: TextRef;
  readonly value: number | null;
}

/** The values of a one-dimensional step (row vector or column vector), with their labels. */
export function vectorOf(table: TraceTable): LabelledValue[] {
  if (table.shape === 'row-vector') {
    return table.columns.map((item, c) => ({
      id: item.id,
      label: item.label,
      value: plotValue(table.cells[0]?.[c]?.value ?? null),
    }));
  }
  return table.rows.map((item, r) => ({
    id: item.id,
    label: item.label,
    value: plotValue(table.cells[r]?.[0]?.value ?? null),
  }));
}

/** One column of a step, by the id of the column. */
export function columnOf(table: TraceTable, columnId: string): LabelledValue[] {
  const c = table.columns.findIndex((item) => item.id === columnId);
  if (c < 0) return [];
  return table.rows.map((item, r) => ({
    id: item.id,
    label: item.label,
    value: plotValue(table.cells[r]?.[c]?.value ?? null),
  }));
}

export interface RankingRow {
  readonly alternativeId: string;
  readonly label: TextRef;
  readonly rank: number;
  readonly score: number;
  /** Crisp utility functions f(K⁻) and f(K⁺), when the trace has them. */
  readonly fMinus: number | null;
  readonly fPlus: number | null;
}

interface RankingResultShape {
  readonly ranking: readonly { alternativeId: string; score: number; rank: number }[];
}

export function isRankingResult(result: unknown): result is RankingResultShape {
  return (
    typeof result === 'object' &&
    result !== null &&
    Array.isArray((result as RankingResultShape).ranking)
  );
}

/** Where the crisp utility functions are in the trace of each ranking method. */
const UTILITY_FUNCTION_STEPS = ['defuzzification', 'utility-functions'] as const;

/**
 * The ranking, best first (ties keep the order of the input), joined with the labels and
 * the utility functions of the trace. The numbers come from the engine's result.
 */
export function rankingRows(result: unknown, trace: Trace): RankingRow[] {
  if (!isRankingResult(result)) return [];
  const labels = new Map<string, TextRef>();
  const final = findStep(trace, 'final-utility');
  for (const item of final?.output.rows ?? []) labels.set(item.id, item.label);

  let fMinus = new Map<string, number | null>();
  let fPlus = new Map<string, number | null>();
  for (const id of UTILITY_FUNCTION_STEPS) {
    const step = findStep(trace, id);
    if (!step) continue;
    const minus = columnOf(step.output, 'f-k-minus');
    const plus = columnOf(step.output, 'f-k-plus');
    if (minus.length === 0 || plus.length === 0) continue;
    fMinus = new Map(minus.map((item) => [item.id, item.value]));
    fPlus = new Map(plus.map((item) => [item.id, item.value]));
    break;
  }

  return result.ranking
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.rank - b.entry.rank || a.index - b.index)
    .map(({ entry }) => ({
      alternativeId: entry.alternativeId,
      label: labels.get(entry.alternativeId) ?? { text: entry.alternativeId },
      rank: entry.rank,
      score: entry.score,
      fMinus: fMinus.get(entry.alternativeId) ?? null,
      fPlus: fPlus.get(entry.alternativeId) ?? null,
    }));
}

/** Criterion weights of a run: the result of a weighting method, or the weights a ranking method used. */
export function weightRows(trace: Trace): LabelledValue[] {
  const step = findStep(trace, 'weights');
  return step ? vectorOf(step.output) : [];
}

export interface Heatmap {
  readonly rows: readonly TraceAxisItem[];
  readonly columns: readonly TraceAxisItem[];
  /** `values[r][c]` is the weighted value of alternative `r` on criterion `c`. */
  readonly values: readonly (readonly (number | null)[])[];
}

/**
 * The weighted normalized matrix without the reference rows (anti-ideal, ideal): how much
 * each criterion contributes to each alternative.
 */
export function contributionHeatmap(trace: Trace): Heatmap | null {
  const step = findStep(trace, 'weighted-matrix');
  if (!step) return null;
  const table = step.output;
  const keep = table.rows
    .map((item, r) => ({ item, r }))
    .filter(({ item }) => item.kind !== 'reference');
  return {
    rows: keep.map(({ item }) => item),
    columns: table.columns,
    values: keep.map(({ r }) => table.cells[r]!.map((cell) => plotValue(cell.value))),
  };
}
