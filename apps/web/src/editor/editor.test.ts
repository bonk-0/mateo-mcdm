import {
  crispCell,
  tfnCell,
  termCell,
  type Dataset,
  type LinguisticScale,
  type ModelCriterion,
  type ScaleTerm,
} from '@mateo/project';
import { describe, expect, it } from 'vitest';
import { cellDisplayText, cellEditText, cellIssue, parseCellText } from './cellText';
import { formatTable, parseTable } from './clipboard';
import { parseNumber, type NumberSyntax } from './numbers';
import {
  CODE_COLUMN,
  NAME_COLUMN,
  planBulk,
  planClear,
  planPaste,
  type GridLayout,
  type ParseContext,
} from './plan';
import { RowCache, summarize } from './rows';

const EN: NumberSyntax = { decimal: '.', group: ',' };
const TR: NumberSyntax = { decimal: ',', group: '.' };

const scale: LinguisticScale = {
  id: 's1',
  name: { text: 'Quality' },
  sourceId: null,
  numberType: 'tfn',
  terms: [
    { id: 'low', label: { text: 'Low' }, abbreviation: 'L', value: { l: 1, m: 2, u: 3 } },
    { id: 'high', label: { text: 'High' }, abbreviation: 'H', value: { l: 3, m: 4, u: 5 } },
  ],
};

function criterion(id: string, patch: Partial<ModelCriterion> = {}): ModelCriterion {
  return {
    id,
    code: id.toUpperCase(),
    name: id,
    description: '',
    direction: 'benefit',
    unit: '',
    numberType: 'crisp',
    scaleId: null,
    ...patch,
  };
}

const crisp = criterion('c1');
const fuzzy = criterion('f1', { numberType: 'tfn', scaleId: 's1' });
const label = (term: ScaleTerm) => ('text' in term.label ? term.label.text : term.id);

describe('parseNumber', () => {
  it('reads both locales and mixed input', () => {
    expect(parseNumber('1,5', EN)).toBe(1.5);
    expect(parseNumber('1.5', TR)).toBe(1.5);
    expect(parseNumber('1,234.5', EN)).toBe(1234.5);
    expect(parseNumber('1.234,5', TR)).toBe(1234.5);
    expect(parseNumber('1,234', EN)).toBe(1234);
    expect(parseNumber(' −2e3 ', EN)).toBe(-2000);
    expect(parseNumber('1 234,5', TR)).toBe(1234.5);
  });
  it('refuses things that are not numbers', () => {
    for (const text of ['', 'abc', '1..2', '1,2,3', 'NaN', 'Infinity', '1e999']) {
      expect(parseNumber(text, EN)).toBeUndefined();
    }
  });
});

describe('parseCellText', () => {
  it('parses crisp numbers and empties', () => {
    expect(parseCellText('4,5', crisp, undefined, TR)).toEqual({ ok: true, value: crispCell(4.5) });
    expect(parseCellText('  ', crisp, undefined, EN)).toEqual({ ok: true, value: null });
    expect(parseCellText('x', crisp, undefined, EN)).toEqual({ ok: false, reason: 'number' });
  });
  it('parses triangular numbers in several spellings', () => {
    for (const text of ['(1, 2, 3)', '1;2;3', '1/2/3', '1 2 3', '1,2,3']) {
      expect(parseCellText(text, fuzzy, scale, EN)).toEqual({ ok: true, value: tfnCell(1, 2, 3) });
    }
    expect(parseCellText('(1,5; 2; 3)', fuzzy, scale, TR)).toEqual({
      ok: true,
      value: tfnCell(1.5, 2, 3),
    });
  });
  it('rejects l > m or m > u', () => {
    expect(parseCellText('(3, 2, 1)', fuzzy, scale, EN)).toEqual({ ok: false, reason: 'tfnOrder' });
    expect(parseCellText('(1, 3, 2)', fuzzy, scale, EN)).toEqual({ ok: false, reason: 'tfnOrder' });
  });
  it('finds terms by abbreviation, id or label', () => {
    for (const text of ['l', 'LOW', ' Low ']) {
      expect(parseCellText(text, fuzzy, scale, EN, label)).toEqual({
        ok: true,
        value: termCell('low'),
      });
    }
    expect(parseCellText('nope', fuzzy, scale, EN, label)).toEqual({ ok: false, reason: 'term' });
    expect(parseCellText('L', criterion('x', { numberType: 'tfn' }), undefined, EN)).toEqual({
      ok: false,
      reason: 'tfn',
    });
    expect(parseCellText('L', fuzzy, undefined, EN)).toEqual({ ok: false, reason: 'noScale' });
  });
});

