/**
 * The fixture library (`fixtures/files`, written by `fixtures/generate.ts`): every file
 * imports with the expected detected structure, no value is invented, and every missing
 * value is reported.
 */
import type { CriterionDirection } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { FIXTURE_NAMES, fixtureBytes } from '../testing/fixtures';
import { decision, errorKeys, names, warningKeys } from '../testing/helpers';
import type {
  CriterionLayout,
  DecisionStatus,
  ExcludedRowReason,
  IgnoredColumnReason,
} from './decisions';
import { importFile } from './import';
import type { ImportedValue, ImportResult } from './model';
import type { NumberFormatId } from './numbers';
import { parseNumberText } from './numbers';
import { cellAddress } from './text';
import type { Delimiter, RawCell, SourceFormat, TextEncodingId } from './types';
import { readSource } from './read';
import { DEFAULT_IMPORT_SCALES } from './terms';

type Value = number | readonly [number, number, number] | null;

interface Expected {
  readonly format: SourceFormat;
  readonly encoding?: TextEncodingId;
  readonly delimiter?: Delimiter;
  readonly sheet?: string;
  readonly numberFormat: NumberFormatId | null;
  readonly numberFormatStatus?: DecisionStatus;
  readonly header: readonly number[] | null;
  readonly idColumn: number | null;
  readonly directionRow?: number | null;
  readonly alternatives: readonly string[];
  readonly criteria: readonly (readonly [string, CriterionLayout, CriterionDirection | null])[];
  readonly values: readonly (readonly Value[])[];
  readonly errors?: readonly string[];
  readonly warnings?: readonly string[];
  readonly excluded?: readonly (readonly [number, ExcludedRowReason])[];
  readonly ignored?: readonly (readonly [number, IgnoredColumnReason])[];
  readonly scale?: string | null;
}

const missingDirections = (...criteria: string[]): string[] =>
  criteria.map(() => 'import.direction.missing');

