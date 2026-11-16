import type { Dataset, LinguisticScale, ModelCriterion } from '@mateo/project';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellClassParams,
  type CellMouseDownEvent,
  type CellMouseOverEvent,
  type ColDef,
  type ColumnMovedEvent,
  type GridApi,
  type GridReadyEvent,
  type RowDragEndEvent,
  type SuppressKeyboardEventParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { MatrixCellEditor, type CellEditorContext } from './CellEditor';
import {
  cellDisplayText,
  cellEditText,
  cellIssue,
  cellSortKey,
  type CellIssue,
  type TermLabel,
} from './cellText';
import { useMessage } from './messages';
import type { NumberSyntax } from './numbers';
import { CODE_COLUMN, NAME_COLUMN, type GridLayout, type Range } from './plan';
import type { GridRow } from './rows';

ModuleRegistry.registerModules([AllCommunityModule]);

const INDEX_COLUMN = '__index';
const SPECIAL = new Set([INDEX_COLUMN, CODE_COLUMN, NAME_COLUMN]);

/** The grid takes its colours from the design tokens, so light and dark mode just work. */
const gridTheme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'var(--border)',
  headerBackgroundColor: 'var(--muted)',
  headerTextColor: 'var(--foreground)',
  oddRowBackgroundColor: 'var(--surface)',
  accentColor: 'var(--primary)',
  fontFamily: 'inherit',
  fontSize: 13,
  rowHeight: 34,
  headerHeight: 40,
  spacing: 6,
});

export interface MatrixGridHandle {
  /** Alternatives and columns in the order the grid shows them right now. */
  getLayout(): GridLayout | null;
  getSelection(): Range | null;
  selectAll(): void;
  /** Selects and focuses a cell, for the panels and tests. */
  focusCell(row: number, columnId: string): void;
  clearView(): void;
}

export interface GridCommands {
  commitCell(rowId: string, columnId: string, value: unknown): void;
  clear(): void;
  moveAlternative(id: string, toIndex: number): void;
  moveCriterion(id: string, toIndex: number): void;
}

interface MatrixGridProps {
  readonly dataset: Dataset;
  readonly scales: readonly LinguisticScale[];
  readonly rows: readonly GridRow[];
  readonly search: string;
  readonly showFilters: boolean;
  readonly onlyIssues: boolean;
  readonly locale: string;
  readonly syntax: NumberSyntax;
  readonly label: TermLabel;
  readonly commands: GridCommands;
  readonly onSelectionChange: (range: Range | null) => void;
  readonly onViewChange: (active: boolean) => void;
  readonly onFocusRow: (alternativeId: string | null) => void;
}

function between(value: number, a: number, b: number): boolean {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}

/** Dragging and selecting state that must not trigger renders. */
interface Interaction {
  anchor: { row: number; col: number } | null;
  focus: { row: number; col: number } | null;
  dragging: boolean;
}