describe('cell text and issues', () => {
  it('round-trips edit text', () => {
    for (const cell of [crispCell(0.1 + 0.2), tfnCell(1.5, 2, 3), termCell('high')]) {
      const text = cellEditText(cell, scale, TR);
      const parsed = parseCellText(text, cell.kind === 'crisp' ? crisp : fuzzy, scale, TR);
      expect(parsed).toEqual({ ok: true, value: cell });
    }
    expect(cellDisplayText(tfnCell(1.5, 2, 3), undefined, 'en-US', EN)).toBe('(1.5, 2, 3)');
    expect(cellDisplayText(undefined, undefined, 'en-US', EN)).toBe('');
  });
  it('flags invalid stored cells', () => {
    expect(cellIssue(tfnCell(3, 2, 1), fuzzy, scale)?.code).toBe('tfnOrder');
    expect(cellIssue(crispCell(1), fuzzy, scale)?.code).toBe('kindMismatch');
    expect(cellIssue(tfnCell(1, 2, 3), crisp, undefined)?.code).toBe('kindMismatch');
    expect(cellIssue(termCell('zzz'), fuzzy, scale)?.code).toBe('unknownTerm');
    expect(cellIssue(termCell('low'), fuzzy, undefined)?.code).toBe('noScale');
    expect(cellIssue(termCell('low'), fuzzy, scale)).toBeUndefined();
    expect(cellIssue(undefined, crisp, undefined)).toBeUndefined();
  });
});

describe('clipboard tables', () => {
  it('reads spreadsheet text', () => {
    expect(parseTable('1\t2\n3\t4\n')).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(parseTable('a\r\nb')).toEqual([['a'], ['b']]);
    expect(parseTable('"x\ty"\t"he said ""hi"""\n"two\nlines"\t')).toEqual([
      ['x\ty', 'he said "hi"'],
      ['two\nlines', ''],
    ]);
    expect(parseTable('')).toEqual([]);
  });
  it('writes what it reads', () => {
    const table = [
      ['a\tb', 'say "x"'],
      ['', 'plain\nline'],
    ];
    expect(parseTable(formatTable(table))).toEqual(table);
  });
});

function dataset(): Dataset {
  return {
    id: 'd1',
    name: 'D',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    criteria: [crisp, fuzzy],
    alternatives: [
      { id: 'a1', code: 'A1', name: 'One', description: '', group: '' },
      { id: 'a2', code: 'A2', name: 'Two', description: '', group: '' },
    ],
    matrices: [{ id: 'm1', name: 'Matrix', role: 'decision', cells: { a1: { c1: crispCell(1) } } }],
  };
}

function layoutOf(d: Dataset = dataset()): GridLayout {
  return {
    dataset: d,
    matrix: d.matrices[0] as GridLayout['matrix'],
    scales: [scale],
    rowIds: d.alternatives.map((a) => a.id),
    columnIds: [CODE_COLUMN, NAME_COLUMN, ...d.criteria.map((c) => c.id)],
  };
}

let counter = 0;
const context: ParseContext = { syntax: EN, label, newId: () => `new${(counter += 1)}` };

function run(plan: { command: { apply(m: never): unknown } | null }, d: Dataset) {
  const model = { datasets: [d], scales: [scale] };
  return (plan.command?.apply(model as never) ?? model) as typeof model;
}

