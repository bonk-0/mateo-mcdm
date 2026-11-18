import type { StoredAnalysis } from '@mateo/project';
import { cn } from '@mateo/ui';
import { ChevronRight } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ExplainPanel, explanationOf } from '../explain/ExplainPanel';
import { TraceTables } from '../workspace/TraceTables';

/** A section that opens on request. Its content is only built once it is open. */
export function Disclosure({
  title,
  hint,
  children,
  defaultOpen = false,
  testId,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="rounded-lg border border-border bg-surface" data-testid={testId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium hover:bg-muted"
      >
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
          aria-hidden
        />
        <span className="flex-1">{title}</span>
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </button>
      {open && (
        <div id={id} className="border-t border-border p-4">
          {children}
        </div>
      )}
    </section>
  );
}

export interface BarRow {
  readonly id: string;
  readonly label: string;
  /** Length of the bar, 0 to 1. */
  readonly share: number;
  /** The number printed at the end of the bar. */
  readonly text: string;
  readonly prefix?: string;
  readonly highlight?: boolean;
}

/** Horizontal bars with their numbers: weights, or the ranking. */
export function Bars({
  rows,
  label,
  testId,
}: {
  rows: readonly BarRow[];
  label: string;
  testId?: string;
}) {
  return (
    <ul className="flex flex-col gap-2.5" aria-label={label} data-testid={testId}>
      {rows.map((row) => (
        <li
          key={row.id}
          className="grid grid-cols-[minmax(6rem,14rem)_1fr_4.5rem] items-center gap-3 text-sm"
        >
          <span className={cn('truncate', row.highlight && 'font-semibold')} title={row.label}>
            {row.prefix && (
              <span className="mr-1.5 text-muted-foreground tabular-nums">{row.prefix}</span>
            )}
            {row.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span
              className={cn(
                'block h-full rounded-full transition-[width] duration-(--duration-slow)',
                row.highlight ? 'bg-success' : 'bg-primary',
              )}
              style={{ width: `${Math.max(0, Math.min(1, row.share)) * 100}%` }}
            />
          </span>
          <span className="text-right text-muted-foreground tabular-nums">{row.text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * "How was this calculated?": the method's lesson on the user's own data, following the
 * winner and the heaviest criterion, and every table of the calculation behind a fold.
 */
export function HowCalculated({ analysis }: { analysis: StoredAnalysis }) {
  const { t } = useTranslation('flow');
  const { trace } = analysis.record;
  const explanation = useMemo(() => explanationOf(trace), [trace]);
  return (
    <div className="flex flex-col gap-4">
      {explanation && <ExplainPanel trace={trace} explanation={explanation} followResult />}
      <Disclosure title={t('how.tables')} testId="trace-tables">
        <TraceTables trace={trace} />
      </Disclosure>
    </div>
  );
}
