/**
 * A sheet together with the kind of every cell, plus the small helpers the detection steps
 * share.
 */
import type { CellKind } from './cells';
import { classifyCell, isValueKind } from './cells';
import type { TermIndex } from './terms';
import { cleanLabel } from './text';
import type { RawCell, SourceSheet } from './types';
import { cellAt } from './types';

export interface SheetView {
  readonly sheet: SourceSheet;
  readonly terms: TermIndex;
  readonly height: number;
  readonly width: number;
  kind(row: number, column: number): CellKind;
  cell(row: number, column: number): RawCell | null;
  /** Text of a cell for labels: text as-is, numbers and booleans as written; `''` otherwise. */
  text(row: number, column: number): string;
  /**
   * Like {@link text}, but an empty cell inside a horizontally merged range takes the text
   * of the range. Only used for header labels, never for values.
   */
  label(row: number, column: number): string;
  /** Columns with a non-empty cell in `row`, left to right. */
  filled(row: number): number[];
  isBlank(row: number, columns?: readonly number[]): boolean;
  hasValues(row: number, columns?: readonly number[]): boolean;
}

export function createSheetView(sheet: SourceSheet, terms: TermIndex): SheetView {
  const height = sheet.rows.length;
  const width = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  const kinds: CellKind[][] = sheet.rows.map((row) =>
    Array.from({ length: width }, (_, column) => classifyCell(row[column] ?? null, terms)),
  );
  const kind = (row: number, column: number): CellKind => kinds[row]?.[column] ?? 'empty';
  const text = (row: number, column: number): string => {
    const cell = cellAt(sheet, row, column);
    if (cell === null) return '';
    switch (cell.type) {
      case 'text':
        return cleanLabel(cell.value);
      case 'number':
        return cell.date ? '' : String(cell.value);
      case 'boolean':
        return String(cell.value);
      default:
        return '';
    }
  };
  const allColumns = Array.from({ length: width }, (_, column) => column);
  return {
    sheet,
    terms,
    height,
    width,
    kind,
    cell: (row, column) => cellAt(sheet, row, column),
    text,
    label(row, column) {
      const own = text(row, column);
      if (own !== '') return own;
      const range = sheet.merges.find(
        (merge) =>
          merge.start.row <= row &&
          row <= merge.end.row &&
          merge.start.column <= column &&
          column <= merge.end.column,
      );
      return range === undefined ? '' : text(range.start.row, range.start.column);
    },
    filled: (row) => allColumns.filter((column) => kind(row, column) !== 'empty'),
    isBlank: (row, columns = allColumns) =>
      columns.every((column) => kind(row, column) === 'empty'),
    hasValues: (row, columns = allColumns) =>
      columns.some((column) => isValueKind(kind(row, column))),
  };
}
