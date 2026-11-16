import { numberSeparators } from '@mateo/i18n';

/** The characters a user types for decimals and thousands. */
export interface NumberSyntax {
  readonly decimal: string;
  readonly group: string;
}

export function syntaxForLocale(locale: string): NumberSyntax {
  return numberSeparators(locale);
}

const SPACES = new RegExp("[\\s\\u00a0\\u202f']", 'gu');

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Parses a number typed or pasted by a person. The decimal and group characters of
 * `syntax` win; when the text only makes sense the other way round (`1,5` for an English
 * reader, `1.5` for a Turkish one) it is read like that, so pasting from a spreadsheet in
 * another locale still works. Returns `undefined` for anything that is not a plain number.
 */
export function parseNumber(text: string, syntax: NumberSyntax): number | undefined {
  let value = text.replace(/−/gu, '-').replace(SPACES, '').replace(/’/gu, '');
  if (value === '') return undefined;
  const group = syntax.group.replace(SPACES, '');
  if (group !== '' && group !== '.' && group !== ',') {
    value = value.split(group).join('');
  }
  const groupPattern = (g: string, d: string) =>
    new RegExp(`^[+-]?\\d{1,3}(?:${escapeRegExp(g)}\\d{3})+(?:${escapeRegExp(d)}\\d+)?$`, 'u');
  const other = syntax.decimal === ',' ? '.' : ',';
  if (groupPattern(other, syntax.decimal).test(value)) {
    value = value.split(other).join('');
  }
  value = value.replace(syntax.decimal, '.');
  if (syntax.decimal !== ',') value = value.replace(',', '.');
  if (syntax.decimal === ',' && value.includes(',')) return undefined;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** The text that edits a number without losing a digit. */
export function formatEditNumber(value: number, syntax: NumberSyntax): string {
  return String(value).replace('.', syntax.decimal);
}

/** A number as shown in a cell: no digit grouping, at most 10 decimals. */
export function formatCellNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 10,
  }).format(value);
}
