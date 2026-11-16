import { crispWeights, runMethod, textLiteral, type DecisionMatrix } from '@mateo/engine';
import { fuzzyMarcosMethod, marcosMethod } from '@mateo/methods';
import type { Dataset, StoredAnalysis } from '@mateo/project';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { analysisTables, traceTable } from './analysis';
import { writeCsvZip } from './csv';
import { CRISP, FIVE_LEVEL, FUZZY, INFO, PROJECT, translatorFor } from './testing';
import type { ExportTable } from './types';
import { writeXlsx } from './xlsx';

const OPTIONS = { creator: 'Mateo test', createdAt: INFO.exportedAt };

/** A complete crisp dataset (no empty cells) so that MARCOS can run on it. */
const FULL: Dataset = {
  ...CRISP,
  matrices: [
    {
      ...CRISP.matrices[0]!,
      cells: {
        ...CRISP.matrices[0]!.cells,
        a3: {
          c1: { kind: 'crisp', value: 1234.5 },
          c2: { kind: 'crisp', value: 0.5 },
          c3: { kind: 'crisp', value: 5 },
        },
      },
    },
  ],
};

function crispInput() {
  const cells = FULL.matrices[0]!.cells;
  const matrix: DecisionMatrix<number> = {
    alternatives: FULL.alternatives.map((a) => ({ id: a.id, name: textLiteral(a.name) })),
    criteria: FULL.criteria.map((c) => ({
      id: c.id,
      name: textLiteral(c.name),
      direction: c.direction,
      numberType: 'crisp',
    })),
    values: FULL.alternatives.map((a) =>
      FULL.criteria.map((c) => (cells[a.id]![c.id] as { value: number }).value),
    ),
  };
  return { matrix, weights: crispWeights(['c1', 'c2', 'c3'], [0.5, 0.3, 0.2]) };
}

function stored(
  record: StoredAnalysis['record'],
  numberType: string,
  input: unknown,
): StoredAnalysis {
  return {
    id: 'an1',
    name: '',
    datasetId: 'd1',
    snapshotId: 's1',
    methodId: record.methodId,
    methodVersion: record.methodVersion,
    numberType,
    variant: null,
    traceFormatVersion: record.trace.formatVersion,
    appVersion: '0.0.0',
    createdAt: '2026-11-16T10:00:00.000Z',
    record,
    methodInput: input,
    configuration: { workspace: 'ranking', matrixId: 'm1', fuzzyModel: 'tfn' },
  };
}

const marcos = () => {
  const input = crispInput();
  return stored(runMethod(marcosMethod, input), 'crisp', input);
};

function fuzzyMarcos() {
  const cells = FUZZY.matrices[0]!.cells;
  const tfn = (alt: string, crit: string) => {
    const cell = cells[alt]?.[crit];
    if (cell?.kind === 'tfn') return cell.value;
    if (cell?.kind === 'crisp') return { l: cell.value, m: cell.value, u: cell.value };
    const term = FIVE_LEVEL.terms.find((t) => cell?.kind === 'term' && t.id === cell.termId);
    return term?.value ?? { l: 1, m: 1, u: 1 };
  };
  const matrix: DecisionMatrix<{ l: number; m: number; u: number }> = {
    alternatives: FUZZY.alternatives.map((a) => ({ id: a.id, name: textLiteral(a.name) })),
    criteria: FUZZY.criteria.map((c) => ({
      id: c.id,
      name: textLiteral(c.name),
      direction: c.direction,
      numberType: 'tfn',
    })),
    values: FUZZY.alternatives.map((a) => FUZZY.criteria.map((c) => tfn(a.id, c.id))),
  };
  const weights = {
    numberType: 'tfn',
    entries: FUZZY.criteria.map((c) => ({
      criterionId: c.id,
      value: { l: 0.2, m: 0.25, u: 0.3 },
    })),
  };
  const input = { matrix, weights };
  return stored(runMethod(fuzzyMarcosMethod, input as never), 'tfn', input);
}

const byId = (tables: readonly ExportTable[], id: string) => tables.find((t) => t.id === id)!;

