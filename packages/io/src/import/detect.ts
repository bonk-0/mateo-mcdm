/**
 * Structure detection: where the header, the alternatives, the criteria and the special
 * rows of a sheet are. Values are not read here (see `build.ts`).
 */
import type { CriterionDirection, ValidationCollector } from '@mateo/engine';
import { IMPORT_ISSUE_CODES as CODES } from './codes';
import type {
  CriterionLayout,
  ExcludedRowReason,
  IgnoredColumnReason,
  ImportDecision,
} from './decisions';
import type { TfnComponent } from './keywords';
import {
  componentWord,
  directionWord,
  isAggregateLabel,
  isDirectionLabel,
  isIdHeader,
  isIdealLabel,
  isRowNumberHeader,
  isUnitLabel,
  isWeightLabel,
  splitComponentHeader,
  splitDirectionHeader,
} from './keywords';
import { classifyNumberText } from './numbers';
import type { ColumnRef, ImportOverrides } from './overrides';
import type { SheetView } from './sheet-view';
import { columnLetters, fold } from './text';

/** How far down the header is looked for. */
const HEADER_SEARCH_ROWS = 30;

export interface LayoutCriterion {
  /** Header text without a direction suffix; `undefined` when the column has no header. */
  readonly name: string | undefined;
  /** Sheet columns; l, m, u order for `tfn-columns`. */
  readonly columns: readonly number[];
  readonly layout: Exclude<CriterionLayout, 'linguistic'> | 'linguistic';
  /** Direction from a header suffix such as `(min)`. */
  readonly headerDirection?: CriterionDirection;
}

export interface Layout {
  readonly headerRows: readonly number[];
  readonly idColumn: number | null;
  readonly criteria: readonly LayoutCriterion[];
  readonly dataRows: readonly number[];
  readonly directionRow: number | null;
  readonly weightsRow: number | null;
  readonly unitsRow: number | null;
}

interface Context {
  readonly view: SheetView;
  readonly overrides: ImportOverrides;
  readonly v: ValidationCollector;
  readonly decisions: ImportDecision[];
}

// --- Header ------------------------------------------------------------------------------

interface ComponentGroup {
  /** l, m, u columns. */
  readonly columns: readonly [number, number, number];
}

/**
 * Reads a row of TFN component labels (`l m u l m u`). Returns the complete groups and the
 * columns with a component label outside a complete group, or `undefined` when the row is
 * not such a row. One leading non-component cell (a label like `Alternatif`) is allowed.
 */
function componentRow(
  view: SheetView,
  row: number,
): { groups: ComponentGroup[]; stray: number[] } | undefined {
  let filled = view.filled(row);
  if (filled.length === 0) return undefined;
  const first = filled[0] as number;
  if (componentWord(view.text(row, first)) === undefined) filled = filled.slice(1);
  if (filled.length < 3) return undefined;
  const components = filled.map((column) => componentWord(view.text(row, column)));
  if (components.some((component) => component === undefined)) return undefined;
  const groups: ComponentGroup[] = [];
  const stray: number[] = [];
  let index = 0;
  while (index < filled.length) {
    const columns = filled.slice(index, index + 3);
    const found = new Map<TfnComponent, number>();
    columns.forEach((column, offset) => {
      const component = components[index + offset] as TfnComponent;
      if (!found.has(component)) found.set(component, column);
    });
    const contiguous =
      columns.length === 3 && (columns[2] as number) - (columns[0] as number) === 2;
    if (found.size === 3 && contiguous) {
      groups.push({
        columns: [found.get('l'), found.get('m'), found.get('u')] as [number, number, number],
      });
      index += 3;
    } else {
      stray.push(filled[index] as number);
      index += 1;
    }
  }
  return groups.length > 0 ? { groups, stray } : undefined;
}

