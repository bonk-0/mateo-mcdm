/**
 * Locale-aware parsing of numbers written as text (docs/plan.md §9).
 *
 * Two number formats are recognised:
 *
 * - `point`: decimal point, thousands grouped with commas, spaces or apostrophes
 *   (`1,234.56`, `1 234.56`).
 * - `comma`: decimal comma, thousands grouped with points, spaces or apostrophes
 *   (`1.234,56`, `1 234,56`).
 *
 * A text is parsed under both formats. When only one accepts it, the text is evidence for
 * that format. When both accept it with the same value (`12`, `1 234`), it says nothing
 * about the format. When both accept it with different values (`1,234` is 1234 or 1.234),
 * it is ambiguous: it is never guessed, and is resolved only by unambiguous samples from
 * the same file or by an explicit format.
 */

export type NumberFormatId = 'point' | 'comma';

export const NUMBER_FORMATS: readonly NumberFormatId[] = ['point', 'comma'];

const SPACES = ' \u00a0\u202f\u2009';

export interface ParsedNumber {
  readonly value: number;
  /** The text ended or started with `%`; `value` is already divided by 100. */
  readonly percent: boolean;
}

/** Characters that may group thousands under a format. A file uses one of them throughout. */
function groupSeparators(format: NumberFormatId): string {
  return (format === 'point' ? ',' : '.') + SPACES + "'";
}

function escapeForClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, '\\$&');
}

const PATTERNS = new Map<NumberFormatId, RegExp>(
  NUMBER_FORMATS.map((format) => {
    const decimal = format === 'point' ? '\\.' : ',';
    const group = `[${escapeForClass(groupSeparators(format))}]`;
    // Integer part: plain digits, or digits grouped by threes with one repeated separator.
    const integer = `(?:\\d+|[1-9]\\d{0,2}(?<g>${group})\\d{3}(?:\\k<g>\\d{3})*)`;
    const body = `(?:${integer}(?:${decimal}\\d+)?|${decimal}\\d+)`;
    return [format, new RegExp(`^(?<sign>[+-]?)(?<body>${body})(?<exp>[eE][+-]?\\d+)?$`)];
  }),
);

/**
 * Parses `text` as a number written in `format`. Accepts a leading sign (also the Unicode
 * minus sign), thousands separators, an exponent and a leading or trailing `%`. Returns
 * `undefined` for anything else, including text with letters or two different
 * separators used for grouping.
 */
export function parseNumberText(text: string, format: NumberFormatId): ParsedNumber | undefined {
  let source = text.trim().replace(/\u2212/g, '-');
  let percent = false;
  if (source.endsWith('%')) {
    percent = true;
    source = source.slice(0, -1).trimEnd();
  } else if (source.startsWith('%')) {
    percent = true;
    source = source.slice(1).trimStart();
  }
  const match = PATTERNS.get(format)?.exec(source);
  if (!match?.groups) return undefined;
  const { sign = '', body = '', exp = '' } = match.groups;
  const decimal = format === 'point' ? '.' : ',';
  const groups = new RegExp(`[${escapeForClass(groupSeparators(format))}]`, 'g');
  const plain = body.replace(groups, '').replace(decimal, '.');
  const value = Number(`${sign}${plain}${exp}`);
  if (!Number.isFinite(value)) return undefined;
  return { value: percent ? value / 100 : value + 0, percent };
}

/**
 * What a text says about the number format:
 * `neutral`: both formats read the same value (`12`, `-3`, `1 234`).
 * `point` / `comma`: only that format reads it (`2.5`, `1.234,5`).
 * `ambiguous`: both formats read it, with different values (`1,234`, `1.234`).
 * `invalid`: neither format reads it.
 */
export type NumberTextKind = 'neutral' | NumberFormatId | 'ambiguous' | 'invalid';

export function classifyNumberText(text: string): NumberTextKind {
  const point = parseNumberText(text, 'point');
  const comma = parseNumberText(text, 'comma');
  if (point === undefined && comma === undefined) return 'invalid';
  if (point === undefined) return 'comma';
  if (comma === undefined) return 'point';
  return Object.is(point.value, comma.value) ? 'neutral' : 'ambiguous';
}

/** Quick test for text that is meant as a number in some format (digits, separators, sign). */
export function looksNumeric(text: string): boolean {
  return classifyNumberText(text) !== 'invalid';
}

export type NumberFormatStatus =
  /** Unambiguous samples point to one format. */
  | 'detected'
  /** No sample needs a format: every number reads the same in both. */
  | 'not-needed'
  /** Some samples could be either format and none decides. */
  | 'ambiguous'
  /** Unambiguous samples point to both formats. */
  | 'conflict';

export interface NumberFormatDetection {
  readonly status: NumberFormatStatus;
  /** Set only when `status` is `detected`. */
  readonly format?: NumberFormatId;
  readonly counts: Readonly<Record<'point' | 'comma' | 'ambiguous' | 'neutral', number>>;
  /** Up to three samples of each kind, to show next to the decision. */
  readonly examples: Readonly<Record<'point' | 'comma' | 'ambiguous', readonly string[]>>;
}

/** Detects the number format of a set of text samples (the numeric text cells of a file). */
export function detectNumberFormat(samples: Iterable<string>): NumberFormatDetection {
  const counts = { point: 0, comma: 0, ambiguous: 0, neutral: 0 };
  const examples: Record<'point' | 'comma' | 'ambiguous', string[]> = {
    point: [],
    comma: [],
    ambiguous: [],
  };
  for (const sample of samples) {
    const kind = classifyNumberText(sample);
    if (kind === 'invalid') continue;
    counts[kind] += 1;
    if (kind !== 'neutral') {
      const list = examples[kind];
      const text = sample.trim();
      if (list.length < 3 && !list.includes(text)) list.push(text);
    }
  }
  let status: NumberFormatStatus;
  let format: NumberFormatId | undefined;
  if (counts.point > 0 && counts.comma > 0) status = 'conflict';
  else if (counts.point > 0 || counts.comma > 0) {
    status = 'detected';
    format = counts.point > 0 ? 'point' : 'comma';
  } else status = counts.ambiguous > 0 ? 'ambiguous' : 'not-needed';
  return { status, ...(format === undefined ? {} : { format }), counts, examples };
}

/**
 * Reads a text with a known format. Without a format (none was detected or chosen) only
 * neutral text is read; text that needs a format is reported as `ambiguous` instead of
 * guessed.
 */
export function readNumberText(
  text: string,
  format: NumberFormatId | undefined,
): ParsedNumber | 'ambiguous' | 'invalid' {
  if (format !== undefined) return parseNumberText(text, format) ?? 'invalid';
  const kind = classifyNumberText(text);
  if (kind === 'invalid') return 'invalid';
  if (kind !== 'neutral') return 'ambiguous';
  return parseNumberText(text, 'point') ?? 'invalid';
}