export const MatrixGrid = memo(
  forwardRef<MatrixGridHandle, MatrixGridProps>(function MatrixGrid(props, ref) {
    const { t } = useTranslation('matrix');
    const message = useMessage();
    const { dataset, scales, rows } = props;
    const apiRef = useRef<GridApi<GridRow> | null>(null);
    const interaction = useRef<Interaction>({ anchor: null, focus: null, dragging: false });
    const viewActive = useRef(false);
    const columnIndex = useRef<Map<string, number>>(new Map());
    const latest = useRef(props);
    latest.current = props;
    const [ready, setReady] = useState(false);

    const scaleOf = useCallback(
      (criterion: ModelCriterion) =>
        criterion.scaleId === null
          ? undefined
          : scales.find((item) => item.id === criterion.scaleId),
      [scales],
    );

    // --- Selection ------------------------------------------------------------------

    const dataColumns = useCallback((): string[] => {
      const api = apiRef.current;
      if (!api) return [];
      return api
        .getAllDisplayedColumns()
        .map((column) => column.getColId())
        .filter((id) => id !== INDEX_COLUMN);
    }, []);

    const rebuildColumnIndex = useCallback(() => {
      columnIndex.current = new Map(dataColumns().map((id, index) => [id, index]));
    }, [dataColumns]);

    const currentRange = useCallback((): Range | null => {
      const { anchor, focus } = interaction.current;
      if (!anchor || !focus) return null;
      return {
        row1: Math.min(anchor.row, focus.row),
        row2: Math.max(anchor.row, focus.row),
        col1: Math.min(anchor.col, focus.col),
        col2: Math.max(anchor.col, focus.col),
      };
    }, []);

    const select = useCallback(
      (anchor: { row: number; col: number }, focus: { row: number; col: number }) => {
        interaction.current.anchor = anchor;
        interaction.current.focus = focus;
        apiRef.current?.refreshCells({ suppressFlash: true });
        latest.current.onSelectionChange(currentRange());
        const alternativeId = apiRef.current?.getDisplayedRowAtIndex(focus.row)?.data?.id ?? null;
        latest.current.onFocusRow(alternativeId);
      },
      [currentRange],
    );

    const lastColumn = () => Math.max(0, dataColumns().length - 1);
    const lastRow = () => Math.max(0, (apiRef.current?.getDisplayedRowCount() ?? 1) - 1);

    const layout = useCallback((): GridLayout | null => {
      const api = apiRef.current;
      if (!api) return null;
      const rowIds: string[] = [];
      api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) rowIds.push(node.data.id);
      });
      const { dataset: current, scales: currentScales } = latest.current;
      const matrix = current.matrices[0];
      if (!matrix) return null;
      return { dataset: current, matrix, scales: currentScales, rowIds, columnIds: dataColumns() };
    }, [dataColumns]);

    useImperativeHandle(
      ref,
      () => ({
        getLayout: layout,
        getSelection: currentRange,
        selectAll: () => select({ row: 0, col: 0 }, { row: lastRow(), col: lastColumn() }),
        focusCell: (row, columnId) => {
          const col = columnIndex.current.get(columnId) ?? 0;
          select({ row, col }, { row, col });
          apiRef.current?.setFocusedCell(row, columnId);
        },
        clearView: () => {
          const api = apiRef.current;
          if (!api) return;
          api.setFilterModel(null);
          api.applyColumnState({ defaultState: { sort: null } });
        },
      }),
      // `select`, `lastRow` and `lastColumn` only read refs.
      [layout, currentRange],
    );

    const extend = useCallback(
      (target: { row: number; col: number }) => {
        const anchor = interaction.current.anchor ?? target;
        select(anchor, target);
      },
      [select],
    );

    // --- Columns --------------------------------------------------------------------

    const columns = useMemo<ColDef<GridRow>[]>(() => {
      const { syntax, locale, label } = props;
      const inSelection = (rowIndex: number | null, columnId: string): boolean => {
        const { anchor, focus } = interaction.current;
        if (!anchor || !focus || rowIndex === null) return false;
        const col = columnIndex.current.get(columnId);
        if (col === undefined) return false;
        return between(rowIndex, anchor.row, focus.row) && between(col, anchor.col, focus.col);
      };
      const selectedRule = (params: CellClassParams<GridRow>) =>
        inSelection(params.node.rowIndex, params.column.getColId());

      const textColumn = (id: string, header: string, width: number): ColDef<GridRow> => ({
        colId: id,
        headerName: header,
        width,
        pinned: 'left',
        lockPinned: true,
        editable: true,
        filter: 'agTextColumnFilter',
        valueGetter: (params) =>
          id === CODE_COLUMN ? params.data?.alternative.code : params.data?.alternative.name,
        valueSetter: (params) => {
          props.commands.commitCell(params.data.id, id, params.newValue);
          return false;
        },
        cellClassRules: { 'mt-selected': selectedRule },
        cellClass: 'mt-text',
      });

      const indexColumn: ColDef<GridRow> = {
        colId: INDEX_COLUMN,
        headerName: '#',
        headerTooltip: t('grid.index'),
        width: 64,
        pinned: 'left',
        lockPinned: true,
        lockPosition: 'left',
        sortable: false,
        filter: false,
        editable: false,
        suppressMovable: true,
        suppressNavigable: false,
        rowDrag: () => !viewActive.current,
        rowDragText: (params) =>
          (params.rowNode?.data as GridRow | undefined)?.alternative.name ?? '',
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        cellClass: 'mt-index',
        tooltipValueGetter: () => t('grid.dragRow'),
      };

      const criterionColumns = dataset.criteria.map((criterion): ColDef<GridRow> => {
        const scale = scaleOf(criterion);
        const cellOf = (row: GridRow | undefined) =>
          row && Object.hasOwn(row.cells, criterion.id) ? row.cells[criterion.id] : undefined;
        const issueText = (issue: CellIssue): string => {
          switch (issue.code) {
            case 'tfnOrder':
              return message('validation.tfn.invalid-order', {
                l: issue.l,
                m: issue.m,
                u: issue.u,
              });
            case 'kindMismatch':
              return t(`issue.kindMismatch.${issue.expected}`);
            case 'noScale':
              return t('issue.noScale');
            case 'unknownTerm':
              return t('issue.unknownTerm', { term: issue.term });
          }
        };
        const direction = criterion.direction === 'benefit' ? '↑' : '↓';
        const editorContext: CellEditorContext = { criterion, scale, syntax, label };
        const detail = [
          criterion.name,
          t(criterion.direction === 'benefit' ? 'grid.benefit' : 'grid.cost'),
          t(criterion.numberType === 'tfn' ? 'grid.fuzzy' : 'grid.crisp'),
          criterion.unit,
        ]
          .filter((part) => part !== '')
          .join(' · ');
        return {
          colId: criterion.id,
          headerName: `${criterion.code} ${direction}`,
          headerTooltip: detail,
          width: criterion.numberType === 'tfn' ? 150 : 110,
          editable: true,
          cellEditor: MatrixCellEditor,
          cellEditorParams: { matrixContext: editorContext },
          cellEditorPopup: true,
          singleClickEdit: false,
          filter: 'agNumberColumnFilter',
          filterValueGetter: (params) => cellSortKey(cellOf(params.data), scale) ?? null,
          comparator: (_a, _b, nodeA, nodeB) => {
            const a = cellSortKey(cellOf(nodeA.data), scale);
            const b = cellSortKey(cellOf(nodeB.data), scale);
            if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? -1 : 1;
            return a - b;
          },
          valueGetter: (params) => cellEditText(cellOf(params.data), scale, syntax),
          valueFormatter: (params) => cellDisplayText(cellOf(params.data), scale, locale, syntax),
          valueSetter: (params) => {
            props.commands.commitCell(params.data.id, criterion.id, params.newValue);
            return false;
          },
          tooltipValueGetter: (params) => {
            const issue = cellIssue(cellOf(params.data), criterion, scale);
            return issue ? issueText(issue) : undefined;
          },
          cellClass: (params) => {
            const cell = cellOf(params.data);
            return ['mt-cell', cell ? `mt-${cell.kind}` : 'mt-blank'];
          },
          cellClassRules: {
            'mt-selected': selectedRule,
            'mt-invalid': (params) =>
              cellIssue(cellOf(params.data), criterion, scale) !== undefined,
          },
          equals: () => false,
        };
      });
      return [
        indexColumn,
        textColumn(CODE_COLUMN, t('grid.code'), 90),
        textColumn(NAME_COLUMN, t('grid.name'), 170),
        ...criterionColumns,
      ];
      // The grid reads the selection through refs, so it is not a dependency.
    }, [dataset.criteria, scaleOf, props.syntax, props.locale, props.label, message, t]);

    // Column order or definitions changed: the selection must follow the new indexes.
    useEffect(() => {
      if (!ready) return;
      rebuildColumnIndex();
      apiRef.current?.refreshCells({ suppressFlash: true });
    }, [ready, columns, rebuildColumnIndex]);

    // --- Events ---------------------------------------------------------------------

    const cellOf = useCallback(
      (event: { rowIndex: number | null; column: { getColId(): string } }) => {
        if (event.rowIndex === null) return null;
        const col = columnIndex.current.get(event.column.getColId());
        return col === undefined ? null : { row: event.rowIndex, col };
      },
      [],
    );

    const onCellMouseDown = useCallback(
      (event: CellMouseDownEvent<GridRow>) => {
        const mouse = event.event as MouseEvent | null;
        if (!mouse || mouse.button !== 0 || event.rowIndex === null) return;
        if (event.column.getColId() === INDEX_COLUMN) {
          const target = { row: event.rowIndex, col: lastColumn() };
          const anchor =
            mouse.shiftKey && interaction.current.anchor
              ? { row: interaction.current.anchor.row, col: 0 }
              : { row: event.rowIndex, col: 0 };
          select(anchor, target);
          return;
        }
        const cell = cellOf(event);
        if (!cell) return;
        if (mouse.shiftKey) extend(cell);
        else {
          select(cell, cell);
          interaction.current.dragging = true;
          const stop = () => {
            interaction.current.dragging = false;
            window.removeEventListener('mouseup', stop);
          };
          window.addEventListener('mouseup', stop);
        }
      },
      [cellOf, extend, select],
    );

    const onCellMouseOver = useCallback(
      (event: CellMouseOverEvent<GridRow>) => {
        if (!interaction.current.dragging) return;
        const cell = cellOf(event);
        if (cell) extend(cell);
      },
      [cellOf, extend],
    );

    const onCellFocused = useCallback(
      (event: { rowIndex?: number | null; column?: unknown }) => {
        // Arrow keys move the focus; the selection follows it unless Shift extends it.
        if (event.rowIndex === null || event.rowIndex === undefined || !event.column) return;
        const id = (event.column as { getColId(): string }).getColId();
        const col = columnIndex.current.get(id);
        if (col === undefined) return;
        const { focus } = interaction.current;
        if (focus && focus.row === event.rowIndex && focus.col === col) return;
        if (interaction.current.dragging) return;
        select({ row: event.rowIndex, col }, { row: event.rowIndex, col });
      },
      [select],
    );

    const suppressKeyboardEvent = useCallback(
      (params: SuppressKeyboardEventParams<GridRow>): boolean => {
        const { event, editing } = params;
        if (editing) return false;
        const meta = event.ctrlKey || event.metaKey;
        const { anchor, focus } = interaction.current;
        if (meta && event.key.toLowerCase() === 'a') {
          event.preventDefault();
          select({ row: 0, col: 0 }, { row: lastRow(), col: lastColumn() });
          return true;
        }
        if (!meta && (event.key === 'Delete' || event.key === 'Backspace')) {
          latest.current.commands.clear();
          return true;
        }
        if (event.shiftKey && !meta && focus && anchor) {
          const delta: Record<string, [number, number]> = {
            ArrowUp: [-1, 0],
            ArrowDown: [1, 0],
            ArrowLeft: [0, -1],
            ArrowRight: [0, 1],
          };
          const step = delta[event.key];
          if (step) {
            const row = Math.max(0, Math.min(lastRow(), focus.row + step[0]));
            const col = Math.max(0, Math.min(lastColumn(), focus.col + step[1]));
            select(anchor, { row, col });
            apiRef.current?.ensureIndexVisible(row);
            const id = dataColumns()[col];
            if (id) apiRef.current?.ensureColumnVisible(id);
            return true;
          }
        }
        return false;
      },
      [dataColumns, select],
    );

    const onRowDragEnd = useCallback((event: RowDragEndEvent<GridRow>) => {
      if (viewActive.current || !event.node.data) return;
      const target = Math.max(0, event.overIndex);
      latest.current.commands.moveAlternative(event.node.data.id, target);
    }, []);

    const onColumnMoved = useCallback((event: ColumnMovedEvent<GridRow>) => {
      if (!event.finished || event.source !== 'uiColumnMoved' || !event.column) return;
      const id = event.column.getColId();
      if (SPECIAL.has(id)) return;
      const order = (apiRef.current?.getAllDisplayedColumns() ?? [])
        .map((column) => column.getColId())
        .filter((columnId) => !SPECIAL.has(columnId));
      const index = order.indexOf(id);
      if (index >= 0) latest.current.commands.moveCriterion(id, index);
    }, []);

    const reportView = useCallback(() => {
      const api = apiRef.current;
      if (!api) return;
      const sorted = api.getColumnState().some((column) => column.sort);
      const active = sorted || api.isAnyFilterPresent();
      viewActive.current = active;
      latest.current.onViewChange(active);
    }, []);

    const onGridReady = useCallback(
      (event: GridReadyEvent<GridRow>) => {
        apiRef.current = event.api;
        rebuildColumnIndex();
        setReady(true);
      },
      [rebuildColumnIndex],
    );

    // The selection survives data edits; only deleted rows or columns shrink it.
    useEffect(() => {
      if (!ready) return;
      const { anchor, focus } = interaction.current;
      if (!anchor || !focus) return;
      const row = Math.max(0, rows.length - 1);
      const col = lastColumn();
      if (anchor.row > row || focus.row > row || anchor.col > col || focus.col > col) {
        interaction.current.anchor = {
          row: Math.min(anchor.row, row),
          col: Math.min(anchor.col, col),
        };
        interaction.current.focus = {
          row: Math.min(focus.row, row),
          col: Math.min(focus.col, col),
        };
        latest.current.onSelectionChange(currentRange());
      }
    }, [rows.length, dataset.criteria.length]);

    const localeText = useMemo(() => {
      const keys = [
        'filterOoo',
        'contains',
        'notContains',
        'equals',
        'notEqual',
        'startsWith',
        'endsWith',
        'blank',
        'notBlank',
        'greaterThan',
        'greaterThanOrEqual',
        'lessThan',
        'lessThanOrEqual',
        'inRange',
        'andCondition',
        'orCondition',
        'applyFilter',
        'resetFilter',
        'clearFilter',
        'noRowsToShow',
        'pinColumn',
        'pinLeft',
        'pinRight',
        'noPin',
        'autosizeThisColumn',
        'autosizeAllColumns',
        'resetColumns',
        'columns',
        'sortAscending',
        'sortDescending',
        'filter',
      ];
      return Object.fromEntries(keys.map((key) => [key, t(`grid.locale.${key}` as never)]));
    }, [t]);

    const defaultColDef = useMemo<ColDef<GridRow>>(
      () => ({
        resizable: true,
        sortable: true,
        suppressHeaderMenuButton: false,
        floatingFilter: props.showFilters,
        suppressKeyboardEvent,
        suppressMovable: false,
      }),
      [props.showFilters, suppressKeyboardEvent],
    );

    const doesExternalFilterPass = useCallback(
      (node: { data?: GridRow }) => (node.data?.issues ?? 0) > 0,
      [],
    );

    // Filters and the issues-only toggle change what is shown.
    useEffect(() => {
      if (ready) apiRef.current?.onFilterChanged();
    }, [ready, props.onlyIssues]);

    // New rows or edits repaint the selection.
    useEffect(() => {
      if (ready) apiRef.current?.refreshCells({ suppressFlash: true });
    }, [ready, rows]);

    return (
      <div
        className="mt-grid h-full min-h-[24rem] w-full"
        role="region"
        aria-label={t('grid.label')}
        data-testid="matrix-grid"
      >
        <AgGridReact<GridRow>
          theme={gridTheme}
          rowData={rows as GridRow[]}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          getRowId={(params) => params.data.id}
          localeText={localeText}
          animateRows={false}
          rowDragManaged={false}
          suppressMoveWhenRowDragging
          rowBuffer={10}
          stopEditingWhenCellsLoseFocus
          enterNavigatesVertically
          enterNavigatesVerticallyAfterEdit
          invalidEditValueMode="block"
          tooltipShowDelay={400}
          tooltipInteraction
          quickFilterText={props.search}
          isExternalFilterPresent={() => props.onlyIssues}
          doesExternalFilterPass={doesExternalFilterPass}
          noRowsOverlayComponent={() => <span>{t('grid.empty')}</span>}
          onGridReady={onGridReady}
          onCellMouseDown={onCellMouseDown}
          onCellMouseOver={onCellMouseOver}
          onCellFocused={onCellFocused}
          onRowDragEnd={onRowDragEnd}
          onColumnMoved={onColumnMoved}
          onSortChanged={reportView}
          onFilterChanged={reportView}
          onDisplayedColumnsChanged={rebuildColumnIndex}
        />
      </div>
    );
  }),
);