/** Cells of a row read as benefit/cost directions, keyed by column. */
interface DirectionCells {
  readonly directions: Map<number, CriterionDirection>;
  /** Non-empty cells that are not directions (only when the row is labelled). */
  readonly invalid: number[];
  readonly labelled: boolean;
}

function directionCells(
  view: SheetView,
  row: number,
  labelColumn: number | undefined,
): DirectionCells {
  const label = labelColumn === undefined ? '' : view.text(row, labelColumn);
  const labelled = label !== '' && isDirectionLabel(label);
  const directions = new Map<number, CriterionDirection>();
  const invalid: number[] = [];
  for (const column of view.filled(row)) {
    if (column === labelColumn) continue;
    const text = view.text(row, column);
    const direction = directionWord(text, { letters: labelled });
    if (direction === undefined) invalid.push(column);
    else directions.set(column, direction);
  }
  return { directions, invalid, labelled };
}

function isDirectionRow(cells: DirectionCells): boolean {
  return cells.directions.size > 0 && (cells.invalid.length === 0 || cells.labelled);
}

/** The first filled cell of a row when it is a text that is not a direction word. */
function labelColumnOf(view: SheetView, row: number): number | undefined {
  const first = view.filled(row)[0];
  if (first === undefined || view.kind(row, first) !== 'text') return undefined;
  return directionWord(view.text(row, first)) === undefined ? first : undefined;
}

/** The label of a row: its alternative name, or its first text when that is empty. */
function rowLabel(view: SheetView, row: number, idColumn: number | null): string {
  const own = idColumn === null ? '' : view.text(row, idColumn);
  return own === '' ? firstText(view, row) : own;
}

function firstText(view: SheetView, row: number): string {
  const column = labelColumnOf(view, row);
  return column === undefined ? '' : view.text(row, column);
}

function nextFilledRow(view: SheetView, row: number): number | undefined {
  for (let next = row + 1; next < view.height; next += 1) {
    if (!view.isBlank(next)) return next;
  }
  return undefined;
}

function detectHeader(view: SheetView): number[] | null {
  let widest = 0;
  for (let row = 0; row < view.height; row += 1) widest = Math.max(widest, view.filled(row).length);
  const limit = Math.min(view.height, HEADER_SEARCH_ROWS);
  const hasValuesBelow = (row: number): boolean => {
    for (let below = row + 1; below < view.height; below += 1)
      if (view.hasValues(below)) return true;
    return false;
  };
  for (let row = 0; row < limit; row += 1) {
    const filled = view.filled(row);
    if (filled.length === 0) continue;
    if (componentRow(view, row) !== undefined) {
      return row > 0 && view.filled(row - 1).length > 0 ? [row - 1, row] : [row];
    }
    if (filled.length < 2) continue;
    const kinds = filled.map((column) => view.kind(row, column));
    if (kinds.some((kind) => kind !== 'text' && kind !== 'term' && kind !== 'placeholder'))
      continue;
    if (kinds.filter((kind) => kind === 'term').length * 2 > filled.length) continue;
    if (isDirectionRow(directionCells(view, row, labelColumnOf(view, row)))) {
      // Criteria may be named like directions ("Fayda", "Maliyet"): such a row is the header
      // when the next row is the direction row.
      const next = nextFilledRow(view, row);
      const nextIsDirection =
        next !== undefined && isDirectionRow(directionCells(view, next, labelColumnOf(view, next)));
      if (!nextIsDirection) continue;
    }
    const next = row + 1 < view.height ? componentRow(view, row + 1) : undefined;
    if (next === undefined && filled.length * 2 < widest) continue;
    if (!hasValuesBelow(row)) continue;
    return next === undefined ? [row] : [row, row + 1];
  }
  return null;
}

// --- Columns -------------------------------------------------------------------------------

function headerLabelOf(view: SheetView, headerRows: readonly number[], column: number): string {
  for (const row of [...headerRows].reverse()) {
    const text = view.label(row, column);
    if (text !== '' && componentWord(text) === undefined) return text;
  }
  return '';
}

