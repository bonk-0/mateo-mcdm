import { deepFreeze } from '@mateo/engine';
import {
  crispCell,
  History,
  setCells,
  tfnCell,
  type Dataset,
  type ModelCommand,
  type ProjectModel,
  type ProjectSession,
} from '@mateo/project';
import { describe, expect, it } from 'vitest';
import {
  bulkEdit,
  clearSelection,
  commitCell,
  copyText,
  deleteAlternatives,
  deleteCriteria,
  insertAlternative,
  insertCriterion,
  paste,
  type ActionEnv,
  type EditorNotice,
} from './actions';
import { REFUSED } from './CellEditor';
import { CODE_COLUMN, NAME_COLUMN, type GridLayout, type Range } from './plan';
import { RowCache, summarize } from './rows';

function dataset(alternatives: number, criteria: number): Dataset {
  return {
    id: 'd1',
    name: 'D',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    criteria: Array.from({ length: criteria }, (_, c) => ({
      id: `c${c}`,
      code: `C${c + 1}`,
      name: `Criterion ${c + 1}`,
      description: '',
      direction: 'benefit' as const,
      unit: '',
      numberType: 'crisp',
      scaleId: null,
    })),
    alternatives: Array.from({ length: alternatives }, (_, a) => ({
      id: `a${a}`,
      code: `A${a + 1}`,
      name: `Alternative ${a + 1}`,
      description: '',
      group: '',
    })),
    matrices: [
      {
        id: 'm1',
        name: 'Matrix',
        role: 'decision',
        cells: Object.fromEntries(
          Array.from({ length: alternatives }, (_, a) => [
            `a${a}`,
            Object.fromEntries(
              Array.from({ length: criteria }, (_, c) => [
                `c${c}`,
                crispCell(a * criteria + c + 1),
              ]),
            ),
          ]),
        ),
      },
    ],
  };
}

function setup(d: Dataset, selection: Range | null) {
  const history = new History<ProjectModel>(deepFreeze({ datasets: [d], scales: [] }));
  const notices: EditorNotice[] = [];
  let ids = 0;
  const session = {
    history,
    execute: (command: ModelCommand) => history.execute(command),
    undo: () => history.undo(),
  } as unknown as ProjectSession;
  const layout = (): GridLayout => {
    const current = history.present.datasets[0] as Dataset;
    return {
      dataset: current,
      matrix: current.matrices[0] as GridLayout['matrix'],
      scales: [],
      rowIds: current.alternatives.map((item) => item.id),
      columnIds: [CODE_COLUMN, NAME_COLUMN, ...current.criteria.map((item) => item.id)],
    };
  };
  const env: ActionEnv = {
    session,
    datasetId: 'd1',
    getLayout: layout,
    getSelection: () => selection,
    context: {
      syntax: { decimal: '.', group: ',' },
      label: (term) => term.id,
      newId: () => `n${(ids += 1)}`,
    },
    notify: (notice) => notices.push(notice),
  };
  const current = () => history.present.datasets[0] as Dataset;
  return { env, history, notices, current };
}

