import type { CellRef, Trace, TraceStep, TraceValue } from '@mateo/engine';
import { Badge } from '@mateo/ui';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage } from '../editor/messages';
import { DerivationPopover, type DerivationTarget } from '../explain/Derivation';
import { useCellLabels } from '../explain/labels';
import { TraceTable } from '../explain/TraceTable';
import type { Formatters } from '../hooks/preferences';

/** A value of a trace cell as text: numbers at display precision, fuzzy numbers as (l, m, u). */
export function formatTraceValue(value: TraceValue, formatters: Formatters): string {
  if (value === null) return '–';
  if (typeof value === 'number') return formatters.value(value);
  if (typeof value === 'string') return value;
  const parts = Object.values(value.components).map((component) => formatters.value(component));
  return `(${parts.join(', ')})`;
}

function StepTable({
  step,
  onCell,
  cellDescription,
}: {
  step: TraceStep;
  onCell: (ref: CellRef, element: HTMLElement) => void;
  cellDescription: (ref: CellRef) => string;
}) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  const params = step.explanationParams;
  return (
    <details
      open={step.role !== 'input'}
      className="rounded-lg border border-border bg-surface"
      data-testid={`trace-step-${step.id}`}
    >
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3 text-sm font-medium">
        <span className="text-muted-foreground tabular-nums">{step.index + 1}.</span>
        <span>{message(step.nameKey)}</span>
        <Badge variant="outline">{t(`trace.role.${step.role}`)}</Badge>
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          {message(step.explanationKey, params)}
        </p>
        <div className="overflow-x-auto">
          <TraceTable
            step={step}
            caption={message(step.nameKey)}
            onCell={onCell}
            cellDescription={cellDescription}
          />
        </div>
      </div>
    </details>
  );
}

/**
 * Every step of a method's trace as a table, in the order the method calculated them.
 * Every cell answers "How was this calculated?" from the stored trace.
 */
export function TraceTables({ trace }: { trace: Trace }) {
  const { t } = useTranslation('explain');
  const labelsOf = useCellLabels(trace);
  const [derivation, setDerivation] = useState<DerivationTarget | null>(null);
  const onCell = useCallback(
    (cell: CellRef, anchor: HTMLElement) => setDerivation({ cell, anchor }),
    [],
  );
  const cellDescription = useCallback(
    (ref: CellRef) => t('derivation.open', { cell: labelsOf(ref).cell }),
    [t, labelsOf],
  );
  return (
    <div className="space-y-3">
      {trace.steps.map((step) => (
        <StepTable key={step.id} step={step} onCell={onCell} cellDescription={cellDescription} />
      ))}
      <DerivationPopover trace={trace} target={derivation} onClose={() => setDerivation(null)} />
    </div>
  );
}