function resolveColumn(
  ctx: Context,
  headerRows: readonly number[],
  ref: ColumnRef,
): number | undefined {
  const { view } = ctx;
  if ('column' in ref) return ref.column >= 0 && ref.column < view.width ? ref.column : undefined;
  const wanted = fold(ref.header);
  for (let column = 0; column < view.width; column += 1) {
    if (headerRows.some((row) => fold(view.text(row, column)) === wanted)) return column;
  }
  for (let column = 0; column < view.width; column += 1) {
    if (fold(headerLabelOf(view, headerRows, column)) === wanted) return column;
  }
  ctx.v.warning(CODES.profileColumnNotFound, { params: { header: ref.header } });
  return undefined;
}

function isRowNumberColumn(
  view: SheetView,
  rows: readonly number[],
  column: number,
  header: string,
): boolean {
  const values: number[] = [];
  for (const row of rows) {
    const cell = view.cell(row, column);
    if (cell === null) continue;
    if (cell.type === 'number' && !cell.date) values.push(cell.value);
    else if (cell.type === 'text' && classifyNumberText(cell.value) === 'neutral') {
      values.push(Number(cell.value.trim()));
    } else return false;
  }
  if (values.length === 0) return header !== '' && isRowNumberHeader(header);
  const sequence = values.every((value, index) => value === index + 1);
  return sequence || (header !== '' && isRowNumberHeader(header) && values.every(Number.isInteger));
}

function detectIdColumn(
  view: SheetView,
  headerRows: readonly number[],
  rows: readonly number[],
  columns: readonly number[],
): number | null {
  const candidates: { column: number; distinct: boolean; idHeader: boolean }[] = [];
  for (const column of columns) {
    const kinds = rows.map((row) => view.kind(row, column)).filter((kind) => kind !== 'empty');
    if (kinds.length === 0) continue;
    const texts = kinds.filter((kind) => kind === 'text').length;
    if (texts < 0.6 * kinds.length) continue;
    const names = rows.map((row) => fold(view.text(row, column))).filter((name) => name !== '');
    candidates.push({
      column,
      distinct: new Set(names).size === names.length,
      idHeader: isIdHeader(headerLabelOf(view, headerRows, column)),
    });
  }
  const chosen =
    candidates.find((candidate) => candidate.idHeader) ??
    candidates.find((candidate) => candidate.distinct) ??
    candidates[0];
  if (chosen !== undefined) return chosen.column;
  // Alternatives named by numbers (years, codes) under an id header.
  const numbered = columns.find((column) => isIdHeader(headerLabelOf(view, headerRows, column)));
  return numbered ?? null;
}

// --- Main ------------------------------------------------------------------------------

