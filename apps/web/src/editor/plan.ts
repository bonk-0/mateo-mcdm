import {
  addAlternative,
  addCriterion,
  composeCommands,
  setCells,
  updateAlternative,
  type CellEdit,
  type CellValue,
  type Dataset,
  type LinguisticScale,
  type ModelAlternative,
  type ModelCommand,
  type ModelCriterion,
  type ModelMatrix,
} from '@mateo/project';
import { isOrdered, parseCellText, type TermLabel } from './cellText';
import type { NumberSyntax } from './numbers';

/** Ids of the two text columns of the grid. Criteria use their own id. */
export const CODE_COLUMN = '__code';
export const NAME_COLUMN = '__name';

export interface ParseContext {
  readonly syntax: NumberSyntax;
  readonly label: TermLabel;
  readonly newId: () => string;
}

export interface GridLayout {
  readonly dataset: Dataset;
  readonly matrix: ModelMatrix;
  readonly scales: readonly LinguisticScale[];
  /** Alternative ids in the order the grid shows them. */
  readonly rowIds: readonly string[];
  /** Data column ids (`CODE_COLUMN`, `NAME_COLUMN`, criterion ids) in display order. */
  readonly columnIds: readonly string[];
}

export interface Range {
  readonly row1: number;
  readonly row2: number;
  readonly col1: number;
  readonly col2: number;
}

export interface EditPlan {
  readonly command: ModelCommand | null;
  /** Cells that were set or emptied. */
  readonly applied: number;
  /** Cells that were refused because the text does not fit the criterion. */
  readonly skipped: number;
  readonly addedRows: number;
  readonly addedColumns: number;
}

const NOTHING: EditPlan = { command: null, applied: 0, skipped: 0, addedRows: 0, addedColumns: 0 };

function scaleOf(layout: GridLayout, criterion: ModelCriterion): LinguisticScale | undefined {
  return criterion.scaleId === null
    ? undefined
    : layout.scales.find((scale) => scale.id === criterion.scaleId);
}

export function nextCode(prefix: string, taken: readonly string[]): string {
  const used = new Set(taken.map((code) => code.toLowerCase()));
  let n = taken.length + 1;
  while (used.has(`${prefix}${n}`.toLowerCase())) n += 1;
  return `${prefix}${n}`;
}

export function makeAlternative(dataset: Dataset, id: string): ModelAlternative {
  const code = nextCode(
    'A',
    dataset.alternatives.map((item) => item.code),
  );
  return { id, code, name: code, description: '', group: '' };
}

export function makeCriterion(
  dataset: Dataset,
  id: string,
  numberType: 'crisp' | 'tfn' = 'crisp',
): ModelCriterion {
  const code = nextCode(
    'C',
    dataset.criteria.map((item) => item.code),
  );
  return {
    id,
    code,
    name: code,
    description: '',
    direction: 'benefit',
    unit: '',
    numberType,
    scaleId: null,
  };
}

function columnNumberType(texts: readonly string[], context: ParseContext): 'crisp' | 'tfn' {
  const filled = texts.filter((text) => text.trim() !== '');
  const crisp: ModelCriterion = {
    id: 'probe',
    code: 'probe',
    name: 'probe',
    description: '',
    direction: 'benefit',
    unit: '',
    numberType: 'crisp',
    scaleId: null,
  };
  const fuzzy: ModelCriterion = { ...crisp, numberType: 'tfn' };
  const allParse = (criterion: ModelCriterion) =>
    filled.every(
      (text) => parseCellText(text, criterion, undefined, context.syntax, context.label).ok,
    );
  if (filled.length === 0 || allParse(crisp)) return 'crisp';
  return allParse(fuzzy) ? 'tfn' : 'crisp';
}

/**
 * Plans a paste of `table` with its top-left cell at (`row`, `col`) of the grid. A paste
 * that runs past the last row or column adds alternatives and criteria, as a spreadsheet
 * would grow. A single value pasted onto a larger selection fills the selection.
 * Everything is one undo step.
 */
