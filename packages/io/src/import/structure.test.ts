/** Structure detection and validation on small files written inline. */
import { textLiteral } from '@mateo/engine';
import { defineScale } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import { decision, errorKeys, names, utf8, warningKeys, xlsxBytes } from '../testing/helpers';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import { importFile } from './import';

const csv = (...rows: string[]) => importFile(utf8(rows.join('\n')));

describe('TFN layouts', () => {
  it('reports an incomplete l/m/u group and leaves its columns out', () => {
    const result = csv('Alt,C1_l,C1_m,C2', 'A1,1,2,5', 'A2,2,3,6');
    expect(errorKeys(result)).toEqual([CODES.tfnIncompleteGroup]);
    expect(names(result).criteria).toEqual(['C2']);
    expect(
      result.decisions.filter((item) => item.kind === 'ignored-column').map((item) => item.value),
    ).toEqual([
      { column: 1, reason: 'incomplete-tfn', header: 'C1_l' },
      { column: 2, reason: 'incomplete-tfn', header: 'C1_m' },
    ]);
  });

  it('reports a stray component in a two-row header', () => {
    const result = csv('Alt,C1,,,C2', ',l,m,u,l', 'A1,1,2,3,4', 'A2,2,3,4,5');
    expect(errorKeys(result)).toEqual([CODES.tfnIncompleteGroup]);
    expect(names(result).criteria).toEqual(['C1']);
  });

  it('accepts l/m/u columns in any order and reports l > m', () => {
    const result = csv('Alt,K (u),K (l),K (m)', 'A1,9,5,7', 'A2,3,4,5');
    expect(result.model?.values[0]).toEqual([{ l: 5, m: 7, u: 9 }]);
    expect(result.model?.origins[0]?.[0]?.cells).toEqual(['C2', 'D2', 'B2']);
    expect(errorKeys(result)).toEqual([`${CODES.cellTfnOrder}@C3:B3`]);
  });

  it('checks TFNs written in a cell', () => {
    const result = csv(
      'Alt,K1,K2',
      'A1,"(1; 2; 3)","(3; 2; 1)"',
      'A2,5,"[0.1; x; 0.3]"',
      'A3,-,{1 2 3}',
      'A4,"(1.5, 2.5, 3.5)",1; 2; 3',
    );
    expect(result.model?.values).toEqual([
      [{ l: 1, m: 2, u: 3 }, null],
      [null, null],
      [null, { l: 1, m: 2, u: 3 }],
      [
        { l: 1.5, m: 2.5, u: 3.5 },
        { l: 1, m: 2, u: 3 },
      ],
    ]);
    expect(errorKeys(result)).toEqual([
      `${CODES.cellTfnOrder}@C2`,
      `${CODES.cellInvalidTfn}@B3`,
      `${CODES.cellInvalidTfn}@C3`,
      `${CODES.cellMissing}@B4`,
    ]);
  });

  it('needs a number format before reading ambiguous TFN components', () => {
    const result = csv('Alt,K', 'A1,"(1.234; 2.000; 3.500)"', 'A2,"(1; 2; 3)"');
    expect(errorKeys(result)).toEqual([
      CODES.numberFormatAmbiguous,
      `${CODES.cellNeedsNumberFormat}@B2`,
    ]);
  });
});

describe('linguistic cells', () => {
  it('reports errors, missing ratings and unknown terms', () => {
    const bytes = xlsxBytes([
      ['Alt', 'K1', 'K2'],
      ['A1', 'VG', { t: 'e', v: 7 }],
      ['A2', 'Harika', 'G'],
      ['A3', { t: 'n', f: 'X1' }, 'P'],
      ['A4', 'yok', 'EG'],
    ]);
    const result = importFile(bytes);
    expect(decision(result, 'scale')).toMatchObject({ value: 'fuzzy-marcos', status: 'detected' });
    expect(errorKeys(result)).toEqual([
      `${CODES.cellFormulaError}@C2`,
      `${CODES.cellUnknownTerm}@B3`,
      `${CODES.cellFormulaWithoutValue}@B4`,
      `${CODES.cellMissing}@B5`,
    ]);
  });

  it('reports ratings that no scale covers', () => {
    const result = csv('Alt,K1', 'A1,VG', 'A2,VH', 'A3,G');
    expect(decision(result, 'scale')).toMatchObject({ status: 'not-found', value: null });
    expect(errorKeys(result)[0]).toBe(CODES.scaleNoMatch);
  });

  it('matches user scales by literal label, and key labels through labelTexts', () => {
    const scale = defineScale({
      id: 'risk',
      name: textLiteral('Risk'),
      kind: 'rating',
      terms: [
        {
          id: 'low',
          label: textLiteral('Düşük risk'),
          abbreviation: 'DR',
          value: { l: 1, m: 1, u: 3 },
        },
        {
          id: 'high',
          label: { key: 'custom.high' },
          abbreviation: 'YR',
          value: { l: 3, m: 5, u: 5 },
        },
      ],
    });
    const result = importFile(utf8('Alt,R\nA1,düşük RİSK\nA2,Very risky\nA3,yr\n'), {
      scales: [scale],
      labelTexts: (label) => ('text' in label ? [label.text] : ['Very risky']),
    });
    expect(result.validation.errors).toEqual([]);
    expect(result.model?.values).toEqual([
      [{ l: 1, m: 1, u: 3 }],
      [{ l: 3, m: 5, u: 5 }],
      [{ l: 3, m: 5, u: 5 }],
    ]);
  });
});

