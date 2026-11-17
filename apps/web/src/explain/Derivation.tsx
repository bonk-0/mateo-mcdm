import type { CellRef, DerivationNode, Trace, TraceFormula } from '@mateo/engine';
import { expandRange, findCell, getStep } from '@mateo/engine';
import type { CellExplanation } from '@mateo/explain';
import { cellKey, explainCell, substitutionLatex, symbolicLatex } from '@mateo/explain';
import { Button, Popover, PopoverAnchor, PopoverContent } from '@mateo/ui';
import { ArrowLeft, X } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage, useTextRef } from '../editor/messages';
import { useFormatters } from '../hooks/preferences';
import { Formula, markNumber, markTerm } from './Formula';
import { useCellLabels } from './labels';
import { Value } from './Value';

/** Values of a range listed before the rest is summarized. */
const RANGE_LIMIT = 12;

/** One colour index per bound term of a formula, in the order of the formula. */
export function termTones(explanation: CellExplanation): Map<string, number> {
  return new Map(explanation.bindings.map((binding, index) => [binding.term.name, index % 5]));
}

function TermSymbol({ formula, name }: { formula: TraceFormula | null; name: string | undefined }) {
  const term = formula?.terms.find((item) => item.name === name);
  if (!term) return null;
  return (
    <span className="rounded bg-muted px-1.5 py-0.5">
      <Formula latex={term.latex} />
    </span>
  );
}

interface NodeProps {
  readonly trace: Trace;
  readonly node: DerivationNode;
  readonly formula: TraceFormula | null;
  readonly onOpen: (ref: CellRef) => void;
}

function CellLink({
  trace,
  cell,
  onOpen,
}: {
  trace: Trace;
  cell: CellRef;
  onOpen: NodeProps['onOpen'];
}) {
  const { t } = useTranslation('explain');
  const labels = useCellLabels(trace)(cell);
  return (
    <button
      type="button"
      className="rounded text-left text-primary underline-offset-2 hover:underline"
      title={t('derivation.showCell', { cell: labels.cell, step: labels.step })}
      onClick={() => onOpen(cell)}
    >
      {t('derivation.location', { step: labels.step, cell: labels.cell })}
    </button>
  );
}

function Line({ children, value }: { children: ReactNode; value?: ReactNode }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {children}
      {value !== undefined && (
        <span translate="no" className="font-medium tabular-nums">
          = {value}
        </span>
      )}
    </span>
  );
}

/** One node of a derivation tree, with the nodes it was calculated from below it. */
function Node({ trace, node, formula, onOpen }: NodeProps) {
  const { t, i18n } = useTranslation('explain');
  const message = useMessage();
  const symbol = <TermSymbol formula={formula} name={node.term} />;
  switch (node.kind) {
    case 'operation': {
      const key = `operations.${node.operation}`;
      const name = i18n.exists(key, { ns: 'explain' })
        ? (t as (key: string) => string)(key)
        : t('operations.unknown', { id: node.operation });
      return (
        <li>
          <Line value={<Value value={node.value} />}>
            {symbol}
            <span>{name}</span>
          </Line>
          <ul className="mt-1 ml-1 space-y-1 border-l border-border pl-3">
            {node.operands.map((operand, index) => (
              <Node key={index} trace={trace} node={operand} formula={formula} onOpen={onOpen} />
            ))}
          </ul>
        </li>
      );
    }
    case 'ref':
      return (
        <li>
          <Line value={<Value value={node.value} />}>
            {symbol}
            <CellLink trace={trace} cell={node.ref} onOpen={onOpen} />
          </Line>
        </li>
      );
    case 'range': {
      const cells = expandRange(trace, node.ref);
      const listed = cells.slice(0, RANGE_LIMIT);
      return (
        <li>
          <Line>
            {symbol}
            <span>
              {t('derivation.node.range', {
                count: cells.length,
                step: message(getStep(trace, node.ref.step).nameKey),
              })}
            </span>
          </Line>
          <ul className="mt-1 ml-1 space-y-1 border-l border-border pl-3">
            {listed.map((cell) => (
              <li key={cellKey(cell)}>
                <Line value={<Value value={findCell(trace, cell)?.value ?? null} />}>
                  <CellLink trace={trace} cell={cell} onOpen={onOpen} />
                </Line>
              </li>
            ))}
            {cells.length > listed.length && (
              <li className="text-muted-foreground">
                {t('derivation.node.more', { count: cells.length - listed.length })}
              </li>
            )}
          </ul>
        </li>
      );
    }
    case 'input':
      return (
        <li>
          <Line value={<Value value={node.value} />}>
            {symbol}
            <span>{t('derivation.node.input')}</span>
          </Line>
        </li>
      );
    case 'constant':
      return (
        <li>
          <Line value={<Value value={node.value} />}>
            {symbol}
            <span>{t('derivation.node.constant')}</span>
          </Line>
        </li>
      );
    case 'parameter':
      return (
        <li>
          <Line value={<Value value={node.value} />}>
            {symbol}
            <span>{t('derivation.node.parameter', { name: node.name })}</span>
          </Line>
        </li>
      );
    case 'empty':
      return (
        <li>
          <Line>
            {symbol}
            <span>{t('derivation.node.empty')}</span>
          </Line>
        </li>
      );
  }
}

