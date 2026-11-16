/**
 * Writes the import fixture library (`files/`). The files imitate what researchers and
 * analysts actually bring: Turkish and English locales, title rows and notes around the
 * table, messy headers, direction rows in several forms, TFN layouts and linguistic
 * ratings, missing and broken cells.
 *
 * Run from the repo root after changing a fixture: `node packages/io/fixtures/generate.ts`.
 * The expected structure of every file is in `packages/io/src/import/fixtures.test.ts`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const OUT = fileURLToPath(new URL('./files', import.meta.url));

type Cell = string | number | null | XLSX.CellObject;
interface SheetSpec {
  readonly name: string;
  readonly rows: readonly (readonly Cell[])[];
  readonly merges?: readonly string[];
  readonly hidden?: boolean;
}

function sheet(spec: SheetSpec): XLSX.WorkSheet {
  const rows = spec.rows.map((row) => row.map((cell) => (cell === null ? undefined : cell)));
  const ws = XLSX.utils.aoa_to_sheet(rows as unknown[][]);
  if (spec.merges) ws['!merges'] = spec.merges.map((range) => XLSX.utils.decode_range(range));
  return ws;
}

function workbook(file: string, sheets: readonly SheetSpec[], bookType: XLSX.BookType): void {
  const wb = XLSX.utils.book_new();
  for (const spec of sheets) XLSX.utils.book_append_sheet(wb, sheet(spec), spec.name);
  wb.Workbook = { Sheets: sheets.map((spec) => ({ Hidden: spec.hidden ? 1 : 0 })) };
  const data = XLSX.write(wb, { type: 'array', bookType, compression: true }) as ArrayBuffer;
  writeFileSync(join(OUT, file), new Uint8Array(data));
}

function text(
  file: string,
  content: string,
  encoding: 'utf-8' | 'utf-8-bom' | 'windows-1254' | 'utf-16le',
): void {
  let bytes: Uint8Array;
  if (encoding === 'windows-1254') bytes = encode1254(content);
  else if (encoding === 'utf-16le') {
    const body = Buffer.from(content, 'utf16le');
    bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), body]);
  } else {
    const body = Buffer.from(content, 'utf8');
    bytes =
      encoding === 'utf-8-bom' ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body;
  }
  writeFileSync(join(OUT, file), bytes);
}

const CP1254: Readonly<Record<string, number>> = {
  Ç: 0xc7,
  ç: 0xe7,
  Ğ: 0xd0,
  ğ: 0xf0,
  İ: 0xdd,
  ı: 0xfd,
  Ö: 0xd6,
  ö: 0xf6,
  Ş: 0xde,
  ş: 0xfe,
  Ü: 0xdc,
  ü: 0xfc,
};

function encode1254(content: string): Uint8Array {
  return Uint8Array.from(
    [...content].map((char) => {
      const code = char.charCodeAt(0);
      if (code < 0x80) return code;
      const byte = CP1254[char];
      if (byte === undefined) throw new Error(`No Windows-1254 byte for ${char}`);
      return byte;
    }),
  );
}

const lines = (...rows: string[]): string => `${rows.join('\r\n')}\r\n`;
const f = (v: number, formula: string): XLSX.CellObject => ({ t: 'n', v, f: formula });

mkdirSync(OUT, { recursive: true });

// 01 English CSV exported from Excel (US locale): comma, decimal point, direction row.
text(
  '01-en-suppliers.csv',
  lines(
    'Supplier,Price (USD),Quality score,Delivery time (days),Warranty (years)',
    'Direction,cost,benefit,cost,benefit',
    'Alpha Ltd,1250.50,7.5,14,2',
    'Beta Inc,980.00,6.8,21,1',
    'Gamma Co,1430.25,8.9,10,3',
    'Delta LLC,1105.75,7.1,18,2',
  ),
  'utf-8',
);

// 02 Turkish "CSV UTF-8" from Excel: BOM, semicolons, decimal comma, thousands points.
text(
  '02-tr-tedarikciler.csv',
  lines(
    'Alternatif;Fiyat (TL);Kalite;Teslim Süresi (gün);Garanti (yıl)',
    'Yön;maliyet;fayda;maliyet;fayda',
    'Tedarikçi A;1.250,50;7,5;14;2',
    'Tedarikçi B;980,00;6,8;21;1',
    'Tedarikçi Ç;1.430,25;8,9;10;3',
    'Tedarikçi Ş;1.105,75;7,1;18;2',
  ),
  'utf-8-bom',
);

// 03 Turkish CSV saved by older Excel versions: Windows-1254, semicolons, decimal comma.
text(
  '03-tr-windows-1254.csv',
  lines(
    'Şehir;Nüfus yoğunluğu;Ulaşım puanı;Arsa maliyeti',
    'Kriter türü;min;max;min',
    'İstanbul;2.987,5;9,1;1.250',
    'Iğdır;56,2;4,3;180',
    'Çorum;41,8;5,7;220',
    'Muğla;76,3;6,2;640',
  ),
  'windows-1254',
);

// 04 Tab-separated text, English, thousands commas, directions in the headers.
text(
  '04-en-projects.tsv',
  lines(
    'Project\tCost [min]\tNPV [max]\tRisk ↓\tStrategic fit ↑',
    'P-101\t12,500.00\t3,420.5\t0.35\t8',
    'P-102\t9,800.00\t2,100.0\t0.20\t6',
    'P-103\t15,250.00\t4,980.2\t0.55\t9',
    'P-104\t11,000.00\t2,750.8\t0.30\t7',
  ),
  'utf-8',
);

// 05 Only ambiguous numbers: every value could be 1,234 = 1234 or 1,234 = 1.234.
text(
  '05-ambiguous-thousands.csv',
  lines('Alternative;Revenue;Cost', 'A1;1,234;2,500', 'A2;3,750;1,125', 'A3;2,250;4,875'),
  'utf-8',
);

// 06 Ambiguous `1.234` resolved by unambiguous decimal commas in the same file.
text(
  '06-tr-resolved-by-evidence.csv',
  lines(
    'Alternatif;Ciro;Kâr marjı',
    'Firma 1;1.234;12,5',
    'Firma 2;2.468;9,75',
    'Firma 3;987;14,0',
  ),
  'utf-8',
);

// 07 English XLSX with numeric cells and directions as header suffixes.
workbook(
  '07-en-laptops.xlsx',
  [
    {
      name: 'Decision matrix',
      rows: [
        ['Laptop', 'Price (min)', 'RAM (max)', 'Weight (min)', 'Battery life (max)'],
        ['Model X', 1299, 16, 1.35, 12],
        ['Model Y', 999, 8, 1.6, 9.5],
        ['Model Z', 1599, 32, 1.2, 14],
      ],
    },
  ],
  'xlsx',
);

// 08 Turkish XLSX as printed in a thesis: merged title, row numbers, a notes column and a
// source line below the table.
workbook(
  '08-tr-tez-tablosu.xlsx',
  [
    {
      name: 'Tablo 3',
      merges: ['A1:F1'],
      rows: [
        ['Tablo 3. Depo yeri seçimi karar matrisi'],
        [],
        ['No', 'Depo', 'Kira (TL/ay)', 'Alan (m²)', 'Limana uzaklık (km)', 'Açıklama'],
        [1, 'Gebze', 185000, 4200, 35, 'Otoyola yakın'],
        [2, 'Tuzla', 210000, 3800, 12, 'Liman bağlantılı'],
        [3, 'Dilovası', 160000, 5100, 28, 'Genişleme alanı var'],
        [4, 'Çerkezköy', 120000, 6000, 95, 'Ucuz ama uzak'],
        [],
        ['Kaynak: Yazar tarafından derlenmiştir.'],
      ],
    },
  ],
  'xlsx',
);

// 09 Units, weights and a lettered direction row above the data; totals below it.
workbook(
  '09-tr-agirlik-birim.xlsx',
  [
    {
      name: 'Veri',
      rows: [
        ['Alternatifler', 'Maliyet', 'Kapasite', 'Enerji tüketimi', 'Güvenilirlik'],
        ['Birim', 'bin TL', 'adet/saat', 'kWh', '%'],
        ['Ağırlık', 0.3, 0.25, 0.2, 0.25],
        ['Yön', 'C', 'B', 'C', 'B'],
        ['Makine 1', 450, 120, 35.5, 0.95],
        ['Makine 2', 520, 150, 41.2, 0.97],
        ['Makine 3', 390, 100, 30.8, 0.92],
        ['Toplam', 1360, 370, 107.5, 2.84],
        ['Ortalama', 453.33, 123.33, 35.83, 0.9467],
      ],
    },
  ],
  'xlsx',
);

// 10 A MARCOS table copied from a paper, with the anti-ideal and ideal rows.
workbook(
  '10-en-marcos-paper.xlsx',
  [
    {
      name: 'Table 4',
      rows: [
        ['', 'C1', 'C2', 'C3', 'C4', 'C5'],
        ['Type', 'max', 'max', 'min', 'min', 'max'],
        ['AAI', 5, 3, 750, 9, 4],
        ['A1', 7, 5, 600, 7, 6],
        ['A2', 6, 3, 750, 9, 4],
        ['A3', 9, 6, 520, 6, 8],
        ['A4', 5, 4, 690, 8, 5],
        ['AI', 9, 6, 520, 6, 8],
      ],
    },
  ],
  'xlsx',
);

// 11 TFN columns named with suffixes, English.
workbook(
  '11-en-tfn-suffix-columns.xlsx',
  [
    {
      name: 'Fuzzy matrix',
      rows: [
        ['Alternative', 'C1_l', 'C1_m', 'C1_u', 'C2_l', 'C2_m', 'C2_u', 'C3_l', 'C3_m', 'C3_u'],
        [
          'Direction',
          'benefit',
          'benefit',
          'benefit',
          'cost',
          'cost',
          'cost',
          'benefit',
          'benefit',
          'benefit',
        ],
        ['A1', 5, 7, 9, 1, 3, 5, 3, 5, 7],
        ['A2', 3, 5, 7, 3, 5, 7, 5, 7, 9],
        ['A3', 7, 9, 9, 1, 1, 3, 1, 3, 5],
      ],
    },
  ],
  'xlsx',
);

// 12 TFN with a merged group header above an l/m/u row, Turkish.
workbook(
  '12-tr-tfn-iki-satir-baslik.xlsx',
  [
    {
      name: 'Bulanık',
      merges: ['A1:A2', 'B1:D1', 'E1:G1'],
      rows: [
        ['Alternatif', 'Hizmet kalitesi', null, null, 'Fiyat (min)', null, null],
        [null, 'l', 'm', 'u', 'l', 'm', 'u'],
        ['Firma A', 0.5, 0.7, 0.9, 120, 135, 150],
        ['Firma B', 0.3, 0.5, 0.7, 95, 110, 125],
        ['Firma C', 0.7, 0.9, 1, 140, 155, 170],
      ],
    },
  ],
  'xlsx',
);

// 13 The same layout in CSV, without merges, with Turkish component labels.
text(
  '13-tr-tfn-alt-orta-ust.csv',
  lines(
    'Alternatif;Kalite;;;Maliyet;;',
    ';alt;orta;üst;alt;orta;üst',
    'Yön;fayda;;;maliyet;;',
    'Firma A;0,5;0,7;0,9;120;135;150',
    'Firma B;0,3;0,5;0,7;95;110;125',
    'Firma C;0,7;0,9;1;140;155;170',
  ),
  'utf-8',
);

// 14 TFNs written in single cells with decimal commas.
workbook(
  '14-tr-tfn-hucre-ici.xlsx',
  [
    {
      name: 'Sayfa1',
      rows: [
        ['Alternatif', 'Esneklik', 'Risk', 'Maliyet'],
        ['Yön', 'fayda', 'maliyet', 'maliyet'],
        ['T1', '(0,5; 0,7; 0,9)', '(0,1; 0,2; 0,4)', '(10; 12; 15)'],
        ['T2', '(0,3; 0,5; 0,7)', '(0,2; 0,3; 0,5)', '(8; 9,5; 11)'],
        ['T3', '(0,7; 0,9; 1)', '(0,4; 0,5; 0,7)', '(12; 14; 16,5)'],
      ],
    },
  ],
  'xlsx',
);

// 15 TFNs in quoted CSV cells, English.
text(
  '15-en-tfn-in-cells.csv',
  lines(
    'Alternative,Comfort,Fuel use',
    'Direction,benefit,cost',
    'Car A,"(3, 5, 7)","(5.5, 6.0, 6.8)"',
    'Car B,"(5, 7, 9)","(6.2, 7.1, 8.0)"',
    'Car C,"(1, 3, 5)","(4.8, 5.2, 5.9)"',
  ),
  'utf-8',
);

// 16 Linguistic ratings with the abbreviations of the Fuzzy MARCOS scale.
workbook(
  '16-en-linguistic-fuzzy-marcos.xlsx',
  [
    {
      name: 'Ratings',
      rows: [
        ['Alternative', 'Safety', 'Comfort', 'Maintenance'],
        ['Direction', 'max', 'max', 'min'],
        ['A1', 'VG', 'G', 'MP'],
        ['A2', 'G', 'EG', 'M'],
        ['A3', 'MG', 'M', 'P'],
        ['A4', 'EG', 'VG', 'VP'],
      ],
    },
  ],
  'xlsx',
);

// 17 Linguistic ratings written out in Turkish.
workbook(
  '17-tr-dilsel-terimler.xlsx',
  [
    {
      name: 'Değerlendirme',
      rows: [
        ['Tedarikçi', 'Kalite', 'Teslimat', 'İletişim'],
        ['Yön', 'fayda', 'fayda', 'fayda'],
        ['ABC Ltd.', 'Çok iyi', 'İyi', 'Orta'],
        ['XYZ A.Ş.', 'İyi', 'Orta iyi', 'Kötü'],
        ['KLM Tic.', 'Orta', 'Çok iyi', 'İyi'],
      ],
    },
  ],
  'xlsx',
);

// 18 Ratings that fit both general scales: the scale must be chosen.
text(
  '18-en-linguistic-ambiguous.csv',
  lines('Option,Impact,Feasibility', 'Option 1,H,M', 'Option 2,VH,L', 'Option 3,M,H'),
  'utf-8',
);

// 19 Every kind of missing or broken cell.
workbook(
  '19-tr-eksik-ve-hatali.xlsx',
  [
    {
      name: 'Veri',
      rows: [
        ['Alternatif', 'K1', 'K2', 'K3', 'K4'],
        ['Yön', 'max', 'min', 'max', 'max'],
        ['A1', 10, null, 7, f(14, 'B3+4')],
        ['A2', '-', 5, 'N/A', 12],
        ['A3', 8, { t: 'e', v: 7 }, 'yok', { t: 'n', f: 'B5*2' }],
        ['A4', 'abc', 6, 9, { t: 'n', v: 45231, z: 'dd.mm.yyyy' }],
        ['A5', 11, 4, 8, 15],
      ],
    },
  ],
  'xlsx',
);

// 20 Decimal points and decimal commas mixed in one file.
text(
  '20-mixed-number-formats.csv',
  lines('Alternatif;K1;K2', 'A1;1.5;2,5', 'A2;3.25;4,75', 'A3;2.0;1,5'),
  'utf-8',
);

// 21 A workbook whose first sheet is notes and whose data is on the second; a hidden
// third sheet holds scratch numbers.
workbook(
  '21-multi-sheet.xlsx',
  [
    {
      name: 'Notlar',
      rows: [
        ['Bu dosya 2024 tedarikçi değerlendirmesi içindir.'],
        ['Hazırlayan: Satın alma birimi'],
      ],
    },
    {
      name: 'Veri',
      rows: [
        ['Tedarikçi', 'Fiyat', 'Kalite', 'Teslimat'],
        ['T1', 100, 8, 5],
        ['T2', 120, 9, 3],
        ['T3', 90, 6, 7],
      ],
    },
    {
      name: 'Hesap',
      hidden: true,
      rows: [
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [11, 12, 13, 14, 15],
        [16, 17, 18, 19, 20],
      ],
    },
  ],
  'xlsx',
);

// 22 Bare numbers: no header and no alternative names.
text('22-no-header.csv', lines('12,0.5,300', '15,0.7,280', '9,0.4,350', '11,0.6,310'), 'utf-8');

// 23 Macro-enabled workbook whose criterion values are formulas with cached results.
workbook(
  '23-en-macro-enabled.xlsm',
  [
    {
      name: 'Model',
      rows: [
        ['Alternative', 'Raw cost', 'Cost with tax (min)', 'Score (max)'],
        ['Site A', 100, f(120, 'B2*1.2'), f(7.5, 'AVERAGE(6,9)')],
        ['Site B', 80, f(96, 'B3*1.2'), f(6, 'AVERAGE(5,7)')],
        ['Site C', 120, f(144, 'B4*1.2'), f(8.5, 'AVERAGE(8,9)')],
      ],
    },
  ],
  'xlsm',
);

// 24 Legacy Excel 97\u20132003 workbook.
workbook(
  '24-en-legacy.xls',
  [
    {
      name: 'Sheet1',
      rows: [
        ['Candidate', 'Experience (years)', 'Interview score', 'Salary expectation'],
        ['Direction', 'benefit', 'benefit', 'cost'],
        ['Ann', 5, 82, 5200],
        ['Ben', 8, 75, 6100],
        ['Cem', 3, 90, 4800],
      ],
    },
  ],
  'xls',
);

// 25 Messy headers: line breaks, padding, non-breaking spaces, repeated names.
workbook(
  '25-tr-daginik-basliklar.xlsx',
  [
    {
      name: 'Liste',
      rows: [
        [
          '  Alternatif ',
          'Teslim\nSüresi (gün)',
          'Kalite\u00a0 puanı',
          'Kalite puanı',
          '  Fiyat  ',
        ],
        ['Yön', 'min', 'max', 'max', 'min'],
        ['Ürün 1', 5, 7, 8, 100],
        ['Ürün 2', 7, 6, 6, 90],
        ['ürün 1', 6, 8, 7, 95],
      ],
    },
  ],
  'xlsx',
);

// 26 Percentages written as text, with a non-breaking space between thousands and a
// Unicode minus sign.
text(
  '26-tr-yuzde-ve-bosluk.csv',
  lines(
    'Hisse;Getiri;Volatilite;Piyasa değeri',
    'Yön;max;min;max',
    'AAA;%12,5;18,2;1\u00a0250\u00a0000',
    'BBB;\u22123,4%;22,7;845\u00a0500',
    'CCC;7,8%;15,1;2\u00a0100\u00a0750',
  ),
  'utf-8',
);

// 27 The direction row above the header, as some templates put it.
text(
  '27-en-direction-above-header.csv',
  lines(
    ',max,min,max',
    'Robot,Payload (kg),Cost (k$),Repeatability',
    'R1,60,95,8',
    'R2,40,70,6',
    'R3,80,120,9',
  ),
  'utf-8',
);

// 28 "Unicode text" saved by Excel: UTF-16 with a byte order mark, tab-separated.
text(
  '28-excel-unicode-text.txt',
  lines(
    'Alternatif\tFayda\tMaliyet',
    'Kriter yönü\tfayda\tmaliyet',
    'Öneri 1\t4,5\t1200',
    'Öneri 2\t3,9\t950',
    'Öneri 3\t4,8\t1400',
  ),
  'utf-16le',
);

process.stdout.write(`Fixtures written to ${OUT}\n`);