describe('MARCOS workbook', () => {
  const analysis = marcos();
  const t = translatorFor('en');
  const tables = analysisTables(
    { analysis, dataset: FULL, scales: [], project: PROJECT, method: marcosMethod },
    INFO,
    t,
  );

  it('has the fixed sheets and one sheet for every step of the trace', () => {
    const ids = tables.map((table) => table.id);
    expect(ids.slice(0, 3)).toEqual(['info', 'data', 'criteria']);
    for (const id of ['alternatives', 'method', 'references', 'results', 'weights']) {
      expect(ids).toContain(id);
    }
    expect(ids.filter((id) => id.startsWith('step-'))).toEqual(
      analysis.record.trace.steps.map((step) => `step-${step.id}`),
    );
    expect(analysis.record.trace.steps.length).toBeGreaterThanOrEqual(10);
  });

  it('writes results, parameters and the method version', () => {
    const results = byId(tables, 'results').rows;
    expect(results[0]).toEqual(['Rank', 'Alternative', 'Score', 'f(K⁻)', 'f(K⁺)']);
    expect(results.slice(1).map((row) => row[0])).toEqual([1, 2, 3]);
    expect(typeof results[1]![2]).toBe('number');
    const method = byId(tables, 'method').rows.map((row) => row.join('|'));
    expect(method).toContain(`Method version|${analysis.methodVersion}`);
    expect(method.some((row) => row.startsWith('Normalize weights|'))).toBe(true);
    expect(byId(tables, 'references').rows.length).toBeGreaterThan(1);
  });

  it('writes every trace number as a number in an XLSX that reads back', async () => {
    const bytes = await writeXlsx(tables, OPTIONS);
    const book = XLSX.read(bytes, { type: 'array' });
    expect(book.SheetNames).toHaveLength(tables.length);
    const normalized = byId(tables, 'step-normalized-matrix');
    const sheet = book.Sheets[book.SheetNames[tables.indexOf(normalized)]!]!;
    const cell = sheet['B2'] as XLSX.CellObject | undefined;
    expect(cell?.t).toBe('n');
    const step = analysis.record.trace.steps.find((s) => s.id === 'normalized-matrix')!;
    expect(cell?.v).toBe(step.output.cells[0]![0]!.value);
  });

  it('gives a CSV file for every table in a ZIP', () => {
    const zip = writeCsvZip(tables, 'en');
    expect(zip.length).toBeGreaterThan(tables.length * 40);
  });

  it('is written in the chosen language', () => {
    const turkish = analysisTables(
      { analysis, dataset: FULL, scales: [], project: PROJECT, method: marcosMethod },
      { ...INFO, language: 'tr' },
      translatorFor('tr'),
    );
    expect(byId(turkish, 'results').rows[0]![0]).toBe('Sıra');
    expect(byId(turkish, 'info').title).toBe('Bilgi');
  });

  it('appends extra tables such as sensitivity scenarios and flags a stale analysis', () => {
    const extra: ExportTable = {
      id: 'sensitivity',
      title: 'Scenarios',
      rows: [['x']],
      headerRows: 1,
      headerColumns: 0,
    };
    const withExtra = analysisTables(
      {
        analysis,
        dataset: FULL,
        scales: [],
        project: PROJECT,
        stale: true,
        extraTables: [extra],
      },
      INFO,
      t,
    );
    expect(withExtra[withExtra.length - 1]).toBe(extra);
    expect(byId(withExtra, 'info').rows.some((row) => row[0] === t('export.info.stale'))).toBe(
      true,
    );
  });
});

describe('Fuzzy MARCOS workbook', () => {
  const analysis = fuzzyMarcos();
  const tables = analysisTables(
    {
      analysis,
      dataset: FUZZY,
      scales: [FIVE_LEVEL],
      project: PROJECT,
      method: fuzzyMarcosMethod,
    },
    INFO,
    translatorFor('en'),
  );

  it('spreads fuzzy numbers over l, m and u columns with merged headings', () => {
    const step = analysis.record.trace.steps.find((s) => s.id === 'normalized-matrix')!;
    const table = traceTable(step.output, translatorFor('en'), { id: 'x', title: 'x' });
    expect(table.headerRows).toBe(2);
    expect(table.rows[1]!.slice(1, 4)).toEqual(['l', 'm', 'u']);
    expect(table.merges).toContainEqual({ top: 0, left: 1, bottom: 0, right: 3 });
    const first = step.output.cells[0]![0]!.value as { components: Record<string, number> };
    expect(table.rows[2]!.slice(1, 4)).toEqual([
      first.components['l'],
      first.components['m'],
      first.components['u'],
    ]);
  });

  it('includes the scales and a results sheet', () => {
    expect(tables.map((table) => table.id)).toContain('scales');
    expect(byId(tables, 'results').rows).toHaveLength(4);
  });

  it('writes a workbook without text where numbers belong', async () => {
    const bytes = await writeXlsx(tables, OPTIONS);
    const book = XLSX.read(bytes, { type: 'array' });
    for (const table of tables.filter((item) => item.id.startsWith('step-'))) {
      const sheet = book.Sheets[book.SheetNames[tables.indexOf(table)]!]!;
      const range = XLSX.utils.decode_range(sheet['!ref']!);
      for (let r = table.headerRows; r <= range.e.r; r += 1) {
        for (let c = 1; c <= range.e.c; c += 1) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
          if (cell) expect(cell.t, `${table.id} r${r} c${c}`).toBe('n');
        }
      }
    }
  });
});
