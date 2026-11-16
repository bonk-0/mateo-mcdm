/**
 * The source side of an import: what the readers produce before any structure is known.
 */

/** File formats the import engine reads. */
export type SourceFormat = 'xlsx' | 'xlsm' | 'xls' | 'csv' | 'tsv';

export const SOURCE_FORMATS: readonly SourceFormat[] = ['xlsx', 'xlsm', 'xls', 'csv', 'tsv'];

/** Text encodings of CSV/TSV files. */
export type TextEncodingId = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1254';

export const TEXT_ENCODINGS: readonly TextEncodingId[] = [
  'utf-8',
  'utf-16le',
  'utf-16be',
  'windows-1254',
];

/** Field delimiters of CSV/TSV files. */
export type Delimiter = ',' | ';' | '\t';

export const DELIMITERS: readonly Delimiter[] = [',', ';', '\t'];

/**
 * One cell as the file stores it. Spreadsheet cells keep their stored type; every CSV cell
 * is text. Formulas are never evaluated: a formula cell is its cached value, or
 * `formula` when the file has no cached value for it.
 */
export type RawCell =
  | { readonly type: 'number'; readonly value: number; readonly date?: true }
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'boolean'; readonly value: boolean }
  /** An error value such as `#DIV/0!` or `#N/A`. */
  | { readonly type: 'error'; readonly value: string }
  /** A formula without a cached value. */
  | { readonly type: 'formula'; readonly formula: string };

/** 0-based position of a cell in a sheet. */
export interface CellPosition {
  readonly row: number;
  readonly column: number;
}

export interface CellRange {
  readonly start: CellPosition;
  readonly end: CellPosition;
}

export interface SourceSheet {
  readonly name: string;
  readonly index: number;
  readonly hidden: boolean;
  /** Row-major grid starting at A1. Empty cells are `null`; rows may differ in length. */
  readonly rows: readonly (readonly (RawCell | null)[])[];
  /** Merged ranges. Only the top-left cell of a range holds a value. */
  readonly merges: readonly CellRange[];
}

export interface SourceWorkbook {
  readonly format: SourceFormat;
  readonly sheets: readonly SourceSheet[];
  /** Text files only. */
  readonly encoding?: TextEncodingId;
  /** Text files only. */
  readonly delimiter?: Delimiter;
}

/** The cell at a position, `null` when empty or outside the grid. */
export function cellAt(sheet: SourceSheet, row: number, column: number): RawCell | null {
  return sheet.rows[row]?.[column] ?? null;
}
