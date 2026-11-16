import { describe, expect, it } from 'vitest';
import { fixtureBytes } from '../testing/fixtures';
import { decision, errorKeys, names, warningKeys } from '../testing/helpers';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import type { ImportOptions } from './import';
import { importFile } from './import';

const run = (name: string, overrides: ImportOptions['overrides']) =>
  importFile(fixtureBytes(name), { fileName: name, overrides });

describe('overrides', () => {
  it('resolves ambiguous numbers with an explicit number format', () => {
    const point = run('05-ambiguous-thousands.csv', { numberFormat: 'point' });
    expect(point.validation.errors).toEqual([]);
    expect(point.model?.values).toEqual([
      [1234, 2500],
      [3750, 1125],
      [2250, 4875],
    ]);
    expect(decision(point, 'number-format')).toMatchObject({ status: 'override', value: 'point' });
    const comma = run('05-ambiguous-thousands.csv', { numberFormat: 'comma' });
    expect(comma.model?.values[0]).toEqual([1.234, 2.5]);
  });

  it('warns when the chosen number format contradicts the file', () => {
    const result = run('20-mixed-number-formats.csv', { numberFormat: 'comma' });
    expect(warningKeys(result)).toContain(CODES.numberFormatOverrideConflict);
    expect(errorKeys(result)).toEqual(
      ['B2', 'B3', 'B4'].map((cell) => `${CODES.cellInvalidNumber}@${cell}`),
    );
    expect(result.model?.values.map((row) => row[1])).toEqual([2.5, 4.75, 1.5]);
  });

  it('resolves an ambiguous scale with an explicit scale', () => {
    const result = run('18-en-linguistic-ambiguous.csv', { scaleId: 'seven-level' });
    expect(result.validation.errors).toEqual([]);
    expect(result.model?.values[0]).toEqual([
      { l: 5, m: 6, u: 7 },
      { l: 3, m: 4, u: 5 },
    ]);
    expect(result.model?.criteria[0]?.scaleId).toBe('seven-level');
    expect(result.model?.origins[0]?.[0]).toEqual({ cells: ['B2'], text: 'H', term: 'high' });
  });

  it('reports an unknown scale and terms outside the chosen scale', () => {
    expect(errorKeys(run('18-en-linguistic-ambiguous.csv', { scaleId: 'nope' }))[0]).toBe(
      CODES.scaleNotFound,
    );
    const result = run('16-en-linguistic-fuzzy-marcos.xlsx', { scaleId: 'five-level' });
    expect(errorKeys(result)).toContain(`${CODES.cellUnknownTerm}@B3`);
    expect(result.model?.values[0]?.[0]).toBeNull();
  });

  it('applies directions by criterion name, ignoring case', () => {
    const result = run('21-multi-sheet.xlsx', { directions: { fiyat: 'cost', KALİTE: 'benefit' } });
    expect(result.model?.criteria.map((criterion) => criterion.direction)).toEqual([
      'cost',
      'benefit',
      null,
    ]);
    expect(decision(result, 'criterion')?.value.directionSource).toBe('override');
  });

  it('picks a sheet by name or index and reports a missing one', () => {
    expect(names(run('21-multi-sheet.xlsx', { sheet: 'hesap' })).criteria).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
    expect(decision(run('21-multi-sheet.xlsx', { sheet: 2 }), 'sheet')).toMatchObject({
      status: 'override',
      value: { name: 'Hesap', index: 2 },
    });
    expect(errorKeys(run('21-multi-sheet.xlsx', { sheet: 'Yok' }))).toEqual([CODES.sheetNotFound]);
    expect(errorKeys(run('21-multi-sheet.xlsx', { sheet: 'Notlar' }))).toEqual([CODES.fileNoData]);
  });

  it('sets the header, the alternative column and ignored columns', () => {
    const result = run('08-tr-tez-tablosu.xlsx', {
      headerRows: [2],
      idColumn: { header: 'No' },
      ignoreColumns: [{ header: 'Depo' }, { header: 'Alan (m²)' }, { header: 'Yok böyle' }],
    });
    expect(names(result)).toEqual({
      alternatives: ['1', '2', '3', '4'],
      criteria: ['Kira (TL/ay)', 'Limana uzaklık (km)'],
    });
    expect(warningKeys(result)).toContain(CODES.profileColumnNotFound);
    expect(decision(result, 'id-column')).toMatchObject({
      status: 'override',
      value: { column: 0 },
    });
  });

  it('can say that there is no header and no alternative column', () => {
    const result = run('07-en-laptops.xlsx', { headerRows: null, idColumn: null });
    expect(decision(result, 'header')).toMatchObject({ status: 'override', value: null });
    expect(names(result).alternatives[0]).toBe('A1');
    expect(errorKeys(result)).toContain(`${CODES.cellInvalidNumber}@B1`);
  });

  it('can turn a detected direction row into data or point at another row', () => {
    const none = run('01-en-suppliers.csv', { directionRow: null });
    expect(names(none).alternatives[0]).toBe('Direction');
    expect(errorKeys(none)).toContain(`${CODES.cellInvalidNumber}@B2`);
    const row = run('01-en-suppliers.csv', { directionRow: 1, idColumn: { column: 0 } });
    expect(row.model?.criteria[0]?.direction).toBe('cost');
    expect(decision(row, 'direction-row')).toMatchObject({ status: 'override', value: { row: 1 } });
  });

  it('re-reads a text file with another encoding or delimiter', () => {
    const latin = run('02-tr-tedarikciler.csv', { encoding: 'windows-1254' });
    expect(names(latin).alternatives[2]).toBe('TedarikÃ§i Ã‡');
    const comma = run('02-tr-tedarikciler.csv', { delimiter: ',' });
    expect(decision(comma, 'delimiter')).toMatchObject({ status: 'override', value: ',' });
  });
});
