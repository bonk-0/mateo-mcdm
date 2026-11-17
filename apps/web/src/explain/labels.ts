import type { CellRef, Trace, TraceAxisItem, TraceStep } from '@mateo/engine';
import { findStep } from '@mateo/engine';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage, useTextRef } from '../editor/messages';

export interface CellLabels {
  readonly step: string;
  readonly row: string;
  readonly column: string;
  /** Row and column as one name. A vector or a single value is named by what tells its cells apart. */
  readonly cell: string;
}

/** Names of a cell for people: the step, the row and the column in the UI language. */
export function useCellLabels(trace: Trace): (ref: CellRef) => CellLabels {
  const { t } = useTranslation('explain');
  const message = useMessage();
  const textOf = useTextRef();
  // Axis items by id, per step: looking them up with `find` made labelling every cell of a
  // table cost rows × columns × rows.
  const axes = useMemo(() => {
    const byStep = new Map<
      string,
      { rows: Map<string, TraceAxisItem>; columns: Map<string, TraceAxisItem> }
    >();
    for (const step of trace.steps) {
      if (byStep.has(step.id)) continue;
      byStep.set(step.id, {
        rows: new Map(step.output.rows.map((item) => [item.id, item])),
        columns: new Map(step.output.columns.map((item) => [item.id, item])),
      });
    }
    return byStep;
  }, [trace]);
  return useCallback(
    (ref) => {
      const step = findStep(trace, ref.step);
      const rowItem = axes.get(ref.step)?.rows.get(ref.row);
      const columnItem = axes.get(ref.step)?.columns.get(ref.column);
      const row = rowItem ? textOf(rowItem.label) : ref.row;
      const column = columnItem ? textOf(columnItem.label) : ref.column;
      const shape = step?.output.shape;
      const cell =
        shape === 'column-vector'
          ? row
          : shape === 'row-vector' || shape === 'scalar'
            ? column
            : t('stage.cellName', { row, column });
      return { step: step ? message(step.nameKey) : ref.step, row, column, cell };
    },
    [trace, axes, t, message, textOf],
  );
}

/** The first cell of a step: the default example when nothing else is chosen. */
export function firstCell(step: TraceStep): CellRef | null {
  const row = step.output.rows[0];
  const column = step.output.columns[0];
  return row && column ? { step: step.id, row: row.id, column: column.id } : null;
}
