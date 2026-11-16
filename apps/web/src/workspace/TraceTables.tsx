import type { Trace, TraceStep, TraceValue } from '@mateo/engine';
import { Badge } from '@mateo/ui';
import { useTranslation } from 'react-i18next';
import { useFormatters, type Formatters } from '../hooks/preferences';
import { useMessage, useTextRef } from '../editor/messages';

/** A value of a trace cell as text: numbers at display precision, fuzzy numbers as (l, m, u). */
export function formatTraceValue(value: TraceValue, formatters: Formatters): string {
  if (value === null) return '–';
  if (typeof value === 'number') return formatters.value(value);
  if (typeof value === 'string') return value;
  const parts = Object.values(value.components).map((component) => formatters.value(component));
  return `(${parts.join(', ')})`;
}

function StepTable({ step }: { step: TraceStep }) {
  const { t } = useTranslation('workspace');
  const message = useMessage();
  const textOf = useTextRef();
  const formatters = useFormatters();
  const { output } = step;
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
          <table className="min-w-full border-collapse text-sm">
            <caption className="sr-only">{message(step.nameKey)}</caption>
            <thead>
              <tr>
                <td className="border-b border-border px-3 py-1.5" />
                {output.columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className="border-b border-border px-3 py-1.5 text-right font-medium whitespace-nowrap"
                  >
                    {textOf(column.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {output.rows.map((row, r) => (
                <tr key={row.id} className={row.kind === 'reference' ? 'bg-muted' : undefined}>
                  <th
                    scope="row"
                    className="border-b border-border px-3 py-1.5 text-left font-medium whitespace-nowrap"
                  >
                    {textOf(row.label)}
                  </th>
                  {output.cells[r]!.map((cell, c) => (
                    <td
                      key={output.columns[c]!.id}
                      className="border-b border-border px-3 py-1.5 text-right tabular-nums whitespace-nowrap"
                    >
                      {formatTraceValue(cell.value, formatters)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

/** Every step of a method's trace as a table, in the order the method calculated them. */
export function TraceTables({ trace }: { trace: Trace }) {
  return (
    <div className="space-y-3">
      {trace.steps.map((step) => (
        <StepTable key={step.id} step={step} />
      ))}
    </div>
  );
}
