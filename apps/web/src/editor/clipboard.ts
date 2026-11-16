/**
 * Reads the text a spreadsheet puts on the clipboard: tab-separated cells, rows ending in a
 * line break, and cells containing tabs, line breaks or quotes wrapped in double quotes.
 */
export function parseTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let atCellStart = true;
  const source = text.replace(/\r\n?/gu, '\n');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i] as string;
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"' && atCellStart) {
      quoted = true;
      atCellStart = false;
    } else if (char === '\t') {
      row.push(cell);
      cell = '';
      atCellStart = true;
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      atCellStart = true;
    } else {
      cell += char;
      atCellStart = false;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** The inverse of `parseTable`, in the form spreadsheets accept. */
export function formatTable(rows: readonly (readonly string[])[]): string {
  const quote = (cell: string) =>
    /["\t\n\r]/u.test(cell) ? `"${cell.replace(/"/gu, '""')}"` : cell;
  return rows.map((row) => row.map(quote).join('\t')).join('\n');
}
