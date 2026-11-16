import type { ExportTable } from './types';

/** Excel limits: 31 characters, none of `\ / ? * [ ] :`, not empty, not quoted by apostrophes. */
export function sheetNameOf(title: string, used: Set<string>): string {
  const cleaned = title
    .replace(/[\\/?*[\]:]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/^'+|'+$/gu, '');
  const base = (cleaned === '' ? 'Sheet' : cleaned).slice(0, 31);
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n += 1) {
    const suffix = ` (${n})`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

function columnWidth(table: ExportTable, column: number): number {
  let longest = 6;
  for (const row of table.rows) {
    const cell = row[column];
    if (cell === null || cell === undefined) continue;
    const length = typeof cell === 'string' ? cell.length : String(cell).length;
    longest = Math.max(longest, Math.min(length, 60));
  }
  return longest + 2;
}

export interface XlsxOptions {
  /** Workbook properties. */
  readonly creator: string;
  /** ISO 8601 time; the workbook's created/modified date. */
  readonly createdAt: string;
  readonly title?: string;
}

/**
 * Writes tables as an XLSX workbook, one sheet per table. Numbers are written as numbers
 * with the General format (full precision), text as text, and nothing is a formula.
 */
export async function writeXlsx(
  tables: readonly ExportTable[],
  options: XlsxOptions,
): Promise<Uint8Array> {
  // Loaded on first use: ExcelJS is large and only an export needs it.
  const { default: ExcelJS } = await import('exceljs');
  const book = new ExcelJS.Workbook();
  book.creator = options.creator;
  book.lastModifiedBy = options.creator;
  const created = new Date(options.createdAt);
  book.created = created;
  book.modified = created;
  if (options.title !== undefined) book.title = options.title;

  const used = new Set<string>();
  for (const table of tables) {
    const sheet = book.addWorksheet(sheetNameOf(table.title, used));
    table.rows.forEach((row, r) => {
      const target = sheet.getRow(r + 1);
      row.forEach((cell, c) => {
        if (cell === null) return;
        target.getCell(c + 1).value = cell;
      });
      target.commit();
    });
    const width = table.rows.reduce((most, row) => Math.max(most, row.length), 0);
    for (let c = 0; c < width; c += 1) sheet.getColumn(c + 1).width = columnWidth(table, c);
    for (let r = 0; r < table.headerRows; r += 1) {
      sheet.getRow(r + 1).font = { bold: true };
      sheet.getRow(r + 1).alignment = { vertical: 'middle', horizontal: 'center' };
    }
    for (let r = table.headerRows; r < table.rows.length; r += 1) {
      for (let c = 0; c < table.headerColumns; c += 1) {
        sheet.getCell(r + 1, c + 1).font = { bold: true };
      }
    }
    for (const merge of table.merges ?? []) {
      sheet.mergeCells(merge.top + 1, merge.left + 1, merge.bottom + 1, merge.right + 1);
    }
    if (table.headerRows > 0 || table.headerColumns > 0) {
      sheet.views = [
        {
          state: 'frozen',
          xSplit: table.headerColumns,
          ySplit: table.headerRows,
          showGridLines: true,
        },
      ];
    }
  }
  const buffer = await book.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
