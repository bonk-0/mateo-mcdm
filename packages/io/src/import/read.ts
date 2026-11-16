/**
 * Readers: bytes of an XLSX, XLSM, XLS, CSV or TSV file → a {@link SourceWorkbook}.
 *
 * Spreadsheets are read with SheetJS, cached values only: formulas are never evaluated,
 * macros are never read or run, and external links are not followed (docs/plan.md §9).
 * CSV/TSV text is decoded (see `encoding.ts`) and split with Papa Parse.
 */
import type { ValidationIssue } from '@mateo/engine';
import { createIssue } from '@mateo/engine';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import type { ImportDecision } from './decisions';
import { decodeText } from './encoding';
import { detectDelimiter } from './delimiter';
import type {
  CellRange,
  Delimiter,
  RawCell,
  SourceFormat,
  SourceSheet,
  SourceWorkbook,
  TextEncodingId,
} from './types';

export interface ReadOptions {
  /** Used only as a hint: `.xlsm` vs `.xlsx`, `.tsv` vs `.csv`. The content decides the rest. */
  readonly fileName?: string;
  readonly encoding?: TextEncodingId;
  readonly delimiter?: Delimiter;
}

export interface ReadResult {
  /** Missing when the file could not be read at all; `issues` then says why. */
  readonly source?: SourceWorkbook;
  readonly decisions: readonly ImportDecision[];
  readonly issues: readonly ValidationIssue[];
}

/** The part of SheetJS's number-format helper this reader uses (untyped in its declarations). */
const SSF = XLSX.SSF as { is_date(format: string): boolean };

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const CFB_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
  return magic.every((byte, index) => bytes[index] === byte);
}

function extensionOf(fileName: string | undefined): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName ?? '');
  return match?.[1]?.toLowerCase() ?? '';
}

/** True for bytes that cannot be text: NUL bytes outside a UTF-16 file. */
function looksBinary(bytes: Uint8Array): boolean {
  if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
    return false;
  }
  const end = Math.min(bytes.length, 4096);
  for (let index = 0; index < end; index += 1) if (bytes[index] === 0) return true;
  return false;
}

/** Reads a file. Never throws: an unreadable file gives issues and no `source`. */
export function readSource(bytes: Uint8Array, options: ReadOptions = {}): ReadResult {
  if (bytes.length === 0) {
    return { decisions: [], issues: [createIssue('error', CODES.fileEmpty)] };
  }
  const extension = extensionOf(options.fileName);
  if (startsWith(bytes, ZIP_MAGIC)) {
    return readSpreadsheet(bytes, extension === 'xlsm' ? 'xlsm' : 'xlsx');
  }
  if (startsWith(bytes, CFB_MAGIC)) return readSpreadsheet(bytes, 'xls');
  if (looksBinary(bytes)) {
    return {
      decisions: [],
      issues: [createIssue('error', CODES.fileUnsupported, { params: { extension } })],
    };
  }
  return readText(bytes, extension === 'tsv' || extension === 'tab' ? 'tsv' : 'csv', options);
}

// --- Spreadsheets -----------------------------------------------------------------------

function readSpreadsheet(bytes: Uint8Array, format: SourceFormat): ReadResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: 'array',
      dense: true,
      // Formulas are read only to tell "no cached value" apart from an empty cell.
      cellFormula: true,
      cellNF: true,
      cellDates: false,
      cellHTML: false,
      cellStyles: false,
      bookVBA: false,
      bookDeps: false,
      WTF: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = /password|encrypt/i.test(message) ? CODES.fileEncrypted : CODES.fileUnreadable;
    return { decisions: [], issues: [createIssue('error', code, { params: { format } })] };
  }
  // A ZIP or CFB container that is not a workbook (a Word file, say) reads as no sheets.
  if (workbook.SheetNames.length === 0) {
    return {
      decisions: [],
      issues: [createIssue('error', CODES.fileUnsupported, { params: { extension: format } })],
    };
  }
  const meta = workbook.Workbook?.Sheets ?? [];
  const sheets = workbook.SheetNames.map((name, index): SourceSheet => {
    const sheet = workbook.Sheets[name];
    return {
      name,
      index,
      hidden: Boolean(meta[index]?.Hidden),
      rows: sheet === undefined ? [] : denseRows(sheet),
      merges: (sheet?.['!merges'] ?? []).map((range): CellRange => ({
        start: { row: range.s.r, column: range.s.c },
        end: { row: range.e.r, column: range.e.c },
      })),
    };
  });
  return {
    source: { format, sheets },
    decisions: [{ kind: 'format', status: 'detected', value: format }],
    issues: [],
  };
}

function denseRows(sheet: XLSX.WorkSheet): (RawCell | null)[][] {
  const data = (sheet['!data'] ?? []) as (XLSX.CellObject[] | undefined)[];
  const rows: (RawCell | null)[][] = [];
  for (let row = 0; row < data.length; row += 1) {
    const cells = data[row] ?? [];
    const out: (RawCell | null)[] = [];
    for (let column = 0; column < cells.length; column += 1) {
      out.push(rawCell(cells[column]));
    }
    rows.push(out);
  }
  return rows;
}

