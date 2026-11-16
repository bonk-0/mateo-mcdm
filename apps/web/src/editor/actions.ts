import {
  addAlternative,
  addCriterion,
  moveAlternative,
  moveCriterion,
  removeAlternatives,
  removeCriteria,
  setCells,
  updateAlternative,
  type CellValue,
  type ModelCommand,
  type ProjectSession,
} from '@mateo/project';
import { cellEditText, parseCellText, type ParseFailure } from './cellText';
import { formatTable, parseTable } from './clipboard';
import {
  CODE_COLUMN,
  NAME_COLUMN,
  makeAlternative,
  makeCriterion,
  planBulk,
  planClear,
  planPaste,
  type BulkOperation,
  type EditPlan,
  type GridLayout,
  type ParseContext,
  type Range,
} from './plan';
import type { EditResult } from './CellEditor';
import { REFUSED } from './CellEditor';

/** What the editor tells the user about; the page turns these into translated toasts. */
export type EditorNotice =
  | {
      readonly kind: 'pasted';
      readonly applied: number;
      readonly skipped: number;
      readonly addedRows: number;
      readonly addedColumns: number;
    }
  | { readonly kind: 'nothingPasted'; readonly skipped: number }
  | { readonly kind: 'rejected'; readonly reason: ParseFailure }
  | { readonly kind: 'bulk'; readonly applied: number; readonly skipped: number }
  | { readonly kind: 'removed'; readonly rows: number; readonly columns: number }
  | { readonly kind: 'noSelection' }
  | { readonly kind: 'noCriterionSelected' };

export interface ActionEnv {
  readonly session: ProjectSession;
  readonly datasetId: string;
  readonly getLayout: () => GridLayout | null;
  readonly getSelection: () => Range | null;
  readonly context: ParseContext;
  readonly notify: (notice: EditorNotice) => void;
}

function run(env: ActionEnv, command: ModelCommand): void {
  env.session.execute(command);
  // Every action is its own undo step, even when it repeats the previous one.
  env.session.history.sealMerge();
}

/** Ends a cell edit that came from the grid's editors or the panels. */
export function commitCell(
  env: ActionEnv,
  rowId: string,
  columnId: string,
  value: string | EditResult,
): void {
  const layout = env.getLayout();
  if (!layout || value === REFUSED) return;
  if (columnId === CODE_COLUMN || columnId === NAME_COLUMN) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (columnId === CODE_COLUMN && text === '') return;
    run(
      env,
      updateAlternative(
        env.datasetId,
        rowId,
        columnId === CODE_COLUMN ? { code: text } : { name: text },
      ),
    );
    return;
  }
  const criterion = layout.dataset.criteria.find((item) => item.id === columnId);
  if (!criterion) return;
  let cell: CellValue | null;
  if (typeof value === 'string') {
    const scale = layout.scales.find((item) => item.id === criterion.scaleId);
    const parsed = parseCellText(value, criterion, scale, env.context.syntax, env.context.label);
    if (!parsed.ok) {
      env.notify({ kind: 'rejected', reason: parsed.reason });
      return;
    }
    cell = parsed.value;
  } else {
    cell = value;
  }
  run(
    env,
    setCells(env.datasetId, layout.matrix.id, [
      { alternativeId: rowId, criterionId: columnId, value: cell },
    ]),
  );
}

/** The selection as tab-separated text, in the form spreadsheets accept. */
export function copyText(env: ActionEnv): string | null {
  const layout = env.getLayout();
  const range = env.getSelection();
  if (!layout || !range) return null;
  const alternatives = new Map(layout.dataset.alternatives.map((item) => [item.id, item]));
  const criteria = new Map(layout.dataset.criteria.map((item) => [item.id, item]));
  const rows: string[][] = [];
  for (let r = range.row1; r <= range.row2; r += 1) {
    const alternativeId = layout.rowIds[r];
    const alternative = alternativeId === undefined ? undefined : alternatives.get(alternativeId);
    if (!alternative) continue;
    const row: string[] = [];
    for (let c = range.col1; c <= range.col2; c += 1) {
      const columnId = layout.columnIds[c] ?? '';
      if (columnId === CODE_COLUMN) row.push(alternative.code);
      else if (columnId === NAME_COLUMN) row.push(alternative.name);
      else {
        const criterion = criteria.get(columnId);
        const scale = layout.scales.find((item) => item.id === criterion?.scaleId);
        row.push(
          cellEditText(layout.matrix.cells[alternative.id]?.[columnId], scale, env.context.syntax),
        );
      }
    }
    rows.push(row);
  }
  return formatTable(rows);
}

function apply(env: ActionEnv, plan: EditPlan): boolean {
  if (!plan.command) return false;
  run(env, plan.command);
  return true;
}

