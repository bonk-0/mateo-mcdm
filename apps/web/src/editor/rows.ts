import type {
  CellValue,
  Dataset,
  LinguisticScale,
  ModelAlternative,
  ModelCriterion,
} from '@mateo/project';
import { cellIssue } from './cellText';

/** One grid row: an alternative with its cells. */
export interface GridRow {
  readonly id: string;
  readonly alternative: ModelAlternative;
  readonly cells: Readonly<Record<string, CellValue>>;
  /** Number of cells with a problem. */
  readonly issues: number;
}

const NO_CELLS: Readonly<Record<string, CellValue>> = Object.freeze({});

/** Keeps row objects stable across edits, so the grid only repaints rows that changed. */
export class RowCache {
  private rows = new Map<string, GridRow>();
  private criteria: readonly ModelCriterion[] | null = null;
  private scales: readonly LinguisticScale[] | null = null;

  build(
    dataset: Dataset,
    cells: Readonly<Record<string, Readonly<Record<string, CellValue>>>>,
    scales: readonly LinguisticScale[],
  ): readonly GridRow[] {
    const reuse = this.criteria === dataset.criteria && this.scales === scales;
    const next = new Map<string, GridRow>();
    const list = dataset.alternatives.map((alternative) => {
      const rowCells = Object.hasOwn(cells, alternative.id)
        ? (cells[alternative.id] as Readonly<Record<string, CellValue>>)
        : NO_CELLS;
      const previous = this.rows.get(alternative.id);
      const row =
        reuse && previous && previous.alternative === alternative && previous.cells === rowCells
          ? previous
          : {
              id: alternative.id,
              alternative,
              cells: rowCells,
              issues: countIssues(rowCells, dataset.criteria, scales),
            };
      next.set(alternative.id, row);
      return row;
    });
    this.rows = next;
    this.criteria = dataset.criteria;
    this.scales = scales;
    return list;
  }
}

export function countIssues(
  cells: Readonly<Record<string, CellValue>>,
  criteria: readonly ModelCriterion[],
  scales: readonly LinguisticScale[],
): number {
  let count = 0;
  for (const criterion of criteria) {
    const cell = Object.hasOwn(cells, criterion.id) ? cells[criterion.id] : undefined;
    if (!cell) continue;
    const scale =
      criterion.scaleId === null ? undefined : scales.find((item) => item.id === criterion.scaleId);
    if (cellIssue(cell, criterion, scale)) count += 1;
  }
  return count;
}

export interface DatasetSummary {
  readonly invalidCells: number;
  readonly emptyCells: number;
  readonly duplicateCodes: number;
}

/** Counts for the validation badge in the toolbar. */
export function summarize(rows: readonly GridRow[], dataset: Dataset): DatasetSummary {
  let invalidCells = 0;
  let filled = 0;
  for (const row of rows) {
    invalidCells += row.issues;
    filled += Object.keys(row.cells).length;
  }
  const duplicates = (codes: readonly string[]) => {
    const seen = new Set<string>();
    let count = 0;
    for (const code of codes) {
      const key = code.trim().toLowerCase();
      if (seen.has(key)) count += 1;
      seen.add(key);
    }
    return count;
  };
  return {
    invalidCells,
    emptyCells: dataset.alternatives.length * dataset.criteria.length - filled,
    duplicateCodes:
      duplicates(dataset.alternatives.map((item) => item.code)) +
      duplicates(dataset.criteria.map((item) => item.code)),
  };
}
