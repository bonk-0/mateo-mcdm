/**
 * The neutral shape every export goes through: a list of tables. The builders turn
 * project data into tables; the writers turn tables into XLSX, CSV or ZIP.
 */

/** A cell of an exported table. Numbers stay numbers, at full precision. */
export type ExportCell = number | string | boolean | null;

/** A merged range, 0-based and inclusive. */
export interface ExportMerge {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

export interface ExportTable {
  /** Stable id of the table, for example `data` or `step-normalized-matrix`. */
  readonly id: string;
  /** Sheet name in XLSX, file name in a ZIP. Already in the export language. */
  readonly title: string;
  readonly rows: readonly (readonly ExportCell[])[];
  /** Number of leading rows that are headers (bold, frozen). */
  readonly headerRows: number;
  /** Number of leading columns that are row headers (bold). */
  readonly headerColumns: number;
  readonly merges?: readonly ExportMerge[];
}

/** Languages an export can be written in. Independent of the language of the screen. */
export type ExportLanguage = 'en' | 'tr';

export type TranslateValues = Readonly<Record<string, string | number>>;

/** Translates a message key into the export language. Package keys, not app keys. */
export type Translate = (key: string, values?: TranslateValues) => string;

export interface ExportInfo {
  /** ISO 8601 UTC time of the export. Passed in so that builders stay pure. */
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly language: ExportLanguage;
}
