import { describe, expect, it } from 'vitest';
import { utf8, xlsxBytes } from '../testing/helpers';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import { detectDelimiter } from './delimiter';
import { decodeText } from './encoding';
import { readSource } from './read';

const codes = (result: ReturnType<typeof readSource>): string[] =>
  result.issues.map((issue) => issue.code);

describe('decodeText', () => {
  it('uses byte order marks', () => {
    expect(decodeText(Uint8Array.from([0xef, 0xbb, 0xbf, 0x41]))).toMatchObject({
      text: 'A',
      encoding: 'utf-8',
      status: 'bom',
    });
    expect(decodeText(Uint8Array.from([0xff, 0xfe, 0x41, 0x00]))).toMatchObject({
      text: 'A',
      encoding: 'utf-16le',
    });
    expect(decodeText(Uint8Array.from([0xfe, 0xff, 0x00, 0x41]))).toMatchObject({
      text: 'A',
      encoding: 'utf-16be',
    });
  });

  it('reads valid UTF-8 and falls back to Windows-1254', () => {
    expect(decodeText(utf8('Şişli'))).toMatchObject({ text: 'Şişli', status: 'valid-utf-8' });
    expect(decodeText(Uint8Array.from([0xde, 0x69, 0xfe, 0x6c, 0x69]))).toMatchObject({
      text: 'Şişli',
      encoding: 'windows-1254',
      status: 'turkish-letters',
    });
    // é in Windows-1252/1254 is not proof of Turkish.
    expect(decodeText(Uint8Array.from([0x63, 0x61, 0x66, 0xe9]))).toMatchObject({
      text: 'café',
      status: 'fallback',
    });
  });

  it('honours an override and counts replacement characters', () => {
    const result = decodeText(Uint8Array.from([0xde, 0x41]), 'utf-8');
    expect(result).toMatchObject({ status: 'override', encoding: 'utf-8', replacements: 1 });
  });
});

describe('detectDelimiter', () => {
  it('prefers the delimiter with a consistent field count', () => {
    expect(detectDelimiter('a;b;c\n1,5;2,5;3\n').delimiter).toBe(';');
    expect(detectDelimiter('a,b\n1,2\n').delimiter).toBe(',');
    expect(detectDelimiter('a\tb\n1\t2\n').delimiter).toBe('\t');
  });

  it('reports a single column and ambiguous splits', () => {
    expect(detectDelimiter('a\nb\n')).toMatchObject({ status: 'single-column', delimiter: ',' });
    expect(detectDelimiter('a\nb\n', '\t').delimiter).toBe('\t');
    expect(detectDelimiter('a;b,c\nd;e,f\n').status).toBe('ambiguous');
    expect(detectDelimiter('a;b,c\nd;e,f\n', ';')).toMatchObject({
      status: 'detected',
      delimiter: ';',
    });
  });
});

describe('readSource', () => {
  it('rejects empty, binary and broken files without throwing', () => {
    expect(codes(readSource(new Uint8Array()))).toEqual([CODES.fileEmpty]);
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
    expect(codes(readSource(png, { fileName: 'logo.png' }))).toEqual([CODES.fileUnsupported]);
    const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
    expect(codes(readSource(zip, { fileName: 'broken.xlsx' }))).toEqual([CODES.fileUnreadable]);
    const cfb = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect(codes(readSource(cfb, { fileName: 'old.xls' }))).toEqual([CODES.fileUnreadable]);
  });

  it('decides the spreadsheet format from the content, not the extension', () => {
    const bytes = xlsxBytes([['a', 1]]);
    expect(readSource(bytes, { fileName: 'data.csv' }).source?.format).toBe('xlsx');
    expect(readSource(bytes, { fileName: 'data.XLSM' }).source?.format).toBe('xlsm');
    expect(readSource(xlsxBytes([['a', 1]], 'biff8'), { fileName: 'x.xlsx' }).source?.format).toBe(
      'xls',
    );
  });

  it('keeps booleans, errors and formulas without cached values apart from numbers', () => {
    const bytes = xlsxBytes([
      [true, { t: 'e', v: 0x2a }, { t: 'n', f: 'A1+1' }, { t: 's', v: '  ' }, 4],
    ]);
    const row = readSource(bytes).source?.sheets[0]?.rows[0];
    expect(row).toEqual([
      { type: 'boolean', value: true },
      { type: 'error', value: '#N/A' },
      { type: 'formula', formula: 'A1+1' },
      null,
      { type: 'number', value: 4 },
    ]);
  });

  it('reports an unclosed quote in a CSV row', () => {
    const result = readSource(utf8('a,b\n1,"2\n3,4\n'));
    expect(codes(result)).toEqual([CODES.csvMalformedRow]);
  });

  it('warns about an uncertain encoding and an ambiguous delimiter', () => {
    const result = readSource(
      Uint8Array.from([0x61, 0x3b, 0x62, 0x2c, 0x63, 0x0a, 0xe9, 0x3b, 0x65, 0x2c, 0x66]),
    );
    expect(codes(result)).toEqual([CODES.encodingUncertain, CODES.delimiterAmbiguous]);
  });

  it('uses the delimiter and encoding overrides', () => {
    const result = readSource(utf8('a;b,c\n1;2,3\n'), { delimiter: ',', encoding: 'utf-8' });
    expect(result.source?.sheets[0]?.rows[0]).toEqual([
      { type: 'text', value: 'a;b' },
      { type: 'text', value: 'c' },
    ]);
    expect(result.decisions).toEqual([
      { kind: 'format', status: 'detected', value: 'csv' },
      { kind: 'encoding', status: 'override', value: 'utf-8', evidence: 'override' },
      { kind: 'delimiter', status: 'override', value: ',' },
    ]);
  });
});