export function planPaste(
  layout: GridLayout,
  table: readonly (readonly string[])[],
  at: { readonly row: number; readonly col: number },
  selection: Range | null,
  context: ParseContext,
): EditPlan {
  const height = table.length;
  const width = Math.max(0, ...table.map((row) => row.length));
  if (height === 0 || width === 0) return NOTHING;

  let source = table;
  let rows = height;
  let columns = width;
  if (height === 1 && width === 1 && selection) {
    rows = selection.row2 - selection.row1 + 1;
    columns = selection.col2 - selection.col1 + 1;
    source = Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => table[0]?.[0] ?? ''),
    );
    at = { row: selection.row1, col: selection.col1 };
  }

  const dataset = layout.dataset;
  const commands: ModelCommand[] = [];
  const rowIds = [...layout.rowIds];
  const columnIds = [...layout.columnIds];
  const criteria = new Map(dataset.criteria.map((criterion) => [criterion.id, criterion]));
  let addedRows = 0;
  let addedColumns = 0;

  // Grow the grid: new alternatives go to the end, new criteria after the last criterion.
  const grownAlternatives: ModelAlternative[] = [];
  while (at.row + rows > rowIds.length) {
    const alternative = makeAlternative(
      { ...dataset, alternatives: [...dataset.alternatives, ...grownAlternatives] },
      context.newId(),
    );
    grownAlternatives.push(alternative);
    rowIds.push(alternative.id);
    addedRows += 1;
  }
  const grownCriteria: ModelCriterion[] = [];
  while (at.col + columns > columnIds.length) {
    const newColumn = columnIds.length;
    const texts = source.map((row) => row[newColumn - at.col] ?? '');
    const criterion = makeCriterion(
      { ...dataset, criteria: [...dataset.criteria, ...grownCriteria] },
      context.newId(),
      columnNumberType(texts, context),
    );
    grownCriteria.push(criterion);
    criteria.set(criterion.id, criterion);
    columnIds.push(criterion.id);
    addedColumns += 1;
  }
  for (const criterion of grownCriteria) commands.push(addCriterion(dataset.id, criterion));
  for (const alternative of grownAlternatives) {
    commands.push(addAlternative(dataset.id, alternative));
  }

  const edits: CellEdit[] = [];
  const textPatches = new Map<string, { code?: string; name?: string }>();
  let applied = 0;
  let skipped = 0;
  for (let r = 0; r < rows; r += 1) {
    const alternativeId = rowIds[at.row + r] as string;
    for (let c = 0; c < columns; c += 1) {
      const text = source[r]?.[c] ?? '';
      const columnId = columnIds[at.col + c] as string;
      if (columnId === CODE_COLUMN || columnId === NAME_COLUMN) {
        const patch = textPatches.get(alternativeId) ?? {};
        patch[columnId === CODE_COLUMN ? 'code' : 'name'] = text.trim();
        textPatches.set(alternativeId, patch);
        applied += 1;
        continue;
      }
      const criterion = criteria.get(columnId);
      if (!criterion) continue;
      const parsed = parseCellText(
        text,
        criterion,
        scaleOf(layout, criterion),
        context.syntax,
        context.label,
      );
      if (!parsed.ok) {
        skipped += 1;
        continue;
      }
      edits.push({ alternativeId, criterionId: criterion.id, value: parsed.value });
      applied += 1;
    }
  }
  for (const [alternativeId, patch] of textPatches) {
    commands.push(updateAlternative(dataset.id, alternativeId, patch));
  }
  if (edits.length > 0) commands.push(setCells(dataset.id, layout.matrix.id, edits));
  if (commands.length === 0) return { ...NOTHING, skipped };
  const command =
    commands.length === 1
      ? (commands[0] as ModelCommand)
      : composeCommands(commands, { type: 'cells.paste', labelKey: 'matrix:commands.paste' });
  return { command, applied, skipped, addedRows, addedColumns };
}

/** The cells of `range` as editable (alternative, criterion) pairs. */
export function criterionCellsOf(
  layout: GridLayout,
  range: Range,
): { alternativeId: string; criterion: ModelCriterion }[] {
  const criteria = new Map(layout.dataset.criteria.map((criterion) => [criterion.id, criterion]));
  const cells: { alternativeId: string; criterion: ModelCriterion }[] = [];
  for (let r = range.row1; r <= range.row2; r += 1) {
    const alternativeId = layout.rowIds[r];
    if (alternativeId === undefined) continue;
    for (let c = range.col1; c <= range.col2; c += 1) {
      const criterion = criteria.get(layout.columnIds[c] ?? '');
      if (criterion) cells.push({ alternativeId, criterion });
    }
  }
  return cells;
}

export function planClear(layout: GridLayout, range: Range): EditPlan {
  const edits: CellEdit[] = criterionCellsOf(layout, range).map(({ alternativeId, criterion }) => ({
    alternativeId,
    criterionId: criterion.id,
    value: null,
  }));
  if (edits.length === 0) return NOTHING;
  return {
    ...NOTHING,
    applied: edits.length,
    command: setCells(layout.dataset.id, layout.matrix.id, edits),
  };
}

export type BulkOperation =
  | { readonly kind: 'set'; readonly text: string }
  | { readonly kind: 'add'; readonly amount: number }
  | { readonly kind: 'multiply'; readonly amount: number };

function transform(
  cell: CellValue | undefined,
  operation: Exclude<BulkOperation, { kind: 'set' }>,
): CellValue | undefined {
  if (!cell || cell.kind === 'term') return undefined;
  const apply = (n: number) =>
    operation.kind === 'add' ? n + operation.amount : n * operation.amount;
  if (cell.kind === 'crisp') {
    const value = apply(cell.value);
    return Number.isFinite(value) ? { kind: 'crisp', value } : undefined;
  }
  const value = { l: apply(cell.value.l), m: apply(cell.value.m), u: apply(cell.value.u) };
  return Object.values(value).every(Number.isFinite) && isOrdered(value)
    ? { kind: 'tfn', value }
    : undefined;
}

/** Applies one operation to every cell of the selection that it fits. */
export function planBulk(
  layout: GridLayout,
  range: Range,
  operation: BulkOperation,
  context: ParseContext,
): EditPlan {
  const edits: CellEdit[] = [];
  let skipped = 0;
  for (const { alternativeId, criterion } of criterionCellsOf(layout, range)) {
    let value: CellValue | null | undefined;
    if (operation.kind === 'set') {
      const parsed = parseCellText(
        operation.text,
        criterion,
        scaleOf(layout, criterion),
        context.syntax,
        context.label,
      );
      value = parsed.ok ? parsed.value : undefined;
    } else {
      const current = layout.matrix.cells[alternativeId]?.[criterion.id];
      value = current ? (transform(current, operation) ?? undefined) : undefined;
      if (!current) continue; // empty cells stay empty: nothing is invented
    }
    if (value === undefined) skipped += 1;
    else edits.push({ alternativeId, criterionId: criterion.id, value });
  }
  if (edits.length === 0) return { ...NOTHING, skipped };
  return {
    ...NOTHING,
    applied: edits.length,
    skipped,
    command: setCells(layout.dataset.id, layout.matrix.id, edits),
  };
}