export function detectLayout(
  view: SheetView,
  overrides: ImportOverrides,
  v: ValidationCollector,
  decisions: ImportDecision[],
): Layout {
  const ctx: Context = { view, overrides, v, decisions };

  // Header.
  let headerRows: readonly number[];
  if (overrides.headerRows !== undefined) {
    headerRows = (overrides.headerRows ?? []).filter((row) => row >= 0 && row < view.height);
    decisions.push({
      kind: 'header',
      status: 'override',
      value: headerRows.length === 0 ? null : { rows: headerRows },
    });
  } else {
    const detected = detectHeader(view);
    headerRows = detected ?? [];
    decisions.push({
      kind: 'header',
      status: detected === null ? 'not-found' : 'detected',
      value: detected === null ? null : { rows: detected },
    });
    if (detected === null) v.warning(CODES.headerNotFound);
  }
  const headerEnd = headerRows.length === 0 ? -1 : Math.max(...headerRows);
  const headerTop = headerRows.length === 0 ? 0 : Math.min(...headerRows);

  // Body: rows below the header, or from the first row with values when there is none.
  let bodyStart = headerEnd + 1;
  if (headerRows.length === 0) {
    // Detected: skip titles down to the first values. Overridden: the user said every row
    // is data, so start at the first non-blank row.
    const explicit = overrides.headerRows !== undefined;
    while (
      bodyStart < view.height &&
      (explicit ? view.isBlank(bodyStart) : !view.hasValues(bodyStart))
    ) {
      bodyStart += 1;
    }
  }
  const body: number[] = [];
  for (let row = bodyStart; row < view.height; row += 1) body.push(row);
  const nonBlankBody = body.filter((row) => !view.isBlank(row));

  const usedColumns: number[] = [];
  for (let column = 0; column < view.width; column += 1) {
    const used =
      headerRows.some((row) => view.kind(row, column) !== 'empty') ||
      nonBlankBody.some((row) => view.kind(row, column) !== 'empty');
    if (used) usedColumns.push(column);
  }

  // Alternative id column.
  let idColumn: number | null;
  if (overrides.idColumn !== undefined) {
    idColumn =
      overrides.idColumn === null
        ? null
        : (resolveColumn(ctx, headerRows, overrides.idColumn) ?? null);
    decisions.push({
      kind: 'id-column',
      status: 'override',
      value:
        idColumn === null ? null : { column: idColumn, ...headerOf(view, headerRows, idColumn) },
    });
  } else {
    idColumn = detectIdColumn(view, headerRows, nonBlankBody, usedColumns);
    decisions.push({
      kind: 'id-column',
      status: idColumn === null ? 'not-found' : 'detected',
      value:
        idColumn === null ? null : { column: idColumn, ...headerOf(view, headerRows, idColumn) },
    });
  }

  // Ignored columns: overrides, then row numbers left of the alternatives.
  const ignored = new Map<number, IgnoredColumnReason>();
  for (const ref of overrides.ignoreColumns ?? []) {
    const column = resolveColumn(ctx, headerRows, ref);
    if (column !== undefined && column !== idColumn) ignored.set(column, 'override');
  }
  for (const column of usedColumns) {
    if (column === idColumn || ignored.has(column)) continue;
    if (idColumn !== null && column > idColumn) break;
    if (idColumn === null && column !== usedColumns[0]) break;
    if (
      isRowNumberColumn(
        view,
        dataCandidates(view, nonBlankBody, idColumn),
        column,
        headerLabelOf(view, headerRows, column),
      )
    ) {
      ignored.set(column, 'row-number');
    }
  }
  let candidateColumns = usedColumns.filter(
    (column) => column !== idColumn && !ignored.has(column),
  );

  // Rows above the header: titles, or a direction row.
  const excluded: { row: number; reason: ExcludedRowReason; label?: string }[] = [];
  let directionRow: number | null = null;
  for (let row = 0; row < headerTop; row += 1) {
    if (view.isBlank(row)) continue;
    const label = idColumn === null ? firstText(view, row) : view.text(row, idColumn);
    if (directionRow === null && overrides.directionRow === undefined) {
      const cells = directionCells(view, row, idColumn ?? labelColumnOf(view, row));
      const columns = [...cells.directions.keys()];
      if (isDirectionRow(cells) && columns.some((column) => candidateColumns.includes(column))) {
        directionRow = row;
        excluded.push({ row, reason: 'direction' });
        continue;
      }
    }
    excluded.push({ row, reason: 'title', ...(label === '' ? {} : { label }) });
  }

  // Rows below the header.
  let weightsRow: number | null = null;
  let unitsRow: number | null = null;
  const dataRows: number[] = [];
  for (const row of body) {
    if (overrides.directionRow !== undefined && overrides.directionRow === row) {
      excluded.push({ row, reason: 'direction' });
      continue;
    }
    if (view.isBlank(row)) {
      excluded.push({ row, reason: 'blank' });
      continue;
    }
    const label = rowLabel(view, row, idColumn);
    if (overrides.directionRow === undefined && directionRow === null) {
      const cells = directionCells(view, row, idColumn ?? labelColumnOf(view, row));
      if (isDirectionRow(cells)) {
        directionRow = row;
        excluded.push({ row, reason: 'direction', ...(label === '' ? {} : { label }) });
        continue;
      }
    }
    const reason: ExcludedRowReason | undefined =
      label === ''
        ? undefined
        : isWeightLabel(label) && weightsRow === null
          ? 'weights'
          : isUnitLabel(label) && unitsRow === null
            ? 'units'
            : isIdealLabel(label)
              ? 'ideal'
              : isAggregateLabel(label)
                ? 'aggregate'
                : undefined;
    if (reason !== undefined) {
      if (reason === 'weights') weightsRow = row;
      if (reason === 'units') unitsRow = row;
      excluded.push({ row, reason, label });
      continue;
    }
    dataRows.push(row);
  }
  if (overrides.directionRow !== undefined) directionRow = overrides.directionRow;

  // Footer: trailing rows without any cell in the criterion columns, below a blank row or
  // written like a note.
  const lastBlank = Math.max(
    -1,
    ...excluded.filter((item) => item.reason === 'blank').map((item) => item.row),
  );
  while (dataRows.length > 0) {
    const row = dataRows[dataRows.length - 1] as number;
    if (!view.isBlank(row, candidateColumns)) break;
    const label = rowLabel(view, row, idColumn);
    const lastValueRow = dataRows.findLast((r) => !view.isBlank(r, candidateColumns)) ?? -1;
    const note =
      label.length > 40 || label.includes(':') || (lastBlank > lastValueRow && lastBlank < row);
    if (!note) break;
    dataRows.pop();
    excluded.push({ row, reason: 'footer', ...(label === '' ? {} : { label }) });
  }

  // Criteria.
  const criteria: LayoutCriterion[] = [];
  const grouped = new Set<number>();
  const subHeader =
    headerRows.length === 2 ? componentRow(view, headerRows[1] as number) : undefined;
  const reportIncomplete = (columns: readonly number[]): void => {
    for (const column of columns) {
      grouped.add(column);
      ignored.set(column, 'incomplete-tfn');
    }
    v.error(CODES.tfnIncompleteGroup, {
      params: { columns: columns.map(columnLetters).join(', ') },
    });
  };
  if (subHeader !== undefined) {
    const top = headerRows[0] as number;
    for (const group of subHeader.groups) {
      if (!group.columns.every((column) => candidateColumns.includes(column))) continue;
      const name = group.columns
        .map((column) => view.label(top, column))
        .find((text) => text !== '');
      group.columns.forEach((column) => grouped.add(column));
      criteria.push(withDirection({ name, columns: group.columns, layout: 'tfn-columns' }));
    }
    const stray = subHeader.stray.filter((column) => candidateColumns.includes(column));
    if (stray.length > 0) reportIncomplete(stray);
  } else if (headerRows.length > 0) {
    const row = headerRows[headerRows.length - 1] as number;
    let run: { base: string; columns: number[]; components: TfnComponent[] } | undefined;
    const flush = (): void => {
      if (run === undefined) return;
      const unique = new Set(run.components);
      if (run.columns.length === 3 && unique.size === 3) {
        const at = (component: TfnComponent): number =>
          run?.columns[run.components.indexOf(component)] as number;
        run.columns.forEach((column) => grouped.add(column));
        criteria.push(
          withDirection({
            name: run.base,
            columns: [at('l'), at('m'), at('u')],
            layout: 'tfn-columns',
          }),
        );
      } else {
        reportIncomplete(run.columns);
      }
      run = undefined;
    };
    for (const column of candidateColumns) {
      const split = splitComponentHeader(view.text(row, column));
      const previous = run?.columns[run.columns.length - 1];
      if (
        split !== undefined &&
        run !== undefined &&
        fold(split.base) === fold(run.base) &&
        previous === column - 1 &&
        run.columns.length < 3
      ) {
        run.columns.push(column);
        run.components.push(split.component);
        continue;
      }
      flush();
      if (split !== undefined)
        run = { base: split.base, columns: [column], components: [split.component] };
    }
    flush();
  }
  candidateColumns = candidateColumns.filter((column) => !ignored.has(column));

  // Single columns: classify by their data cells.
  for (const column of candidateColumns) {
    if (grouped.has(column)) continue;
    const header = headerLabelOf(view, headerRows, column);
    const kinds = dataRows.map((row) => view.kind(row, column));
    const count = (kind: string): number => kinds.filter((item) => item === kind).length;
    const numbers = count('number') + count('numeric-text');
    const tfnTexts = count('tfn-text');
    const terms = count('term');
    const texts = count('text');
    let layout: LayoutCriterion['layout'] | undefined;
    if (tfnTexts > 0 && tfnTexts >= numbers && tfnTexts >= terms) layout = 'tfn-text';
    else if (terms > 0 && terms >= numbers) layout = 'linguistic';
    else if (numbers > 0) layout = 'crisp';
    else if (texts > 0) layout = undefined;
    else if (header !== '') layout = 'crisp';
    else continue;
    if (layout === undefined) {
      ignored.set(column, 'text');
      v.warning(CODES.columnTextIgnored, {
        params: { column: columnLetters(column), header },
      });
      continue;
    }
    criteria.push(
      withDirection({ name: header === '' ? undefined : header, columns: [column], layout }),
    );
  }
  criteria.sort((a, b) => (a.columns[0] as number) - (b.columns[0] as number));

  for (const [column, reason] of [...ignored].sort((a, b) => a[0] - b[0])) {
    decisions.push({
      kind: 'ignored-column',
      status: reason === 'override' ? 'override' : 'detected',
      value: { column, reason, ...headerOf(view, headerRows, column) },
    });
  }
  decisions.push({
    kind: 'direction-row',
    status:
      overrides.directionRow !== undefined
        ? 'override'
        : directionRow === null
          ? 'not-found'
          : 'detected',
    value: directionRow === null ? null : { row: directionRow },
  });
  for (const item of excluded.sort((a, b) => a.row - b.row)) {
    decisions.push({ kind: 'excluded-row', status: 'detected', value: item });
    if (item.reason === 'aggregate' || item.reason === 'ideal') {
      v.warning(CODES.rowExcluded, {
        params: { row: item.row + 1, label: item.label ?? '', reason: item.reason },
      });
    }
  }
  decisions.push({ kind: 'data-rows', status: 'detected', value: { rows: dataRows } });

  return { headerRows, idColumn, criteria, dataRows, directionRow, weightsRow, unitsRow };
}

/** Splits a direction suffix such as `(min)` off a criterion name. */
function withDirection(criterion: LayoutCriterion): LayoutCriterion {
  if (criterion.name === undefined) return criterion;
  const split = splitDirectionHeader(criterion.name);
  return split === undefined
    ? criterion
    : { ...criterion, name: split.base, headerDirection: split.direction };
}

function headerOf(
  view: SheetView,
  headerRows: readonly number[],
  column: number,
): { header?: string } {
  const header = headerLabelOf(view, headerRows, column);
  return header === '' ? {} : { header };
}

/** Body rows that could be alternatives, for the row-number test (labels not yet known). */
function dataCandidates(
  view: SheetView,
  rows: readonly number[],
  idColumn: number | null,
): number[] {
  return rows.filter((row) => {
    if (!view.hasValues(row)) return false;
    const label = rowLabel(view, row, idColumn);
    return !(
      isWeightLabel(label) ||
      isUnitLabel(label) ||
      isAggregateLabel(label) ||
      isIdealLabel(label) ||
      isDirectionLabel(label)
    );
  });
}
