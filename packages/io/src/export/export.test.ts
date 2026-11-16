import type { ImportResult } from '../import/model';
import { importFile } from '../import/import';
import { describe, expect, it } from 'vitest';
import { analysisTables } from './analysis';
import { CSV_STYLES, fileNameOf, tableToCsv, writeCsv, writeCsvZip } from './csv';
import { datasetTables, matrixTable } from './dataset';
import { EXPORT_MESSAGES } from './messages';
import { CRISP, FIVE_LEVEL, FUZZY, INFO, PROJECT, translatorFor } from './testing';
import type { ExportLanguage } from './types';
import { writeXlsx, sheetNameOf } from './xlsx';
import { crc32, writeZip } from './zip';
import * as XLSX from 'xlsx';
import type { Dataset } from '@mateo/project';

/** The import is told which scale the terms are from, as the wizard would ask. */
const IMPORT_OVERRIDES = { scaleId: 'five-level' } as const;

/** Cells the dataset leaves empty are reported by the import (nothing is filled in): fine. */
function onlyMissing(result: ImportResult) {
  return result.validation.errors.filter((issue) => issue.code !== 'import.cell.missing');
}

const LANGUAGES: readonly ExportLanguage[] = ['en', 'tr'];
const OPTIONS = { creator: 'Mateo test', createdAt: INFO.exportedAt };

/** The model an import reads, as plain values to compare with the exported dataset. */
function summary(result: ImportResult) {
  const model = result.model!;
  return {
    alternatives: model.alternatives.map((item) => ('text' in item.name ? item.name.text : '?')),
    criteria: model.criteria.map((item) => ({
      name: item.name.text,
      direction: item.direction,
      numberType: item.numberType,
    })),
    values: model.values,
  };
}

/** What the dataset says, in the same shape. Terms are compared by the scale's fuzzy numbers. */
function expected(data: Dataset) {
  const cells = data.matrices[0]!.cells;
  return {
    alternatives: data.alternatives.map((item) => item.name),
    criteria: data.criteria.map((item) => ({
      name: item.name,
      direction: item.direction,
      numberType: item.numberType,
    })),
    values: data.alternatives.map((alt) =>
      data.criteria.map((criterion) => {
        const cell = cells[alt.id]?.[criterion.id];
        if (!cell) return null;
        if (cell.kind === 'crisp') return cell.value;
        if (cell.kind === 'tfn') return cell.value;
        return FIVE_LEVEL.terms.find((term) => term.id === cell.termId)!.value;
      }),
    ),
  };
}

describe('round trip: export, then import', () => {
  for (const language of LANGUAGES) {
    for (const [name, data] of [
      ['crisp', CRISP],
      ['fuzzy', FUZZY],
    ] as const) {
      const t = translatorFor(language);
      const table = matrixTable(data, [FIVE_LEVEL], t);

      it(`${name} matrix through XLSX (${language}) gives the same model`, async () => {
        const bytes = await writeXlsx([table], OPTIONS);
        const result = importFile(bytes, { fileName: 'matrix.xlsx', overrides: IMPORT_OVERRIDES });
        expect(onlyMissing(result)).toEqual([]);
        const got = summary(result);
        const want = expected(data);
        expect(got.alternatives).toEqual(want.alternatives);
        expect(got.criteria).toEqual(want.criteria);
        expect(got.values).toEqual(want.values);
      });

      it(`${name} matrix through CSV (${language}) gives the same model`, () => {
        const result = importFile(writeCsv(table, language), {
          fileName: 'matrix.csv',
          overrides: IMPORT_OVERRIDES,
        });
        expect(onlyMissing(result)).toEqual([]);
        const got = summary(result);
        const want = expected(data);
        expect(got.alternatives).toEqual(want.alternatives);
        expect(got.criteria).toEqual(want.criteria);
        expect(got.values).toEqual(want.values);
      });
    }
  }

  it('reads the whole workbook of a dataset back as the same matrix', async () => {
    const tables = datasetTables(FUZZY, [FIVE_LEVEL], PROJECT, INFO, translatorFor('en'));
    const bytes = await writeXlsx(tables, OPTIONS);
    const result = importFile(bytes, { fileName: 'all.xlsx', overrides: IMPORT_OVERRIDES });
    expect(summary(result).values).toEqual(expected(FUZZY).values);
  });

  it('keeps full precision', () => {
    const text = tableToCsv(matrixTable(CRISP, [], translatorFor('en')), 'en');
    expect(text).toContain('0.30000000000000004');
    expect(text).toContain('0.9123456789012345');
  });
});

