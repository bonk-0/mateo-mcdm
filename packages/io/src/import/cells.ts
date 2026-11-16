/**
 * What a single cell looks like to the structure detection, and the parsing of TFNs
 * written in one cell.
 */
import { isMissingPlaceholder } from './keywords';
import { looksNumeric } from './numbers';
import type { TermIndex } from './terms';
import { isTermText } from './terms';
import type { RawCell } from './types';

export type CellKind =
  | 'empty'
  /** A text that stands for "no value": `-`, `N/A`, `yok`... */
  | 'placeholder'
  /** A spreadsheet number. */
  | 'number'
  /** A spreadsheet date: never a valid criterion value. */
  | 'date'
  /** Text that reads as a number in at least one number format. */
  | 'numeric-text'
  /** A TFN written in one cell: `(1; 2; 3)`. */
  | 'tfn-text'
  /** A term of one of the candidate linguistic scales. */
  | 'term'
  | 'text'
  /** An error value, a formula without a cached value, or a boolean. */
  | 'bad';

export function classifyCell(cell: RawCell | null, terms: TermIndex): CellKind {
  if (cell === null) return 'empty';
  switch (cell.type) {
    case 'number':
      return cell.date ? 'date' : 'number';
    case 'text': {
      const text = cell.value.trim();
      if (text === '') return 'empty';
      if (isMissingPlaceholder(text)) return 'placeholder';
      if (looksNumeric(text)) return 'numeric-text';
      if (splitTfnText(text) !== undefined) return 'tfn-text';
      if (isTermText(terms, text)) return 'term';
      return 'text';
    }
    default:
      return 'bad';
  }
}

/** Kinds that hold (or try to hold) a value of a criterion. */
export function isValueKind(kind: CellKind): boolean {
  return kind === 'number' || kind === 'numeric-text' || kind === 'tfn-text' || kind === 'term';
}

/**
 * Splits a TFN written in one cell into the texts of its three components. Accepted:
 * `(1, 2, 3)`, `[0,2; 0,3; 0,5]`, `{1 2 3}`, `(1,5, 2,5, 3,5)` (comma and space between
 * decimal-comma components) and `1; 2; 3` without brackets. Returns `undefined` for
 * anything else; the components are checked as numbers later.
 */
export function splitTfnText(text: string): [string, string, string] | undefined {
  const trimmed = text.trim();
  const wrapped = /^[([{<]\s*(.*?)\s*[)\]}>]$/s.exec(trimmed);
  const inner = wrapped?.[1] ?? (trimmed.includes(';') ? trimmed : undefined);
  if (inner === undefined) return undefined;
  const attempts = inner.includes(';')
    ? [inner.split(';')]
    : [inner.split(/,\s+/), inner.split(','), inner.split(/\s+/)];
  for (const parts of attempts) {
    const components = parts.map((part) => part.trim());
    if (components.length === 3 && components.every((part) => part !== '' && looksNumeric(part))) {
      return components as [string, string, string];
    }
  }
  return undefined;
}
