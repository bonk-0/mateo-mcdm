import type { CellRef, Trace, TraceStep } from '@mateo/engine';
import { findStep } from '@mateo/engine';
import { useCallback } from 'react';
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
  return useCallback(
    (ref) => {
      const step = findStep(trace, ref.step);
      const rowItem = step?.output.rows.find((item) => item.id === ref.row);
      const columnItem = step?.output.columns.find((item) => item.id === ref.column);
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
    [trace, t, message, textOf],
  );
}

/** The first cell of a step: the default example when nothing else is chosen. */
export function firstCell(step: TraceStep): CellRef | null {
  const row = step.output.rows[0];
  const column = step.output.columns[0];
  return row && column ? { step: step.id, row: row.id, column: column.id } : null;
}