describe('directions', () => {
  it('reports a header suffix that contradicts the direction row', () => {
    const result = csv('Alt,Price (min),Quality', 'Direction,max,max', 'A1,1,2', 'A2,3,4');
    expect(errorKeys(result)).toEqual([CODES.directionConflict]);
    expect(result.model?.criteria.map((criterion) => criterion.direction)).toEqual([
      null,
      'benefit',
    ]);
  });

  it('reports conflicting directions inside an l/m/u group and invalid direction cells', () => {
    const result = csv('Alt,K_l,K_m,K_u,P', 'Yön,max,min,,bilinmiyor', 'A1,1,2,3,4', 'A2,2,3,4,5');
    expect(errorKeys(result)).toEqual([CODES.directionConflict, `${CODES.directionInvalid}@E2`]);
  });

  it('reads arrows, signs and lettered directions only in a labelled row', () => {
    const signs = csv('Alt,K1,K2,K3', ',+,-,↑', 'A1,1,2,3', 'A2,2,3,4');
    expect(signs.model?.criteria.map((criterion) => criterion.direction)).toEqual([
      'benefit',
      'cost',
      'benefit',
    ]);
    const letters = csv('Alt,K1,K2', 'Criterion type,B,C', 'A1,1,2', 'A2,2,3');
    expect(letters.model?.criteria.map((criterion) => criterion.direction)).toEqual([
      'benefit',
      'cost',
    ]);
    const unlabelled = csv('Alt,K1,K2', 'X,B,C', 'A1,1,2', 'A2,2,3');
    expect(decision(unlabelled, 'direction-row')?.value).toBeNull();
  });
});

describe('rows and names', () => {
  it('reports alternatives without a name and empty tables', () => {
    const result = csv('Alt,K1', 'A1,1', ',2', 'A3,3');
    expect(errorKeys(result)).toEqual([`${CODES.alternativeNameMissing}@A3`]);
    expect(names(result).alternatives).toEqual(['A1', '', 'A3']);
    expect(errorKeys(csv('a,b', 'c,d'))).toEqual([CODES.fileNoData]);
    const onlyNumbersInHeader = importFile(
      xlsxBytes([
        ['Ad', 'K1'],
        ['Toplam', 5],
      ]),
    );
    expect(errorKeys(onlyNumbersInHeader)).toEqual([CODES.noAlternatives]);
  });

  it('keeps a trailing alternative whose values are all missing', () => {
    const result = csv('Alt,K1,K2', 'A1,1,2', 'A2,,');
    expect(names(result).alternatives).toEqual(['A1', 'A2']);
    expect(errorKeys(result)).toEqual([`${CODES.cellMissing}@B3`, `${CODES.cellMissing}@C3`]);
  });

  it('offers a weights row and warns about its gaps', () => {
    const result = csv('Alt,K1,K2,K3', 'Weights,0.5,x,', 'A1,1,2,3', 'A2,2,3,4');
    expect(result.model?.weights).toEqual({ row: 1, values: [0.5, null, null] });
    expect(warningKeys(result).filter((key) => key.startsWith(CODES.weightInvalid))).toEqual([
      `${CODES.weightInvalid}@C2`,
      `${CODES.weightInvalid}@D2`,
    ]);
  });

  it('reads booleans as invalid and uses the units of an l/m/u group', () => {
    const result = importFile(
      xlsxBytes([
        ['Alt', 'K_l', 'K_m', 'K_u', 'P'],
        ['Unit', '', 'kg', '', 'TL'],
        ['A1', 1, 2, 3, true],
        ['A2', 2, 3, 4, 5],
      ]),
    );
    expect(result.model?.criteria.map((criterion) => criterion.unit)).toEqual(['kg', 'TL']);
    expect(errorKeys(result)).toEqual([`${CODES.cellInvalidNumber}@E3`]);
  });

  it('prefers a visible sheet with values and names years as alternatives', () => {
    const result = importFile(
      xlsxBytes([
        ['Yıl', 'Satış', 'Kâr'],
        [2022, 10, 2],
        [2023, 12, 3],
      ]),
    );
    expect(names(result).alternatives).toEqual(['2022', '2023']);
    expect(names(result).criteria).toEqual(['Satış', 'Kâr']);
  });

  it('treats a numbered column with a row-number header as row numbers', () => {
    const result = csv('Sıra No,Ad,K1', '3,A,1', '7,B,2');
    expect(names(result).criteria).toEqual(['K1']);
    expect(decision(result, 'ignored-column')?.value).toEqual({
      column: 0,
      reason: 'row-number',
      header: 'Sıra No',
    });
  });
});
