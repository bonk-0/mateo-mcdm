import type { CellRef, TraceStep } from '@mateo/engine';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useTextRef } from '../editor/messages';
import { TfnGlyph, tfnOfValue } from '../tfn/TfnGlyph';
import { Value } from './Value';

/** How a cell is drawn: the colour of the formula term it stands for, and emphasis. */
export interface CellMark {
  /** Index of the term colour (0 to 4). */
  readonly tone?: number;
  /** The term of the cell is the one being pointed at. */
  readonly active?: boolean;
  /** The cell is the one being explained. */
  readonly selected?: boolean;
}

export interface TraceTableProps {
  readonly step: TraceStep;
  readonly caption: string;
  /** Ids of the rows and columns to show. Default: all of them. */
  readonly rows?: readonly string[];
  readonly columns?: readonly string[];
  readonly compact?: boolean;
  readonly mark?: (ref: CellRef) => CellMark | undefined;
  /** Makes every cell a button. Arrow keys move between the cells of the table. */
  readonly onCell?: (ref: CellRef, element: HTMLElement) => void;
  /** What activating a cell does, for assistive technology. */
  readonly cellDescription?: (ref: CellRef) => string;
  readonly onHover?: (ref: CellRef | null) => void;
  /** Receives the element that holds the value of each cell (for the cell flights). */
  readonly register?: (ref: CellRef, element: HTMLElement | null) => void;
  readonly testId?: string;
  /**
   * Rows drawn at first; a button draws more. A 500 × 50 step is 25 000 cells, and
   * drawing every step of a large analysis at once froze the page for seconds.
   */
  readonly rowLimit?: number;
  /** Whole numbers without decimals (a price of 20 000, not 20 000.0000). */
  readonly plainIntegers?: boolean;
}

const MOVES: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/**
 * The output table of one trace step. Shared by the results view and Explain mode, so a
 * number looks and behaves the same wherever it is shown.
 */
export function TraceTable({
  step,
  caption,
  rows,
  columns,
  compact = false,
  mark,
  onCell,
  cellDescription,
  onHover,
  register,
  testId,
  rowLimit,
  plainIntegers = false,
}: TraceTableProps) {
  const textOf = useTextRef();
  const { t } = useTranslation('explain');
  const { output } = step;
  const matchingRows = useMemo(
    () =>
      output.rows
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => rows === undefined || rows.includes(item.id)),
    [output.rows, rows],
  );
  const shownColumns = useMemo(
    () =>
      output.columns
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => columns === undefined || columns.includes(item.id)),
    [output.columns, columns],
  );
  const [limit, setLimit] = useState(rowLimit);
  const shownRows = limit === undefined ? matchingRows : matchingRows.slice(0, limit);
  // Fuzzy cells get a membership triangle; all of the table share one number line.
  const fuzzyEnd = useMemo(() => {
    let end = 0;
    for (const cells of output.cells) {
      for (const cell of cells) end = Math.max(end, tfnOfValue(cell.value)?.u ?? 0);
    }
    return end;
  }, [output.cells]);
  // One cell per table is in the tab order; the arrow keys move it (roving tabindex).
  const [cursor, setCursor] = useState<readonly [number, number]>([0, 0]);
  const cursorRow = Math.min(cursor[0], shownRows.length - 1);
  const cursorColumn = Math.min(cursor[1], shownColumns.length - 1);

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (!onCell || !(event.target instanceof HTMLElement)) return;
    const position = event.target.closest<HTMLElement>('[data-pos]')?.dataset['pos'];
    if (position === undefined) return;
    const [r, c] = position.split(':').map(Number) as [number, number];
    let next: [number, number] | undefined;
    const move = MOVES[event.key];
    if (move) next = [r + move[0], c + move[1]];
    else if (event.key === 'Home') next = [event.ctrlKey ? 0 : r, 0];
    else if (event.key === 'End') {
      next = [event.ctrlKey ? shownRows.length - 1 : r, shownColumns.length - 1];
    }
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    const row = Math.max(0, Math.min(shownRows.length - 1, next[0]));
    const column = Math.max(0, Math.min(shownColumns.length - 1, next[1]));
    setCursor([row, column]);
    event.currentTarget.querySelector<HTMLElement>(`[data-pos="${row}:${column}"]`)?.focus();
  };

  const pad = compact ? 'px-2 py-1' : 'px-3 py-1.5';
  const hidden = matchingRows.length - shownRows.length;
  const table = (
    <table
      className={`border-collapse ${compact ? 'text-xs' : 'text-sm'}`}
      data-testid={testId}
      onKeyDown={onKeyDown}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <td className={`border-b border-border ${pad}`} />
          {shownColumns.map(({ item }) => (
            <th
              key={item.id}
              scope="col"
              className={`border-b border-border ${pad} text-right font-medium whitespace-nowrap`}
            >
              {textOf(item.label)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shownRows.map(({ item: row, index: r }, shownRow) => (
          <tr key={row.id} className={row.kind === 'reference' ? 'bg-muted' : undefined}>
            <th
              scope="row"
              className={`border-b border-border ${pad} text-left font-medium whitespace-nowrap`}
            >
              {textOf(row.label)}
            </th>
            {shownColumns.map(({ item: column, index: c }, shownColumn) => {
              const cell = output.cells[r]?.[c];
              if (cell === undefined) return <td key={column.id} />;
              const ref: CellRef = { step: step.id, row: row.id, column: column.id };
              const state = mark?.(ref);
              const value = (
                <span
                  ref={register ? (element) => register(ref, element) : undefined}
                  className="inline-block"
                >
                  <Value value={cell.value} whole={plainIntegers} />
                  {fuzzyEnd > 0 && tfnOfValue(cell.value) && (
                    <span className="mt-0.5 block">
                      <TfnGlyph value={tfnOfValue(cell.value)!} to={fuzzyEnd} />
                    </span>
                  )}
                </span>
              );
              return (
                <td
                  key={column.id}
                  className="ex-cell border-b border-border p-0 text-right tabular-nums whitespace-nowrap"
                  data-tone={state?.tone}
                  data-active={state?.active ? '' : undefined}
                  data-selected={state?.selected ? '' : undefined}
                  onMouseEnter={onHover ? () => onHover(ref) : undefined}
                >
                  {onCell ? (
                    <button
                      type="button"
                      className={`block w-full cursor-pointer text-right ${pad}`}
                      tabIndex={shownRow === cursorRow && shownColumn === cursorColumn ? 0 : -1}
                      data-pos={`${shownRow}:${shownColumn}`}
                      data-testid={`cell-${step.id}-${row.id}-${column.id}`}
                      aria-description={cellDescription?.(ref)}
                      aria-current={state?.selected ? 'true' : undefined}
                      onFocus={() => setCursor([shownRow, shownColumn])}
                      onClick={(event) => onCell(ref, event.currentTarget)}
                    >
                      {value}
                    </button>
                  ) : (
                    <span className={`block ${pad}`}>{value}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
  if (hidden <= 0 || limit === undefined) return table;
  return (
    <div className="space-y-2">
      {table}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>{t('table.rowsShown', { shown: shownRows.length, total: matchingRows.length })}</span>
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setLimit(limit + (rowLimit ?? limit))}
          data-testid="trace-table-more"
        >
          {t('table.showMore', { count: Math.min(hidden, rowLimit ?? limit) })}
        </button>
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setLimit(matchingRows.length)}
          data-testid="trace-table-all"
        >
          {t('table.showAll')}
        </button>
      </div>
    </div>
  );
}
