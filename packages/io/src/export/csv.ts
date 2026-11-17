import type { ExportCell, ExportLanguage, ExportTable } from './types';
import { encodeUtf8, writeZip } from './zip';

/**
 * How a CSV file is written. English: comma delimiter and decimal point. Turkish:
 * semicolon delimiter and decimal comma, which is what Excel with Turkish regional
 * settings opens directly. Both are read back by the import engine.
 */
export interface CsvStyle {
  readonly delimiter: ',' | ';';
  readonly decimal: '.' | ',';
}

export const CSV_STYLES: Readonly<Record<ExportLanguage, CsvStyle>> = {
  en: { delimiter: ',', decimal: '.' },
  tr: { delimiter: ';', decimal: ',' },
};

const BYTE_ORDER_MARK = '﻿';

function cellText(cell: ExportCell, style: CsvStyle): string {
  if (cell === null) return '';
  if (typeof cell === 'number') {
    // `String` gives the shortest text that reads back as the same number: full precision.
    const text = String(cell);
    return style.decimal === ',' ? text.replace('.', ',') : text;
  }
  if (typeof cell === 'boolean') return cell ? 'TRUE' : 'FALSE';
  return cell;
}

function quote(text: string, style: CsvStyle): string {
  // A text that starts like a formula would run in a spreadsheet: keep it text.
  const safe = /^[=+@\t\r]/u.test(text) || /^-[^\d.,]/u.test(text) ? `'${text}` : text;
  return /["\r\n]/u.test(safe) || safe.includes(style.delimiter)
    ? `"${safe.replaceAll('"', '""')}"`
    : safe;
}

/** The text of one table as CSV (without byte order mark). */
export function tableToCsv(table: ExportTable, language: ExportLanguage): string {
  const style = CSV_STYLES[language];
  return table.rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cellText(cell, style);
          // Numbers and booleans are never quoted; text is quoted when it has to be.
          return typeof cell === 'string' ? quote(text, style) : text;
        })
        .join(style.delimiter),
    )
    .join('\r\n')
    .concat('\r\n');
}

/** One table as a UTF-8 CSV file with a byte order mark, so that Excel reads the letters right. */
export function writeCsv(table: ExportTable, language: ExportLanguage): Uint8Array {
  return encodeUtf8(BYTE_ORDER_MARK + tableToCsv(table, language));
}

// eslint-disable-next-line no-control-regex -- control characters are exactly what a file name must not have
const FORBIDDEN_FILE_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/gu;

/** A file name made from a table title: no path or reserved characters. */
export function fileNameOf(title: string): string {
  const cleaned = title.replace(FORBIDDEN_FILE_CHARACTERS, ' ').replace(/\s+/gu, ' ').trim();
  return (cleaned === '' ? 'table' : cleaned).slice(0, 80).replace(/[. ]+$/u, '') || 'table';
}

/** Several tables as a ZIP of CSV files, one per table, with unique names. */
export function writeCsvZip(tables: readonly ExportTable[], language: ExportLanguage): Uint8Array {
  const used = new Set<string>();
  return writeZip(
    tables.map((table) => {
      const base = fileNameOf(table.title);
      let name = `${base}.csv`;
      for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base} (${n}).csv`;
      used.add(name.toLowerCase());
      return { name, data: writeCsv(table, language) };
    }),
  );
}