const EXPECTED: Readonly<Record<string, Expected>> = {
  '01-en-suppliers.csv': {
    format: 'csv',
    encoding: 'utf-8',
    delimiter: ',',
    numberFormat: 'point',
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['Alpha Ltd', 'Beta Inc', 'Gamma Co', 'Delta LLC'],
    criteria: [
      ['Price (USD)', 'crisp', 'cost'],
      ['Quality score', 'crisp', 'benefit'],
      ['Delivery time (days)', 'crisp', 'cost'],
      ['Warranty (years)', 'crisp', 'benefit'],
    ],
    values: [
      [1250.5, 7.5, 14, 2],
      [980, 6.8, 21, 1],
      [1430.25, 8.9, 10, 3],
      [1105.75, 7.1, 18, 2],
    ],
    excluded: [[1, 'direction']],
  },
  '02-tr-tedarikciler.csv': {
    format: 'csv',
    encoding: 'utf-8',
    delimiter: ';',
    numberFormat: 'comma',
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['Tedarikçi A', 'Tedarikçi B', 'Tedarikçi Ç', 'Tedarikçi Ş'],
    criteria: [
      ['Fiyat (TL)', 'crisp', 'cost'],
      ['Kalite', 'crisp', 'benefit'],
      ['Teslim Süresi (gün)', 'crisp', 'cost'],
      ['Garanti (yıl)', 'crisp', 'benefit'],
    ],
    values: [
      [1250.5, 7.5, 14, 2],
      [980, 6.8, 21, 1],
      [1430.25, 8.9, 10, 3],
      [1105.75, 7.1, 18, 2],
    ],
  },
  '03-tr-windows-1254.csv': {
    format: 'csv',
    encoding: 'windows-1254',
    delimiter: ';',
    numberFormat: 'comma',
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['İstanbul', 'Iğdır', 'Çorum', 'Muğla'],
    criteria: [
      ['Nüfus yoğunluğu', 'crisp', 'cost'],
      ['Ulaşım puanı', 'crisp', 'benefit'],
      ['Arsa maliyeti', 'crisp', 'cost'],
    ],
    values: [
      [2987.5, 9.1, 1250],
      [56.2, 4.3, 180],
      [41.8, 5.7, 220],
      [76.3, 6.2, 640],
    ],
  },
  '04-en-projects.tsv': {
    format: 'tsv',
    encoding: 'utf-8',
    delimiter: '\t',
    numberFormat: 'point',
    header: [0],
    idColumn: 0,
    directionRow: null,
    alternatives: ['P-101', 'P-102', 'P-103', 'P-104'],
    criteria: [
      ['Cost', 'crisp', 'cost'],
      ['NPV', 'crisp', 'benefit'],
      ['Risk', 'crisp', 'cost'],
      ['Strategic fit', 'crisp', 'benefit'],
    ],
    values: [
      [12500, 3420.5, 0.35, 8],
      [9800, 2100, 0.2, 6],
      [15250, 4980.2, 0.55, 9],
      [11000, 2750.8, 0.3, 7],
    ],
  },
  '05-ambiguous-thousands.csv': {
    format: 'csv',
    delimiter: ';',
    numberFormat: null,
    numberFormatStatus: 'ambiguous',
    header: [0],
    idColumn: 0,
    alternatives: ['A1', 'A2', 'A3'],
    criteria: [
      ['Revenue', 'crisp', null],
      ['Cost', 'crisp', null],
    ],
    values: [
      [null, null],
      [null, null],
      [null, null],
    ],
    errors: [
      'import.number-format.ambiguous',
      ...['B2', 'C2', 'B3', 'C3', 'B4', 'C4'].map(
        (cell) => `import.cell.needs-number-format@${cell}`,
      ),
    ],
    warnings: missingDirections('Revenue', 'Cost'),
  },
  '06-tr-resolved-by-evidence.csv': {
    format: 'csv',
    delimiter: ';',
    numberFormat: 'comma',
    header: [0],
    idColumn: 0,
    alternatives: ['Firma 1', 'Firma 2', 'Firma 3'],
    criteria: [
      ['Ciro', 'crisp', null],
      ['Kâr marjı', 'crisp', null],
    ],
    values: [
      [1234, 12.5],
      [2468, 9.75],
      [987, 14],
    ],
    warnings: missingDirections('Ciro', 'Kâr marjı'),
  },
  '07-en-laptops.xlsx': {
    format: 'xlsx',
    sheet: 'Decision matrix',
    numberFormat: null,
    numberFormatStatus: 'not-found',
    header: [0],
    idColumn: 0,
    alternatives: ['Model X', 'Model Y', 'Model Z'],
    criteria: [
      ['Price', 'crisp', 'cost'],
      ['RAM', 'crisp', 'benefit'],
      ['Weight', 'crisp', 'cost'],
      ['Battery life', 'crisp', 'benefit'],
    ],
    values: [
      [1299, 16, 1.35, 12],
      [999, 8, 1.6, 9.5],
      [1599, 32, 1.2, 14],
    ],
  },
  '08-tr-tez-tablosu.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [2],
    idColumn: 1,
    alternatives: ['Gebze', 'Tuzla', 'Dilovası', 'Çerkezköy'],
    criteria: [
      ['Kira (TL/ay)', 'crisp', null],
      ['Alan (m²)', 'crisp', null],
      ['Limana uzaklık (km)', 'crisp', null],
    ],
    values: [
      [185000, 4200, 35],
      [210000, 3800, 12],
      [160000, 5100, 28],
      [120000, 6000, 95],
    ],
    excluded: [
      [0, 'title'],
      [7, 'blank'],
      [8, 'footer'],
    ],
    ignored: [
      [0, 'row-number'],
      [5, 'text'],
    ],
    warnings: ['import.column.text-ignored', ...missingDirections('a', 'b', 'c')],
  },
  '09-tr-agirlik-birim.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 3,
    alternatives: ['Makine 1', 'Makine 2', 'Makine 3'],
    criteria: [
      ['Maliyet', 'crisp', 'cost'],
      ['Kapasite', 'crisp', 'benefit'],
      ['Enerji tüketimi', 'crisp', 'cost'],
      ['Güvenilirlik', 'crisp', 'benefit'],
    ],
    values: [
      [450, 120, 35.5, 0.95],
      [520, 150, 41.2, 0.97],
      [390, 100, 30.8, 0.92],
    ],
    excluded: [
      [1, 'units'],
      [2, 'weights'],
      [3, 'direction'],
      [7, 'aggregate'],
      [8, 'aggregate'],
    ],
    warnings: ['import.row.excluded', 'import.row.excluded'],
  },
  '10-en-marcos-paper.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['A1', 'A2', 'A3', 'A4'],
    criteria: [
      ['C1', 'crisp', 'benefit'],
      ['C2', 'crisp', 'benefit'],
      ['C3', 'crisp', 'cost'],
      ['C4', 'crisp', 'cost'],
      ['C5', 'crisp', 'benefit'],
    ],
    values: [
      [7, 5, 600, 7, 6],
      [6, 3, 750, 9, 4],
      [9, 6, 520, 6, 8],
      [5, 4, 690, 8, 5],
    ],
    excluded: [
      [1, 'direction'],
      [2, 'ideal'],
      [7, 'ideal'],
    ],
    warnings: ['import.row.excluded', 'import.row.excluded'],
  },
  '11-en-tfn-suffix-columns.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['A1', 'A2', 'A3'],
    criteria: [
      ['C1', 'tfn-columns', 'benefit'],
      ['C2', 'tfn-columns', 'cost'],
      ['C3', 'tfn-columns', 'benefit'],
    ],
    values: [
      [
        [5, 7, 9],
        [1, 3, 5],
        [3, 5, 7],
      ],
      [
        [3, 5, 7],
        [3, 5, 7],
        [5, 7, 9],
      ],
      [
        [7, 9, 9],
        [1, 1, 3],
        [1, 3, 5],
      ],
    ],
  },
  '12-tr-tfn-iki-satir-baslik.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0, 1],
    idColumn: 0,
    alternatives: ['Firma A', 'Firma B', 'Firma C'],
    criteria: [
      ['Hizmet kalitesi', 'tfn-columns', null],
      ['Fiyat', 'tfn-columns', 'cost'],
    ],
    values: [
      [
        [0.5, 0.7, 0.9],
        [120, 135, 150],
      ],
      [
        [0.3, 0.5, 0.7],
        [95, 110, 125],
      ],
      [
        [0.7, 0.9, 1],
        [140, 155, 170],
      ],
    ],
    warnings: missingDirections('Hizmet kalitesi'),
  },
  '13-tr-tfn-alt-orta-ust.csv': {
    format: 'csv',
    delimiter: ';',
    numberFormat: 'comma',
    header: [0, 1],
    idColumn: 0,
    directionRow: 2,
    alternatives: ['Firma A', 'Firma B', 'Firma C'],
    criteria: [
      ['Kalite', 'tfn-columns', 'benefit'],
      ['Maliyet', 'tfn-columns', 'cost'],
    ],
    values: [
      [
        [0.5, 0.7, 0.9],
        [120, 135, 150],
      ],
      [
        [0.3, 0.5, 0.7],
        [95, 110, 125],
      ],
      [
        [0.7, 0.9, 1],
        [140, 155, 170],
      ],
    ],
  },
  '14-tr-tfn-hucre-ici.xlsx': {
    format: 'xlsx',
    numberFormat: 'comma',
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['T1', 'T2', 'T3'],
    criteria: [
      ['Esneklik', 'tfn-text', 'benefit'],
      ['Risk', 'tfn-text', 'cost'],
      ['Maliyet', 'tfn-text', 'cost'],
    ],
    values: [
      [
        [0.5, 0.7, 0.9],
        [0.1, 0.2, 0.4],
        [10, 12, 15],
      ],
      [
        [0.3, 0.5, 0.7],
        [0.2, 0.3, 0.5],
        [8, 9.5, 11],
      ],
      [
        [0.7, 0.9, 1],
        [0.4, 0.5, 0.7],
        [12, 14, 16.5],
      ],
    ],
  },
  '15-en-tfn-in-cells.csv': {
    format: 'csv',
    delimiter: ',',
    numberFormat: 'point',
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['Car A', 'Car B', 'Car C'],
    criteria: [
      ['Comfort', 'tfn-text', 'benefit'],
      ['Fuel use', 'tfn-text', 'cost'],
    ],
    values: [
      [
        [3, 5, 7],
        [5.5, 6, 6.8],
      ],
      [
        [5, 7, 9],
        [6.2, 7.1, 8],
      ],
      [
        [1, 3, 5],
        [4.8, 5.2, 5.9],
      ],
    ],
  },
  '16-en-linguistic-fuzzy-marcos.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 1,
    scale: 'fuzzy-marcos',
    alternatives: ['A1', 'A2', 'A3', 'A4'],
    criteria: [
      ['Safety', 'linguistic', 'benefit'],
      ['Comfort', 'linguistic', 'benefit'],
      ['Maintenance', 'linguistic', 'cost'],
    ],
    values: [
      [
        [7, 7, 9],
        [5, 7, 7],
        [3, 3, 5],
      ],
      [
        [5, 7, 7],
        [7, 9, 9],
        [3, 5, 5],
      ],
      [
        [5, 5, 7],
        [3, 5, 5],
        [1, 3, 3],
      ],
      [
        [7, 9, 9],
        [7, 7, 9],
        [1, 1, 3],
      ],
    ],
  },
  '17-tr-dilsel-terimler.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 1,
    scale: 'fuzzy-marcos',
    alternatives: ['ABC Ltd.', 'XYZ A.Ş.', 'KLM Tic.'],
    criteria: [
      ['Kalite', 'linguistic', 'benefit'],
      ['Teslimat', 'linguistic', 'benefit'],
      ['İletişim', 'linguistic', 'benefit'],
    ],
    values: [
      [
        [7, 7, 9],
        [5, 7, 7],
        [3, 5, 5],
      ],
      [
        [5, 7, 7],
        [5, 5, 7],
        [1, 3, 3],
      ],
      [
        [3, 5, 5],
        [7, 7, 9],
        [5, 7, 7],
      ],
    ],
  },
  '18-en-linguistic-ambiguous.csv': {
    format: 'csv',
    delimiter: ',',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    scale: null,
    alternatives: ['Option 1', 'Option 2', 'Option 3'],
    criteria: [
      ['Impact', 'linguistic', null],
      ['Feasibility', 'linguistic', null],
    ],
    values: [
      [null, null],
      [null, null],
      [null, null],
    ],
    errors: [
      'import.scale.ambiguous',
      ...['B2', 'C2', 'B3', 'C3', 'B4', 'C4'].map((cell) => `import.cell.needs-scale@${cell}`),
    ],
    warnings: missingDirections('Impact', 'Feasibility'),
  },
  '19-tr-eksik-ve-hatali.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['A1', 'A2', 'A3', 'A4', 'A5'],
    criteria: [
      ['K1', 'crisp', 'benefit'],
      ['K2', 'crisp', 'cost'],
      ['K3', 'crisp', 'benefit'],
      ['K4', 'crisp', 'benefit'],
    ],
    values: [
      [10, null, 7, 14],
      [null, 5, null, 12],
      [8, null, null, null],
      [null, 6, 9, null],
      [11, 4, 8, 15],
    ],
    errors: [
      'import.cell.missing@C3',
      'import.cell.missing@B4',
      'import.cell.missing@D4',
      'import.cell.formula-error@C5',
      'import.cell.missing@D5',
      'import.cell.formula-without-value@E5',
      'import.cell.invalid-number@B6',
      'import.cell.date@E6',
    ],
  },
  '20-mixed-number-formats.csv': {
    format: 'csv',
    delimiter: ';',
    numberFormat: null,
    numberFormatStatus: 'ambiguous',
    header: [0],
    idColumn: 0,
    alternatives: ['A1', 'A2', 'A3'],
    criteria: [
      ['K1', 'crisp', null],
      ['K2', 'crisp', null],
    ],
    values: [
      [null, null],
      [null, null],
      [null, null],
    ],
    errors: [
      'import.number-format.conflict',
      ...['B2', 'C2', 'B3', 'C3', 'B4', 'C4'].map(
        (cell) => `import.cell.needs-number-format@${cell}`,
      ),
    ],
    warnings: missingDirections('K1', 'K2'),
  },
  '21-multi-sheet.xlsx': {
    format: 'xlsx',
    sheet: 'Veri',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    alternatives: ['T1', 'T2', 'T3'],
    criteria: [
      ['Fiyat', 'crisp', null],
      ['Kalite', 'crisp', null],
      ['Teslimat', 'crisp', null],
    ],
    values: [
      [100, 8, 5],
      [120, 9, 3],
      [90, 6, 7],
    ],
    warnings: missingDirections('Fiyat', 'Kalite', 'Teslimat'),
  },
  '22-no-header.csv': {
    format: 'csv',
    delimiter: ',',
    numberFormat: 'point',
    header: null,
    idColumn: null,
    alternatives: ['A1', 'A2', 'A3', 'A4'],
    criteria: [
      ['A', 'crisp', null],
      ['B', 'crisp', null],
      ['C', 'crisp', null],
    ],
    values: [
      [12, 0.5, 300],
      [15, 0.7, 280],
      [9, 0.4, 350],
      [11, 0.6, 310],
    ],
    warnings: [
      'import.header.not-found',
      'import.criterion.name-missing',
      'import.direction.missing',
      'import.criterion.name-missing',
      'import.direction.missing',
      'import.criterion.name-missing',
      'import.direction.missing',
      'import.alternative.names-generated',
    ],
  },
  '23-en-macro-enabled.xlsm': {
    format: 'xlsm',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    alternatives: ['Site A', 'Site B', 'Site C'],
    criteria: [
      ['Raw cost', 'crisp', null],
      ['Cost with tax', 'crisp', 'cost'],
      ['Score', 'crisp', 'benefit'],
    ],
    values: [
      [100, 120, 7.5],
      [80, 96, 6],
      [120, 144, 8.5],
    ],
    warnings: missingDirections('Raw cost'),
  },
  '24-en-legacy.xls': {
    format: 'xls',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['Ann', 'Ben', 'Cem'],
    criteria: [
      ['Experience (years)', 'crisp', 'benefit'],
      ['Interview score', 'crisp', 'benefit'],
      ['Salary expectation', 'crisp', 'cost'],
    ],
    values: [
      [5, 82, 5200],
      [8, 75, 6100],
      [3, 90, 4800],
    ],
  },
  '25-tr-daginik-basliklar.xlsx': {
    format: 'xlsx',
    numberFormat: null,
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['Ürün 1', 'Ürün 2', 'ürün 1'],
    criteria: [
      ['Teslim Süresi (gün)', 'crisp', 'cost'],
      ['Kalite puanı', 'crisp', 'benefit'],
      ['Kalite puanı', 'crisp', 'benefit'],
      ['Fiyat', 'crisp', 'cost'],
    ],
    values: [
      [5, 7, 8, 100],
      [7, 6, 6, 90],
      [6, 8, 7, 95],
    ],
    errors: ['import.criterion.duplicate', 'import.alternative.duplicate'],
  },
  '26-tr-yuzde-ve-bosluk.csv': {
    format: 'csv',
    delimiter: ';',
    numberFormat: 'comma',
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['AAA', 'BBB', 'CCC'],
    criteria: [
      ['Getiri', 'crisp', 'benefit'],
      ['Volatilite', 'crisp', 'cost'],
      ['Piyasa değeri', 'crisp', 'benefit'],
    ],
    values: [
      [0.125, 18.2, 1250000],
      [-0.034, 22.7, 845500],
      [0.078, 15.1, 2100750],
    ],
    warnings: ['import.cell.percent@B3'],
  },
  '27-en-direction-above-header.csv': {
    format: 'csv',
    delimiter: ',',
    numberFormat: null,
    header: [1],
    idColumn: 0,
    directionRow: 0,
    alternatives: ['R1', 'R2', 'R3'],
    criteria: [
      ['Payload (kg)', 'crisp', 'benefit'],
      ['Cost (k$)', 'crisp', 'cost'],
      ['Repeatability', 'crisp', 'benefit'],
    ],
    values: [
      [60, 95, 8],
      [40, 70, 6],
      [80, 120, 9],
    ],
    excluded: [[0, 'direction']],
  },
  '28-excel-unicode-text.txt': {
    format: 'csv',
    encoding: 'utf-16le',
    delimiter: '\t',
    numberFormat: 'comma',
    header: [0],
    idColumn: 0,
    directionRow: 1,
    alternatives: ['Öneri 1', 'Öneri 2', 'Öneri 3'],
    criteria: [
      ['Fayda', 'crisp', 'benefit'],
      ['Maliyet', 'crisp', 'cost'],
    ],
    values: [
      [4.5, 1200],
      [3.9, 950],
      [4.8, 1400],
    ],
  },
};