function rawCell(cell: XLSX.CellObject | undefined): RawCell | null {
  if (cell === undefined) return null;
  const formula = typeof cell.f === 'string' ? cell.f : undefined;
  if (cell.v === undefined || cell.v === null) {
    // The type of a formula cell without a cached value is not meaningful.
    return formula === undefined ? null : { type: 'formula', formula };
  }
  switch (cell.t) {
    case 'n': {
      const value = cell.v as number;
      const date = typeof cell.z === 'string' && SSF.is_date(cell.z);
      return date ? { type: 'number', value, date: true } : { type: 'number', value };
    }
    case 'd':
      return { type: 'number', value: Number.NaN, date: true };
    case 'b':
      return { type: 'boolean', value: Boolean(cell.v) };
    case 'e':
      return { type: 'error', value: cell.w ?? errorText(cell.v) };
    case 's': {
      const value = String(cell.v);
      return value.trim() === '' ? null : { type: 'text', value };
    }
    default:
      return null;
  }
}

const ERROR_TEXT: Readonly<Record<number, string>> = {
  0x00: '#NULL!',
  0x07: '#DIV/0!',
  0x0f: '#VALUE!',
  0x17: '#REF!',
  0x1d: '#NAME?',
  0x24: '#NUM!',
  0x2a: '#N/A',
  0x2b: '#GETTING_DATA',
};

function errorText(value: unknown): string {
  return typeof value === 'number' ? (ERROR_TEXT[value] ?? '#ERROR') : String(value);
}

// --- Text files ----------------------------------------------------------------------

function readText(bytes: Uint8Array, format: 'csv' | 'tsv', options: ReadOptions): ReadResult {
  const decisions: ImportDecision[] = [{ kind: 'format', status: 'detected', value: format }];
  const issues: ValidationIssue[] = [];

  const decoded = decodeText(bytes, options.encoding);
  decisions.push({
    kind: 'encoding',
    status: decoded.status === 'override' ? 'override' : 'detected',
    value: decoded.encoding,
    evidence: decoded.status,
  });
  if (decoded.status === 'fallback') {
    issues.push(
      createIssue('warning', CODES.encodingUncertain, { params: { encoding: 'windows-1254' } }),
    );
  }
  if (decoded.replacements > 0) {
    issues.push(
      createIssue('warning', CODES.encodingReplacement, {
        params: { count: decoded.replacements, encoding: decoded.encoding },
      }),
    );
  }

  const text = decoded.text.replace(/^\ufeff/, '');
  let delimiter: Delimiter;
  if (options.delimiter !== undefined) {
    delimiter = options.delimiter;
    decisions.push({ kind: 'delimiter', status: 'override', value: delimiter });
  } else {
    const detection = detectDelimiter(text, format === 'tsv' ? '\t' : undefined);
    delimiter = detection.delimiter;
    decisions.push({
      kind: 'delimiter',
      status: detection.status === 'ambiguous' ? 'ambiguous' : 'detected',
      value: delimiter,
      candidates: detection.scores.filter((item) => item.fields > 1).map((item) => item.delimiter),
    });
    if (detection.status === 'ambiguous') {
      issues.push(
        createIssue('warning', CODES.delimiterAmbiguous, {
          params: { delimiter: delimiterName(delimiter) },
        }),
      );
    }
  }

  const parsed = splitRowsWithErrors(text, delimiter);
  for (const row of parsed.malformedRows) {
    issues.push(createIssue('warning', CODES.csvMalformedRow, { params: { row: row + 1 } }));
  }
  const rows = parsed.rows.map((cells) =>
    cells.map((cell): RawCell | null =>
      cell.trim() === '' ? null : { type: 'text', value: cell },
    ),
  );
  // Papa Parse returns one empty row for the final line break; drop trailing empty rows.
  while (rows.length > 0 && rows[rows.length - 1]?.every((cell) => cell === null)) rows.pop();
  return {
    source: {
      format,
      sheets: [{ name: format.toUpperCase(), index: 0, hidden: false, rows, merges: [] }],
      encoding: decoded.encoding,
      delimiter,
    },
    decisions,
    issues,
  };
}

function splitRowsWithErrors(
  text: string,
  delimiter: Delimiter,
): { rows: string[][]; malformedRows: number[] } {
  const result = Papa.parse<string[]>(text, {
    delimiter,
    quoteChar: '"',
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  const malformedRows = [
    ...new Set(
      result.errors
        .filter((error) => error.type === 'Quotes' && typeof error.row === 'number')
        .map((error) => error.row as number),
    ),
  ];
  return { rows: result.data, malformedRows };
}

export function delimiterName(delimiter: Delimiter): string {
  return delimiter === '\t' ? 'tab' : delimiter === ';' ? 'semicolon' : 'comma';
}
