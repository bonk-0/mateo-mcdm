/**
 * Delimiter detection for CSV/TSV text. Each candidate splits the first lines of the file
 * with Papa Parse; the delimiter that gives the most consistent number of fields (more
 * than one) wins. A comma inside `1,5` does not fool it, because a decimal-comma file
 * delimited by semicolons splits into a consistent field count only on `;`.
 */
import Papa from 'papaparse';
import type { Delimiter } from './types';
import { DELIMITERS } from './types';

const SAMPLE_LINES = 50;

export interface DelimiterScore {
  readonly delimiter: Delimiter;
  /** The most common field count among non-empty lines. */
  readonly fields: number;
  /** Share of non-empty lines that have exactly `fields` fields (0–1). */
  readonly consistency: number;
}

export type DelimiterStatus = 'detected' | 'ambiguous' | 'single-column' | 'override';

export interface DelimiterDetection {
  readonly delimiter: Delimiter;
  readonly status: DelimiterStatus;
  readonly scores: readonly DelimiterScore[];
}

export function splitRows(text: string, delimiter: Delimiter, preview?: number): string[][] {
  const result = Papa.parse<string[]>(text, {
    delimiter,
    quoteChar: '"',
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    ...(preview === undefined ? {} : { preview }),
  });
  return result.data;
}

function score(text: string, delimiter: Delimiter): DelimiterScore {
  const rows = splitRows(text, delimiter, SAMPLE_LINES).filter((row) =>
    row.some((cell) => cell.trim() !== ''),
  );
  const histogram = new Map<number, number>();
  for (const row of rows) histogram.set(row.length, (histogram.get(row.length) ?? 0) + 1);
  let fields = 1;
  let best = 0;
  for (const [count, lines] of histogram) {
    if (lines > best || (lines === best && count > fields)) {
      fields = count;
      best = lines;
    }
  }
  return { delimiter, fields, consistency: rows.length === 0 ? 0 : best / rows.length };
}

/**
 * Picks the delimiter of a CSV/TSV text. `hint` (from a `.tsv` file name) wins a tie.
 * Two candidates that both split every line consistently into several fields make the
 * result `ambiguous`; the better-scoring one is still proposed and can be overridden.
 */
export function detectDelimiter(text: string, hint?: Delimiter): DelimiterDetection {
  const scores = DELIMITERS.map((delimiter) => score(text, delimiter));
  const usable = scores
    .filter((item) => item.fields > 1)
    .sort(
      (a, b) =>
        b.consistency - a.consistency ||
        Number(b.delimiter === hint) - Number(a.delimiter === hint) ||
        b.fields - a.fields,
    );
  const first = usable[0];
  if (first === undefined) {
    return { delimiter: hint ?? ',', status: 'single-column', scores };
  }
  const second = usable[1];
  const ambiguous =
    second !== undefined &&
    second.consistency === first.consistency &&
    first.consistency === 1 &&
    second.delimiter !== hint &&
    first.delimiter !== hint;
  return { delimiter: first.delimiter, status: ambiguous ? 'ambiguous' : 'detected', scores };
}