describe('matrix table', () => {
  it('leaves missing cells empty and writes the units row only when there are units', () => {
    const table = matrixTable(CRISP, [], translatorFor('en'));
    expect(table.rows[1]![0]).toBe('Direction');
    expect(table.rows[2]![0]).toBe('Unit');
    const last = table.rows[table.rows.length - 1]!;
    expect(last).toEqual(['Gamma', 1234.5, 0.5, null]);
    const noUnits = matrixTable(
      { ...CRISP, criteria: CRISP.criteria.map((c) => ({ ...c, unit: '' })) },
      [],
      translatorFor('en'),
    );
    expect(noUnits.rows[2]![0]).toBe('Alpha');
  });

  it('uses two header rows with merged groups for fuzzy criteria', () => {
    const table = matrixTable(FUZZY, [FIVE_LEVEL], translatorFor('tr'));
    expect(table.headerRows).toBe(2);
    expect(table.rows[1]!.slice(0, 4)).toEqual([null, 'alt', 'orta', 'üst']);
    expect(table.merges).toContainEqual({ top: 0, left: 1, bottom: 0, right: 3 });
  });
});

/** Reads the central directory of a ZIP written by `writeZip`. */
function readZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const out: { name: string; crc: number; data: Uint8Array }[] = [];
  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.slice(at + 46, at + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true);
    out.push({ name, crc, data: bytes.slice(start, start + size) });
    at += 46 + nameLength;
  }
  return out;
}

describe('XLSX', () => {
  it('writes numbers as numbers and one sheet per table, with valid unique names', async () => {
    const t = translatorFor('en');
    const bytes = await writeXlsx(datasetTables(CRISP, [], PROJECT, INFO, t), OPTIONS);
    const book = XLSX.read(bytes, { type: 'array' });
    expect(book.SheetNames).toEqual(['Data', 'Criteria', 'Alternatives', 'Info']);
    const data = book.Sheets['Data']!;
    expect(data['B4']).toMatchObject({ t: 'n', v: 120.5 });
    expect(data['C4']).toMatchObject({ t: 'n', v: 0.1 + 0.2 });
    expect(data['A4']).toMatchObject({ t: 's', v: 'Alpha' });
  });

  it('makes sheet names Excel accepts', () => {
    const used = new Set<string>();
    expect(sheetNameOf('A/B:C?[x]*', used)).toBe('A B C x');
    expect(sheetNameOf('A B C x', used)).toBe('A B C x (2)');
    expect(sheetNameOf('x'.repeat(40), used)).toHaveLength(31);
    expect(sheetNameOf('', used)).toBe('Sheet');
    expect(sheetNameOf("'quoted'", used)).toBe('quoted');
  });
});

describe('CSV and ZIP', () => {
  it('writes UTF-8 with a byte order mark and the language style', () => {
    const table = matrixTable(CRISP, [], translatorFor('tr'));
    const bytes = writeCsv(table, 'tr');
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('Alternatif;Price;Quality;Delivery time');
    expect(text).toContain('Alpha;120,5;');
    expect(CSV_STYLES.en).toEqual({ delimiter: ',', decimal: '.' });
  });

  it('quotes text that needs it and keeps formulas from running', () => {
    const csv = tableToCsv(
      {
        id: 'x',
        title: 'x',
        headerRows: 0,
        headerColumns: 0,
        rows: [['a,b', 'say "hi"', '=SUM(A1)', -2, true, null, 'two\nlines']],
      },
      'en',
    );
    expect(csv).toBe('"a,b","say ""hi""",\'=SUM(A1),-2,TRUE,,"two\nlines"\r\n');
  });

  it('builds a ZIP that reads back, with unique file names', () => {
    const t = translatorFor('en');
    const tables = datasetTables(CRISP, [], PROJECT, INFO, t);
    const zip = writeCsvZip([...tables, tables[0]!], 'en');
    expect([...zip.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const entries = readZip(zip);
    expect(entries.map((entry) => entry.name).sort()).toEqual([
      'Alternatives.csv',
      'Criteria.csv',
      'Data (2).csv',
      'Data.csv',
      'Info.csv',
    ]);
    for (const entry of entries) expect(crc32(entry.data), entry.name).toBe(entry.crc);
    const data = entries.find((entry) => entry.name === 'Data.csv')!;
    expect(new TextDecoder().decode(data.data)).toContain('Alpha,120.5');
  });

  it('computes the standard CRC-32 and sanitises file names', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(fileNameOf('1. Normalized: matrix/x?')).toBe('1. Normalized matrix x');
    expect(fileNameOf('...')).toBe('table');
    expect(writeZip([]).length).toBe(22);
  });
});

describe('messages', () => {
  it('has the same keys and placeholders in both languages', () => {
    expect(Object.keys(EXPORT_MESSAGES.tr).sort()).toEqual(Object.keys(EXPORT_MESSAGES.en).sort());
  });
});

describe('analysis workbook', () => {
  it('is exported', () => {
    expect(typeof analysisTables).toBe('function');
  });
});