export function paste(env: ActionEnv, text: string): void {
  const layout = env.getLayout();
  if (!layout) return;
  // Without a selection the data goes to the first criterion cell, as in an empty sheet.
  const range = env.getSelection();
  const table = parseTable(text);
  const at = range ? { row: range.row1, col: range.col1 } : { row: 0, col: 2 };
  const plan = planPaste(layout, table, at, range, env.context);
  if (!apply(env, plan)) {
    env.notify({ kind: 'nothingPasted', skipped: plan.skipped });
    return;
  }
  env.notify({
    kind: 'pasted',
    applied: plan.applied,
    skipped: plan.skipped,
    addedRows: plan.addedRows,
    addedColumns: plan.addedColumns,
  });
}

export function clearSelection(env: ActionEnv): void {
  const layout = env.getLayout();
  const range = env.getSelection();
  if (!layout || !range) return;
  apply(env, planClear(layout, range));
}

export function bulkEdit(env: ActionEnv, operation: BulkOperation): void {
  const layout = env.getLayout();
  const range = env.getSelection();
  if (!layout || !range) {
    env.notify({ kind: 'noSelection' });
    return;
  }
  const plan = planBulk(layout, range, operation, env.context);
  apply(env, plan);
  env.notify({ kind: 'bulk', applied: plan.applied, skipped: plan.skipped });
}

/** Model index of the alternative in display row `row`. */
function alternativeIndex(layout: GridLayout, row: number): number {
  const id = layout.rowIds[row];
  return layout.dataset.alternatives.findIndex((item) => item.id === id);
}

export function insertAlternative(env: ActionEnv, where: 'above' | 'below'): void {
  const layout = env.getLayout();
  if (!layout) return;
  const range = env.getSelection();
  let index = layout.dataset.alternatives.length;
  if (range) {
    const at = alternativeIndex(layout, where === 'above' ? range.row1 : range.row2);
    if (at >= 0) index = where === 'above' ? at : at + 1;
  }
  run(
    env,
    addAlternative(env.datasetId, makeAlternative(layout.dataset, env.context.newId()), index),
  );
}

export function deleteAlternatives(env: ActionEnv): void {
  const layout = env.getLayout();
  const range = env.getSelection();
  if (!layout || !range) {
    env.notify({ kind: 'noSelection' });
    return;
  }
  const ids = layout.rowIds.slice(range.row1, range.row2 + 1);
  run(env, removeAlternatives(env.datasetId, ids));
  env.notify({ kind: 'removed', rows: ids.length, columns: 0 });
}

function criterionColumnIndex(layout: GridLayout, columnIndex: number): number {
  const id = layout.columnIds[columnIndex];
  return layout.dataset.criteria.findIndex((item) => item.id === id);
}

export function insertCriterion(env: ActionEnv, where: 'left' | 'right'): void {
  const layout = env.getLayout();
  if (!layout) return;
  const range = env.getSelection();
  let index = layout.dataset.criteria.length;
  if (range) {
    let at = -1;
    if (where === 'left') {
      for (let c = range.col1; c <= range.col2 && at < 0; c += 1)
        at = criterionColumnIndex(layout, c);
      if (at < 0 && range.col2 < 2) at = 0;
      if (at >= 0) index = at;
    } else {
      for (let c = range.col2; c >= range.col1 && at < 0; c -= 1)
        at = criterionColumnIndex(layout, c);
      if (at >= 0) index = at + 1;
      else if (range.col2 < 2) index = 0;
    }
  }
  const neighbour =
    layout.dataset.criteria[Math.max(0, Math.min(index, layout.dataset.criteria.length) - 1)];
  const criterion = makeCriterion(
    layout.dataset,
    env.context.newId(),
    neighbour?.numberType === 'tfn' ? 'tfn' : 'crisp',
  );
  run(env, addCriterion(env.datasetId, criterion, index));
}

export function deleteCriteria(env: ActionEnv): void {
  const layout = env.getLayout();
  const range = env.getSelection();
  if (!layout || !range) {
    env.notify({ kind: 'noSelection' });
    return;
  }
  const ids = layout.columnIds
    .slice(range.col1, range.col2 + 1)
    .filter((id) => layout.dataset.criteria.some((criterion) => criterion.id === id));
  if (ids.length === 0) {
    env.notify({ kind: 'noCriterionSelected' });
    return;
  }
  run(env, removeCriteria(env.datasetId, ids));
  env.notify({ kind: 'removed', rows: 0, columns: ids.length });
}

export function moveAlternativeTo(env: ActionEnv, id: string, toIndex: number): void {
  run(env, moveAlternative(env.datasetId, id, toIndex));
}

export function moveCriterionTo(env: ActionEnv, id: string, toIndex: number): void {
  run(env, moveCriterion(env.datasetId, id, toIndex));
}
