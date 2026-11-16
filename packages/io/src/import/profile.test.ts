import { describe, expect, it } from 'vitest';
import { fixtureBytes } from '../testing/fixtures';
import { names, utf8, warningKeys } from '../testing/helpers';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import { importFile } from './import';
import { IMPORT_PROFILE_FORMAT_VERSION, parseImportProfile, profileFromImport } from './profile';

describe('import profiles', () => {
  it('captures the decisions of an import', () => {
    const result = importFile(fixtureBytes('02-tr-tedarikciler.csv'), { fileName: 'x.csv' });
    expect(profileFromImport(result)).toEqual({
      formatVersion: 1,
      sourceFormat: 'csv',
      overrides: {
        encoding: 'utf-8',
        delimiter: ';',
        headerRows: [0],
        idColumn: { header: 'Alternatif' },
        numberFormat: 'comma',
        directions: {
          'Fiyat (TL)': 'cost',
          Kalite: 'benefit',
          'Teslim Süresi (gün)': 'cost',
          'Garanti (yıl)': 'benefit',
        },
      },
    });
  });

  it('stores columns without a header by index, and the sheet and scale', () => {
    const noHeader = profileFromImport(importFile(fixtureBytes('10-en-marcos-paper.xlsx')));
    expect(noHeader.overrides.idColumn).toEqual({ column: 0 });
    expect(noHeader.overrides.sheet).toBe('Table 4');
    const linguistic = profileFromImport(
      importFile(fixtureBytes('16-en-linguistic-fuzzy-marcos.xlsx')),
    );
    expect(linguistic.overrides.scaleId).toBe('fuzzy-marcos');
    const ignored = profileFromImport(importFile(fixtureBytes('08-tr-tez-tablosu.xlsx')));
    expect(ignored.overrides.ignoreColumns).toEqual([{ header: 'No' }, { header: 'Açıklama' }]);
    expect(
      profileFromImport({ decisions: [], validation: { ok: true, errors: [], warnings: [] } }),
    ).toEqual({
      formatVersion: 1,
      overrides: {},
    });
  });

  it('re-applies to a similar file with moved columns and no direction row', () => {
    const first = importFile(fixtureBytes('02-tr-tedarikciler.csv'));
    const profile = profileFromImport(first);
    const json = JSON.parse(JSON.stringify(profile)) as unknown;
    const parsed = parseImportProfile(json);
    expect(parsed.validation.ok).toBe(true);
    const next = importFile(
      utf8(
        [
          'Kalite;Alternatif;Garanti (yıl);Fiyat (TL);Teslim Süresi (gün)',
          '8,1;Tedarikçi E;3;1.050,00;12',
          '6,4;Tedarikçi F;1;890,50;25',
        ].join('\n'),
      ),
      { overrides: parsed.definition?.overrides },
    );
    expect(next.validation.errors).toEqual([]);
    expect(names(next)).toEqual({
      alternatives: ['Tedarikçi E', 'Tedarikçi F'],
      criteria: ['Kalite', 'Garanti (yıl)', 'Fiyat (TL)', 'Teslim Süresi (gün)'],
    });
    expect(next.model?.criteria.map((criterion) => criterion.direction)).toEqual([
      'benefit',
      'benefit',
      'cost',
      'cost',
    ]);
    expect(next.model?.values[0]).toEqual([8.1, 3, 1050, 12]);
    expect(warningKeys(next)).toEqual([]);
  });

  it('rejects malformed definitions and newer versions', () => {
    const code = (value: unknown): string[] =>
      parseImportProfile(value).validation.errors.map(
        (issue) => `${issue.code}:${String(issue.params?.['field'] ?? issue.params?.['version'])}`,
      );
    expect(code(null)).toEqual([`${CODES.profileInvalid}:overrides`]);
    expect(code({ formatVersion: 1 })).toEqual([`${CODES.profileInvalid}:overrides`]);
    expect(code({ formatVersion: 2, overrides: {} })).toEqual([`${CODES.profileVersion}:2`]);
    expect(
      code({
        formatVersion: IMPORT_PROFILE_FORMAT_VERSION,
        sourceFormat: 'ods',
        overrides: {
          sheet: '',
          encoding: 'latin-1',
          delimiter: '|',
          numberFormat: 'dot',
          headerRows: [0, 1, 2],
          idColumn: { header: 'A', column: 1 },
          ignoreColumns: [{ column: -1 }],
          directionRow: 1.5,
          directions: { a: 'max' },
          scaleId: 3,
          extra: true,
        },
      }),
    ).toEqual(
      [
        'sourceFormat',
        'overrides.sheet',
        'overrides.encoding',
        'overrides.delimiter',
        'overrides.numberFormat',
        'overrides.headerRows',
        'overrides.idColumn',
        'overrides.ignoreColumns',
        'overrides.directionRow',
        'overrides.directions',
        'overrides.scaleId',
        'overrides.extra',
      ].map((field) => `${CODES.profileInvalid}:${field}`),
    );
    expect(
      parseImportProfile({
        formatVersion: 1,
        overrides: {
          sheet: 0,
          headerRows: null,
          idColumn: null,
          directionRow: null,
          ignoreColumns: [],
        },
      }).definition,
    ).toBeDefined();
  });
});