describe('planPaste', () => {
  it('pastes a block and grows the grid with new alternatives and criteria', () => {
    const layout = layoutOf();
    const table = [
      ['1', '(1, 2, 3)', '7'],
      ['2', 'H', '8'],
      ['3', 'L', '9'],
    ];
    const plan = planPaste(layout, table, { row: 1, col: 2 }, null, context);
    expect(plan).toMatchObject({ applied: 9, skipped: 0, addedRows: 2, addedColumns: 1 });
    const next = run(plan, layout.dataset).datasets[0] as Dataset;
    expect(next.alternatives).toHaveLength(4);
    expect(next.criteria).toHaveLength(3);
    expect(next.criteria[2]?.numberType).toBe('crisp');
    const cells = next.matrices[0]?.cells ?? {};
    expect(cells['a2']).toEqual({ c1: crispCell(1), f1: tfnCell(1, 2, 3), new3: crispCell(7) });
    expect(cells['new1']).toEqual({ c1: crispCell(2), f1: termCell('high'), new3: crispCell(8) });
    expect(cells['new2']).toEqual({ c1: crispCell(3), f1: termCell('low'), new3: crispCell(9) });
    expect(cells['a1']).toEqual({ c1: crispCell(1) });
  });
  it('is one undo step and skips what does not fit', () => {
    const layout = layoutOf();
    const plan = planPaste(layout, [['x', '(3,2,1)']], { row: 0, col: 2 }, null, context);
    expect(plan).toMatchObject({ applied: 0, skipped: 2, command: null });
  });
  it('writes text columns and infers fuzzy types for new columns', () => {
    const layout = layoutOf();
    const plan = planPaste(layout, [['Alpha', '(1,2,3)']], { row: 0, col: 1 }, null, context);
    const next = run(plan, layout.dataset).datasets[0] as Dataset;
    expect(next.alternatives[0]?.name).toBe('Alpha');
    expect(next.criteria[1]?.id).toBe('f1');
    expect(plan.skipped).toBe(1);
    expect(next.matrices[0]?.cells['a1']).toEqual({ c1: crispCell(1) });
  });
  it('fills a selection with a single value', () => {
    const layout = layoutOf();
    const plan = planPaste(
      layout,
      [['5']],
      { row: 0, col: 2 },
      { row1: 0, row2: 1, col1: 2, col2: 2 },
      context,
    );
    const cells = run(plan, layout.dataset).datasets[0]?.matrices[0]?.cells;
    expect(cells?.['a1']?.['c1']).toEqual(crispCell(5));
    expect(cells?.['a2']?.['c1']).toEqual(crispCell(5));
  });
});

describe('planClear and planBulk', () => {
  const all = { row1: 0, row2: 1, col1: 2, col2: 3 };
  it('clears cells', () => {
    const layout = layoutOf();
    const cells = run(planClear(layout, all), layout.dataset).datasets[0]?.matrices[0]?.cells;
    expect(cells).toEqual({});
  });
  it('sets, adds and multiplies without inventing values', () => {
    const d = dataset();
    const layout = layoutOf({
      ...d,
      matrices: [
        {
          id: 'm1',
          name: 'M',
          role: 'decision',
          cells: { a1: { c1: crispCell(2), f1: tfnCell(1, 2, 3) }, a2: { f1: termCell('low') } },
        },
      ],
    });
    const double = planBulk(layout, all, { kind: 'multiply', amount: 2 }, context);
    expect(double.applied).toBe(2);
    const cells = run(double, layout.dataset).datasets[0]?.matrices[0]?.cells;
    expect(cells?.['a1']).toEqual({ c1: crispCell(4), f1: tfnCell(2, 4, 6) });
    expect(cells?.['a2']).toEqual({ f1: termCell('low') });
    const flip = planBulk(layout, all, { kind: 'multiply', amount: -1 }, context);
    expect(flip).toMatchObject({ applied: 1, skipped: 2 });
    const set = planBulk(layout, all, { kind: 'set', text: '9' }, context);
    expect(set).toMatchObject({ applied: 2, skipped: 2 });
  });
});

describe('RowCache and summarize', () => {
  it('reuses unchanged rows and counts issues', () => {
    const d = dataset();
    const cache = new RowCache();
    const cells = {
      a1: { c1: crispCell(1), f1: tfnCell(3, 2, 1) },
    };
    const scales = [scale];
    const first = cache.build(d, cells, scales);
    expect(first[0]?.issues).toBe(1);
    const second = cache.build(d, { ...cells, a2: { c1: crispCell(2) } }, scales);
    expect(second[0]).toBe(first[0]);
    expect(second[1]).not.toBe(first[1]);
    expect(summarize(second, d)).toEqual({ invalidCells: 1, emptyCells: 1, duplicateCodes: 0 });
  });
});
