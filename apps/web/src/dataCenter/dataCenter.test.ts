import { importFile, type ImportOverrides } from '@mateo/io';
import { EMPTY_MODEL } from '@mateo/project';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { datasetFromImport } from './dataset';
import {
  clipboardInput,
  datasetNameFor,
  directionsMissing,
  missingCellIssues,
  readiness,
  runImport,
  stepsFor,
  withColumnsIgnored,
  withDirection,
  withSheet,
  type ImportInput,
} from './wizard';

const FIXTURES = resolve(import.meta.dirname, '../../../../packages/io/fixtures/files');

function input(name: string): ImportInput {
  return {
    name,
    bytes: new Uint8Array(readFileSync(`${FIXTURES}/${name}`)),
    mediaType: '',
    pasted: false,
  };
}

let counter = 0;
const options = (scales = EMPTY_MODEL.scales) => ({
  name: 'Test',
  newId: () => `id-${(counter += 1)}`,
  now: '2026-01-01T00:00:00.000Z',
  scales,
});

describe('wizard readiness', () => {
  it('blocks while a criterion has no direction, and never picks one', () => {
    const result = runImport(input('08-tr-tez-tablosu.xlsx'), {});
    expect(directionsMissing(result)).toEqual([0, 1, 2]);
    const state = readiness(result);
    expect(state.ok).toBe(false);
    expect(state.reasons).toEqual(['directions']);

    let overrides: ImportOverrides = {};
    for (const name of ['Kira (TL/ay)', 'Alan (m²)', 'Limana uzaklık (km)']) {
      overrides = withDirection(overrides, name, 'cost');
    }
    expect(readiness(runImport(input('08-tr-tez-tablosu.xlsx'), overrides)).ok).toBe(true);
  });

  it('blocks on validation errors such as missing values', () => {
    const result = runImport(input('19-tr-eksik-ve-hatali.xlsx'), {});
    expect(missingCellIssues(result).length).toBeGreaterThan(0);
    expect(readiness(result).reasons).toContain('errors');
  });

  it('skips the sheet step for text files only', () => {
    expect(stepsFor(runImport(input('01-en-suppliers.csv'), {}))).not.toContain('sheet');
    expect(stepsFor(runImport(input('07-en-laptops.xlsx'), {}))).toContain('sheet');
    expect(stepsFor(undefined)).toContain('sheet');
  });

  it('leaving a column out and taking it back is reversible', () => {
    const base = runImport(input('01-en-suppliers.csv'), {});
    const left = runImport(input('01-en-suppliers.csv'), withColumnsIgnored({}, [4], true));
    expect(left.model!.criteria).toHaveLength(base.model!.criteria.length - 1);
    expect(withColumnsIgnored(withColumnsIgnored({}, [4], true), [4], false)).toEqual({});
  });

  it('changing the sheet keeps file-level choices and drops structure choices', () => {
    const next = withSheet(
      { numberFormat: 'comma', headerRows: [3], directionRow: 2, ignoreColumns: [{ column: 1 }] },
      'Sheet2',
    );
    expect(next).toEqual({ numberFormat: 'comma', sheet: 'Sheet2' });
  });

  it('names datasets after the file and turns pasted text into a UTF-8 file', () => {
    expect(datasetNameFor('Suppliers 2026.xlsx')).toBe('Suppliers 2026');
    expect(datasetNameFor('.hidden')).toBe('.hidden');
    const pasted = clipboardInput('a\tb\n1\t2', 'x.tsv');
    expect([...pasted.bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(importFile(pasted.bytes, { fileName: 'x.tsv' }).source?.format).toBe('tsv');
  });
});

describe('datasetFromImport', () => {
  it('turns crisp data into a dataset without inventing anything', () => {
    const result = runImport(input('01-en-suppliers.csv'), {});
    const built = datasetFromImport(result.model!, ['cost'], options());
    const { dataset } = built;
    expect(dataset.alternatives.map((a) => [a.code, a.name])).toEqual([
      ['A1', 'Alpha Ltd'],
      ['A2', 'Beta Inc'],
      ['A3', 'Gamma Co'],
      ['A4', 'Delta LLC'],
    ]);
    expect(dataset.criteria.map((c) => [c.code, c.direction])).toEqual([
      ['C1', 'cost'],
      ['C2', 'benefit'],
      ['C3', 'cost'],
      ['C4', 'benefit'],
    ]);
    const cells = dataset.matrices[0]!.cells;
    expect(cells[dataset.alternatives[0]!.id]![dataset.criteria[0]!.id]).toEqual({
      kind: 'crisp',
      value: 1250.5,
    });
    const applied = built.command.apply(EMPTY_MODEL);
    expect(applied.datasets).toEqual([dataset]);
  });

  it('keeps fuzzy numbers as TFN cells', () => {
    const result = runImport(input('13-tr-tfn-alt-orta-ust.csv'), {});
    const { dataset } = datasetFromImport(result.model!, ['benefit', 'cost'], options());
    expect(dataset.criteria.every((c) => c.numberType === 'tfn')).toBe(true);
    const cell = dataset.matrices[0]!.cells[dataset.alternatives[0]!.id]![dataset.criteria[0]!.id];
    expect(cell).toEqual({ kind: 'tfn', value: { l: 0.5, m: 0.7, u: 0.9 } });
  });

  it('stores linguistic ratings as terms and adds the scale to the project once', () => {
    const result = runImport(input('16-en-linguistic-fuzzy-marcos.xlsx'), {});
    expect(result.validation.ok).toBe(true);
    const directions = result.model!.criteria.map(() => 'benefit' as const);
    const { dataset, command } = datasetFromImport(result.model!, directions, options());
    const model = command.apply(EMPTY_MODEL);
    const linguistic = dataset.criteria.filter((c) => c.scaleId !== null);
    expect(linguistic.length).toBeGreaterThan(0);
    // One copy of the scale, which every linguistic criterion uses.
    expect(model.scales).toHaveLength(1);
    expect(new Set(linguistic.map((c) => c.scaleId))).toEqual(new Set([model.scales[0]!.id]));
    const termIds = new Set(model.scales[0]!.terms.map((t) => t.id));
    const cell = dataset.matrices[0]!.cells[dataset.alternatives[0]!.id]![linguistic[0]!.id];
    expect(cell?.kind).toBe('term');
    expect(cell?.kind === 'term' && termIds.has(cell.termId)).toBe(true);

    // A project that already has the scale reuses it.
    const again = datasetFromImport(result.model!, directions, options(model.scales));
    expect(again.command.apply(model).scales).toHaveLength(1);
  });

  it('leaves cells without a value empty', () => {
    const result = runImport(input('19-tr-eksik-ve-hatali.xlsx'), {});
    const model = result.model!;
    const empties = model.values.flat().filter((value) => value === null).length;
    expect(empties).toBeGreaterThan(0);
    const { dataset } = datasetFromImport(
      model,
      model.criteria.map(() => 'benefit' as const),
      options(),
    );
    const filled = Object.values(dataset.matrices[0]!.cells).reduce(
      (sum, row) => sum + Object.keys(row).length,
      0,
    );
    expect(filled).toBe(model.values.flat().length - empties);
  });
});
