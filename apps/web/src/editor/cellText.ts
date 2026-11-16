import type {
  CellValue,
  LinguisticScale,
  ModelCriterion,
  ScaleTerm,
  TfnValue,
} from '@mateo/project';
import { formatCellNumber, formatEditNumber, parseNumber, type NumberSyntax } from './numbers';

/** Why a piece of text is not a valid value for a criterion. */
export type ParseFailure = 'number' | 'tfn' | 'tfnOrder' | 'term' | 'noScale';

export type ParsedCell =
  | { readonly ok: true; readonly value: CellValue | null }
  | { readonly ok: false; readonly reason: ParseFailure };

/** Name of a term as the user sees it (the app translates scale terms). */
export type TermLabel = (term: ScaleTerm) => string;

export function isOrdered(value: TfnValue): boolean {
  return value.l <= value.m && value.m <= value.u;
}

function tokenOf(text: string): string {
  return text.trim().toLowerCase();
}

export function findScaleTerm(
  scale: LinguisticScale | undefined,
  text: string,
  label?: TermLabel,
): ScaleTerm | undefined {
  if (!scale) return undefined;
  const token = tokenOf(text);
  if (token === '') return undefined;
  return (
    scale.terms.find((term) => tokenOf(term.abbreviation) === token) ??
    scale.terms.find((term) => tokenOf(term.id) === token) ??
    (label ? scale.terms.find((term) => tokenOf(label(term)) === token) : undefined)
  );
}

/** Splits `(1; 3; 5)`, `1/3/5`, `1 3 5` or (in a decimal-point locale) `1, 3, 5`. */
function tripleParts(text: string): string[] | undefined {
  const inner = text
    .trim()
    .replace(/^[([{]\s*/u, '')
    .replace(/\s*[)\]}]$/u, '');
  for (const separator of [/\s*[;/|]\s*/u, /\s+/u, /\s*,\s+/u, /,/u]) {
    const parts = inner.split(separator);
    if (parts.length === 3) return parts;
  }
  return undefined;
}

export function parseTfnText(text: string, syntax: NumberSyntax): TfnValue | undefined {
  const parts = tripleParts(text);
  if (!parts) return undefined;
  const numbers = parts.map((part) => parseNumber(part, syntax));
  const [l, m, u] = numbers;
  if (l === undefined || m === undefined || u === undefined) return undefined;
  return { l, m, u };
}

/**
 * Turns typed or pasted text into the cell value of `criterion`. Empty text empties the
 * cell. Text that is not valid for the criterion is refused, never guessed.
 */
export function parseCellText(
  text: string,
  criterion: ModelCriterion,
  scale: LinguisticScale | undefined,
  syntax: NumberSyntax,
  label?: TermLabel,
): ParsedCell {
  if (text.trim() === '') return { ok: true, value: null };
  if (criterion.numberType === 'crisp') {
    const value = parseNumber(text, syntax);
    return value === undefined
      ? { ok: false, reason: 'number' }
      : { ok: true, value: { kind: 'crisp', value } };
  }
  const tfn = parseTfnText(text, syntax);
  if (tfn) {
    return isOrdered(tfn)
      ? { ok: true, value: { kind: 'tfn', value: tfn } }
      : { ok: false, reason: 'tfnOrder' };
  }
  if (criterion.scaleId !== null) {
    if (!scale) return { ok: false, reason: 'noScale' };
    const term = findScaleTerm(scale, text, label);
    if (term) return { ok: true, value: { kind: 'term', termId: term.id } };
    return { ok: false, reason: 'term' };
  }
  return { ok: false, reason: 'tfn' };
}

/** The text that is copied and edited: terms by abbreviation, numbers at full precision. */
export function cellEditText(
  cell: CellValue | undefined,
  scale: LinguisticScale | undefined,
  syntax: NumberSyntax,
): string {
  if (!cell) return '';
  switch (cell.kind) {
    case 'crisp':
      return formatEditNumber(cell.value, syntax);
    case 'tfn': {
      const parts = [cell.value.l, cell.value.m, cell.value.u].map((n) =>
        formatEditNumber(n, syntax),
      );
      return `(${parts.join(syntax.decimal === ',' ? '; ' : ', ')})`;
    }
    case 'term':
      return scale?.terms.find((term) => term.id === cell.termId)?.abbreviation ?? cell.termId;
  }
}

/** The text shown in a cell. */
export function cellDisplayText(
  cell: CellValue | undefined,
  scale: LinguisticScale | undefined,
  locale: string,
  syntax: NumberSyntax,
): string {
  if (!cell) return '';
  switch (cell.kind) {
    case 'crisp':
      return formatCellNumber(cell.value, locale);
    case 'tfn': {
      const parts = [cell.value.l, cell.value.m, cell.value.u].map((n) =>
        formatCellNumber(n, locale),
      );
      return `(${parts.join(syntax.decimal === ',' ? '; ' : ', ')})`;
    }
    case 'term':
      return scale?.terms.find((term) => term.id === cell.termId)?.abbreviation ?? cell.termId;
  }
}

export type CellIssue =
  | { readonly code: 'tfnOrder'; readonly l: number; readonly m: number; readonly u: number }
  | { readonly code: 'kindMismatch'; readonly expected: 'crisp' | 'tfn' }
  | { readonly code: 'noScale' }
  | { readonly code: 'unknownTerm'; readonly term: string };

/** The first problem of a stored cell, or `undefined` when it is fine. */
export function cellIssue(
  cell: CellValue | undefined,
  criterion: ModelCriterion,
  scale: LinguisticScale | undefined,
): CellIssue | undefined {
  if (!cell) return undefined;
  if (criterion.numberType === 'crisp') {
    return cell.kind === 'crisp' ? undefined : { code: 'kindMismatch', expected: 'crisp' };
  }
  switch (cell.kind) {
    case 'crisp':
      return { code: 'kindMismatch', expected: 'tfn' };
    case 'tfn':
      return isOrdered(cell.value) ? undefined : { code: 'tfnOrder', ...cell.value };
    case 'term':
      if (!scale) return { code: 'noScale' };
      return scale.terms.some((term) => term.id === cell.termId)
        ? undefined
        : { code: 'unknownTerm', term: cell.termId };
  }
}

/** A number that stands for a cell when sorting and filtering. */
export function cellSortKey(
  cell: CellValue | undefined,
  scale: LinguisticScale | undefined,
): number | undefined {
  if (!cell) return undefined;
  switch (cell.kind) {
    case 'crisp':
      return cell.value;
    case 'tfn':
      return (cell.value.l + cell.value.m + cell.value.u) / 3;
    case 'term': {
      const term = scale?.terms.find((item) => item.id === cell.termId);
      return term ? (term.value.l + term.value.m + term.value.u) / 3 : undefined;
    }
  }
}
