/**
 * Overrides: decisions given by the caller instead of detected. The import wizard sets
 * them when the user changes a decision; an import profile is a saved set of them.
 * Every field is optional and JSON-safe.
 */
import type { CriterionDirection } from '@mateo/engine';
import type { NumberFormatId } from './numbers';
import type { Delimiter, TextEncodingId } from './types';

/**
 * A column, by its header text (robust when columns move between similar files) or by its
 * 0-based index in the sheet.
 */
export type ColumnRef = { readonly header: string } | { readonly column: number };

export interface ImportOverrides {
  /** Sheet name or 0-based index. */
  readonly sheet?: string | number;
  readonly encoding?: TextEncodingId;
  readonly delimiter?: Delimiter;
  readonly numberFormat?: NumberFormatId;
  /**
   * 0-based sheet rows of the header: `[r]`, or `[r, r + 1]` when a row of group labels
   * sits above a row of l/m/u labels. `null`: the file has no header row.
   */
  readonly headerRows?: readonly number[] | null;
  /** The column naming the alternatives. `null`: there is none; names are generated. */
  readonly idColumn?: ColumnRef | null;
  /** Columns that are not criteria. */
  readonly ignoreColumns?: readonly ColumnRef[];
  /** 0-based sheet row of benefit/cost directions. `null`: the file has none. */
  readonly directionRow?: number | null;
  /** Directions by criterion name (matched ignoring case and diacritics). */
  readonly directions?: Readonly<Record<string, CriterionDirection>>;
  /** Id of the linguistic scale for linguistic columns. */
  readonly scaleId?: string;
}