/**
 * How one cell was calculated: its formula, the formula with the numbers of the cell, and
 * the full derivation tree. Every part is read from the stored trace; nothing is
 * calculated again. Operand cells are links to their own derivation.
 */
export function DerivationView({
  trace,
  cell,
  onOpen,
}: {
  trace: Trace;
  cell: CellRef;
  onOpen: (ref: CellRef) => void;
}) {
  const { t } = useTranslation('explain');
  const message = useMessage();
  const textOf = useTextRef();
  const formatters = useFormatters();
  const labelsOf = useCellLabels(trace);
  const explanation = useMemo(() => explainCell(trace, cell), [trace, cell]);
  const { formula } = explanation;
  const labels = labelsOf(cell);
  const tones = useMemo(() => termTones(explanation), [explanation]);
  const substitution = useMemo(
    () =>
      substitutionLatex(explanation, {
        number: markNumber(formatters.value),
        wrapTerm: markTerm(tones),
      }),
    [explanation, formatters, tones],
  );
  const kind = explanation.cell.derivation.kind;

  return (
    <div className="space-y-3" data-testid="derivation">
      <div>
        <p className="text-xs text-muted-foreground">
          {t('derivation.location', { step: labels.step, cell: labels.cell })}
        </p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums" data-testid="derivation-value">
          <Value value={explanation.cell.value} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {message(explanation.step.explanationKey, explanation.step.explanationParams)}
        </p>
      </div>

      {formula && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t('derivation.formula')}
            {formula.condition && ` · ${textOf(formula.condition)}`}
          </p>
          <Formula display latex={symbolicLatex(formula, markTerm(tones))} />
          {substitution !== null && (
            <>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {t('derivation.withNumbers')}
              </p>
              <Formula display latex={substitution} />
            </>
          )}
        </div>
      )}

      {kind === 'input' ? (
        <p>{t('derivation.entered')}</p>
      ) : explanation.carriedFrom ? (
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span>{t('derivation.carried')}</span>
          <CellLink trace={trace} cell={explanation.carriedFrom} onOpen={onOpen} />
        </p>
      ) : (
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('derivation.calculation')}</p>
          <ul className="mt-1 space-y-1">
            <Node
              trace={trace}
              node={explanation.cell.derivation}
              formula={formula}
              onOpen={onOpen}
            />
          </ul>
        </div>
      )}
    </div>
  );
}

export interface DerivationTarget {
  readonly cell: CellRef;
  /** The element the popover points at, and that gets the focus back when it closes. */
  readonly anchor: HTMLElement;
}

/**
 * "How was this calculated?" for any cell of a trace. Following an operand shows that
 * cell's own derivation in the same popover; Back returns.
 */
export function DerivationPopover({
  trace,
  target,
  onClose,
}: {
  trace: Trace;
  target: DerivationTarget | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('explain');
  const [trail, setTrail] = useState<{ root: DerivationTarget | null; cells: CellRef[] }>({
    root: null,
    cells: [],
  });
  // The cell that opened the popover gets the focus back, also after `target` is cleared.
  const anchor = useRef<HTMLElement | null>(null);
  if (target) anchor.current = target.anchor;
  // A new target starts a new trail.
  if (trail.root !== target) setTrail({ root: target, cells: [] });
  const shown = trail.root === target ? (trail.cells.at(-1) ?? target?.cell) : target?.cell;

  return (
    <Popover open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {target && <PopoverAnchor virtualRef={{ current: target.anchor }} />}
      <PopoverContent
        aria-label={t('derivation.title')}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          anchor.current?.focus({ preventScroll: true });
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {trail.cells.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={t('derivation.back')}
                onClick={() => setTrail({ root: target, cells: trail.cells.slice(0, -1) })}
              >
                <ArrowLeft aria-hidden />
              </Button>
            )}
            <h3 className="text-sm font-semibold">{t('derivation.title')}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={t('derivation.close')}
            onClick={onClose}
          >
            <X aria-hidden />
          </Button>
        </div>
        {shown && (
          <DerivationView
            trace={trace}
            cell={shown}
            onOpen={(ref) => setTrail({ root: target, cells: [...trail.cells, ref] })}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