describe('editor actions', () => {
  it('commits typed text and refuses what does not fit', () => {
    const { env, notices, current } = setup(dataset(2, 2), null);
    commitCell(env, 'a0', 'c1', '7,5');
    expect(current().matrices[0]?.cells['a0']?.['c1']).toEqual(crispCell(7.5));
    commitCell(env, 'a0', 'c1', 'abc');
    expect(notices).toEqual([{ kind: 'rejected', reason: 'number' }]);
    expect(current().matrices[0]?.cells['a0']?.['c1']).toEqual(crispCell(7.5));
    commitCell(env, 'a0', 'c1', REFUSED);
    commitCell(env, 'a0', 'c1', null);
    expect(current().matrices[0]?.cells['a0']?.['c1']).toBeUndefined();
    commitCell(env, 'a1', 'c0', tfnCell(1, 2, 3));
    expect(current().matrices[0]?.cells['a1']?.['c0']).toEqual(tfnCell(1, 2, 3));
  });

  it('edits the text columns and never leaves a code empty', () => {
    const { env, current } = setup(dataset(2, 1), null);
    commitCell(env, 'a0', NAME_COLUMN, ' Alpha ');
    commitCell(env, 'a0', CODE_COLUMN, 'X1');
    commitCell(env, 'a0', CODE_COLUMN, '  ');
    expect(current().alternatives[0]).toMatchObject({ name: 'Alpha', code: 'X1' });
  });

  it('makes every committed edit its own undo step', () => {
    const { env, history } = setup(dataset(1, 1), null);
    commitCell(env, 'a0', 'c0', '10');
    commitCell(env, 'a0', 'c0', '20');
    history.undo();
    expect(history.present.datasets[0]?.matrices[0]?.cells['a0']?.['c0']).toEqual(crispCell(10));
  });

  it('copies the selection as tab-separated text', () => {
    const { env } = setup(dataset(3, 3), { row1: 0, row2: 1, col1: 1, col2: 3 });
    expect(copyText(env)).toBe('Alternative 1\t1\t2\nAlternative 2\t4\t5');
    expect(copyText(setup(dataset(1, 1), null).env)).toBeNull();
  });

  it('pastes at the selection, or at the first criterion cell without one', () => {
    const withSelection = setup(dataset(3, 3), { row1: 1, row2: 1, col1: 3, col2: 3 });
    paste(withSelection.env, '100\t200\n300\t400\n');
    expect(withSelection.current().matrices[0]?.cells['a1']).toMatchObject({
      c1: crispCell(100),
      c2: crispCell(200),
    });
    expect(withSelection.current().matrices[0]?.cells['a2']).toMatchObject({
      c1: crispCell(300),
      c2: crispCell(400),
    });
    expect(withSelection.notices[0]).toMatchObject({ kind: 'pasted', applied: 4 });

    const empty = setup(dataset(0, 0), null);
    paste(empty.env, '1\t2\n3\t4');
    expect(empty.current().alternatives).toHaveLength(2);
    expect(empty.current().criteria).toHaveLength(2);
    expect(empty.notices[0]).toMatchObject({ kind: 'pasted', addedRows: 2, addedColumns: 2 });

    const nothing = setup(dataset(1, 1), null);
    paste(nothing.env, 'abc');
    expect(nothing.notices).toEqual([{ kind: 'nothingPasted', skipped: 1 }]);
  });

  it('clears and bulk edits the selection', () => {
    const range = { row1: 0, row2: 1, col1: 2, col2: 3 };
    const cleared = setup(dataset(2, 2), range);
    clearSelection(cleared.env);
    expect(cleared.current().matrices[0]?.cells).toEqual({});

    const bulk = setup(dataset(2, 2), range);
    bulkEdit(bulk.env, { kind: 'add', amount: 0.5 });
    expect(bulk.current().matrices[0]?.cells['a1']?.['c1']).toEqual(crispCell(4.5));
    expect(bulk.notices).toEqual([{ kind: 'bulk', applied: 4, skipped: 0 }]);
    bulkEdit(setup(dataset(1, 1), null).env, { kind: 'add', amount: 1 });
  });

  it('inserts and deletes rows and columns around the selection', () => {
    const rows = setup(dataset(3, 2), { row1: 1, row2: 1, col1: 2, col2: 2 });
    insertAlternative(rows.env, 'above');
    expect(rows.current().alternatives.map((a) => a.id)).toEqual(['a0', 'n1', 'a1', 'a2']);
    expect(rows.current().alternatives[1]?.code).toBe('A4');
    insertAlternative(rows.env, 'below');
    expect(rows.current().alternatives.map((a) => a.id)).toEqual(['a0', 'n1', 'n2', 'a1', 'a2']);
    deleteAlternatives(rows.env);
    expect(rows.current().alternatives.map((a) => a.id)).toEqual(['a0', 'n2', 'a1', 'a2']);
    expect(rows.notices.at(-1)).toEqual({ kind: 'removed', rows: 1, columns: 0 });

    const columns = setup(dataset(2, 3), { row1: 0, row2: 0, col1: 3, col2: 3 });
    insertCriterion(columns.env, 'left');
    expect(columns.current().criteria.map((c) => c.id)).toEqual(['c0', 'n1', 'c1', 'c2']);
    insertCriterion(columns.env, 'right');
    expect(columns.current().criteria).toHaveLength(5);
    deleteCriteria(columns.env);
    expect(columns.current().criteria).toHaveLength(4);

    const textOnly = setup(dataset(2, 2), { row1: 0, row2: 0, col1: 0, col2: 1 });
    deleteCriteria(textOnly.env);
    expect(textOnly.notices).toEqual([{ kind: 'noCriterionSelected' }]);
    insertCriterion(textOnly.env, 'left');
    expect(textOnly.current().criteria[0]?.id).toBe('n1');
    deleteAlternatives(setup(dataset(1, 1), null).env);
  });
});

describe('performance with a 500×50 matrix', () => {
  it('applies an edit, rebuilds the rows and summarises in under 100 ms', () => {
    const big = dataset(500, 50);
    const history = new History<ProjectModel>(deepFreeze({ datasets: [big], scales: [] }));
    const cache = new RowCache();
    cache.build(big, big.matrices[0]!.cells, []);
    const timings: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const start = performance.now();
      history.execute(
        setCells('d1', 'm1', [{ alternativeId: 'a250', criterionId: 'c25', value: crispCell(i) }]),
      );
      const current = history.present.datasets[0] as Dataset;
      const rows = cache.build(current, current.matrices[0]!.cells, history.present.scales);
      summarize(rows, current);
      timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    expect(timings[10]).toBeLessThan(100);
  });
});