function plain(value: ImportedValue | null): Value {
  if (value === null || typeof value === 'number') return value;
  const { l, m, u } = value;
  return [l, m, u];
}

describe('fixture library', () => {
  it('has at least 20 files, each with expectations', () => {
    expect(FIXTURE_NAMES.length).toBeGreaterThanOrEqual(20);
    expect([...FIXTURE_NAMES].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  describe.each(Object.entries(EXPECTED))('%s', (name, expected) => {
    const result = importFile(fixtureBytes(name), { fileName: name });

    it('detects the source format, encoding, delimiter and sheet', () => {
      expect(result.source?.format).toBe(expected.format);
      expect(decision(result, 'format')?.value).toBe(expected.format);
      if (expected.encoding) expect(decision(result, 'encoding')?.value).toBe(expected.encoding);
      if (expected.delimiter) expect(decision(result, 'delimiter')?.value).toBe(expected.delimiter);
      if (expected.sheet) expect(decision(result, 'sheet')?.value.name).toBe(expected.sheet);
    });

    it('detects the number format', () => {
      const found = decision(result, 'number-format');
      expect(found?.value).toBe(expected.numberFormat);
      if (expected.numberFormatStatus) expect(found?.status).toBe(expected.numberFormatStatus);
    });

    it('detects the header, alternatives and criteria', () => {
      expect(decision(result, 'header')?.value?.rows ?? null).toEqual(expected.header);
      expect(decision(result, 'id-column')?.value?.column ?? null).toBe(expected.idColumn);
      if (expected.directionRow !== undefined) {
        expect(decision(result, 'direction-row')?.value?.row ?? null).toBe(expected.directionRow);
      }
      expect(names(result).alternatives).toEqual(expected.alternatives);
      expect(
        result.model?.criteria.map((criterion) => [
          criterion.name.text,
          criterion.layout,
          criterion.direction,
        ]),
      ).toEqual(expected.criteria);
      if (expected.scale !== undefined)
        expect(decision(result, 'scale')?.value).toBe(expected.scale);
    });

    it('reads the expected values', () => {
      const values = result.model?.values.map((row) => row.map(plain));
      expect(values).toHaveLength(expected.values.length);
      values?.forEach((row, i) =>
        row.forEach((value, j) => {
          const want = expected.values[i]?.[j];
          if (typeof value === 'number' && typeof want === 'number')
            expect(value).toBeCloseTo(want, 12);
          else expect(value).toEqual(want);
        }),
      );
    });

    it('reports the expected errors and warnings', () => {
      expect(errorKeys(result)).toEqual(expected.errors ?? []);
      const warnings = warningKeys(result);
      expect(warnings.map((key) => key.split('@')[0])).toEqual(
        (expected.warnings ?? []).map((key) => key.split('@')[0]),
      );
      (expected.warnings ?? []).forEach((key, index) => {
        if (key.includes('@')) expect(warnings[index]).toBe(key);
      });
    });

    it('records excluded rows and ignored columns', () => {
      const excluded = result.decisions.flatMap((item) =>
        item.kind === 'excluded-row' ? [[item.value.row, item.value.reason]] : [],
      );
      const ignored = result.decisions.flatMap((item) =>
        item.kind === 'ignored-column' ? [[item.value.column, item.value.reason]] : [],
      );
      if (expected.excluded) expect(excluded).toEqual(expected.excluded);
      expect(ignored).toEqual(expected.ignored ?? []);
    });
  });
});

/** Reads a raw cell independently of the import engine, with the decided number format. */
function rawNumber(cell: RawCell | null, format: NumberFormatId | null): number | undefined {
  if (cell?.type === 'number' && !cell.date) return cell.value;
  if (cell?.type === 'text') return parseNumberText(cell.value, format ?? 'point')?.value;
  return undefined;
}

function checkNothingInvented(name: string, result: ImportResult): void {
  const source = readSource(fixtureBytes(name), { fileName: name }).source;
  const model = result.model;
  if (source === undefined || model === undefined) throw new Error(`${name} did not import`);
  const sheet = source.sheets.find((item) => item.name === result.source?.sheet?.name);
  if (sheet === undefined) throw new Error(`${name}: sheet not found`);
  const format = decision(result, 'number-format')?.value ?? null;
  const cellOf = (address: string): RawCell | null => {
    const match = /^([A-Z]+)(\d+)$/.exec(address);
    const letters = match?.[1] ?? '';
    const column = [...letters].reduce((n, char) => n * 26 + char.charCodeAt(0) - 64, 0) - 1;
    return sheet.rows[Number(match?.[2]) - 1]?.[column] ?? null;
  };
  const errorsAt = new Set(
    result.validation.errors.map(
      (issue) => `${issue.location?.row?.index},${issue.location?.column?.index}`,
    ),
  );

  model.values.forEach((row, i) =>
    row.forEach((value, j) => {
      const origin = model.origins[i]?.[j];
      expect(origin?.cells.length, `${name} ${i},${j}`).toBeGreaterThan(0);
      if (value === null) {
        // Every missing value is reported at its matrix position.
        expect(errorsAt.has(`${i},${j}`), `${name}: no error for empty cell ${i},${j}`).toBe(true);
        return;
      }
      // Every value comes from non-empty source cells and reads back from them.
      const cells = origin?.cells.map(cellOf) ?? [];
      expect(
        cells.every((cell) => cell !== null),
        `${name} ${origin?.cells.join()}`,
      ).toBe(true);
      const criterion = model.criteria[j];
      if (criterion?.layout === 'crisp') {
        expect(value).toBe(rawNumber(cells[0] ?? null, format));
      } else if (criterion?.layout === 'tfn-columns') {
        expect(plain(value)).toEqual(cells.map((cell) => rawNumber(cell, format)));
      } else if (criterion?.layout === 'linguistic') {
        const scale = DEFAULT_IMPORT_SCALES.find((item) => item.id === criterion.scaleId);
        const term = scale?.terms.find((item) => item.id === origin?.term);
        expect(term?.value).toEqual(value);
      } else {
        expect(origin?.text).toBe((cells[0] as { value: string }).value.trim());
      }
    }),
  );
}

describe('no fixture invents a value', () => {
  it.each(Object.keys(EXPECTED))('%s', (name) => {
    checkNothingInvented(name, importFile(fixtureBytes(name), { fileName: name }));
  });

  it('every source cell inside the data block is either imported or reported', () => {
    for (const name of Object.keys(EXPECTED)) {
      const result = importFile(fixtureBytes(name), { fileName: name });
      const model = result.model;
      if (model === undefined) continue;
      const dataRows = decision(result, 'data-rows')?.value.rows ?? [];
      const columns = result.decisions.flatMap((item) =>
        item.kind === 'criterion' ? item.value.columns : [],
      );
      const imported = new Set(model.origins.flat().flatMap((origin) => origin.cells));
      for (const row of dataRows) {
        for (const column of columns)
          expect(imported.has(cellAddress(row, column)), name).toBe(true);
      }
    }
  });
});
