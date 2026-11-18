import type { CellRef, Trace, TraceValue } from '@mateo/engine';
import { findCell, getStep } from '@mateo/engine';
import type {
  CellExplanation,
  ExplainSequence,
  Lesson,
  LessonFocus,
  LessonStep,
} from '@mateo/explain';
import {
  FOCUS_LIMITS,
  cellKey,
  exampleCell,
  explainCell,
  focusAxis,
  substitutionLatex,
  symbolicLatex,
} from '@mateo/explain';
import { Button, cn } from '@mateo/ui';
import { ArrowLeft, ArrowRight, ChevronRight, HelpCircle } from 'lucide-react';
import {
  Fragment,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage, useTextRef } from '../editor/messages';
import { useFormatters, useReducedMotion } from '../hooks/preferences';
import { DerivationPopover, termTones, type DerivationTarget } from './Derivation';
import { Formula, markNumber, markTerm } from './Formula';
import { useCellLabels } from './labels';
import { StoryView } from './StoryView';
import { TraceTable, type CellMark } from './TraceTable';
import { Value } from './Value';

/** Marks the place of a value in a translated sentence. */
const VALUE_MARK = '';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Where the learner is: a lesson step and, in it, one of its parts. */
interface Position {
  readonly step: number;
  readonly part: number;
}

/** The texts of a method's lesson, by lesson step and by formula. */
function useLessonTexts(textKey: string) {
  const { t } = useTranslation('explain');
  const translate = t as unknown as Translate;
  return useMemo(
    () => ({
      step: (id: string, field: 'title' | 'idea' | 'why') =>
        translate(`lessons.${textKey}.steps.${id}.${field}`),
      formula: (
        stepId: string,
        formulaId: string,
        field: 'how' | 'meaning',
        values: Record<string, string>,
      ) => translate(`lessons.${textKey}.formulas.${stepId}.${formulaId}.${field}`, values),
    }),
    [translate, textKey],
  );
}

/** A translated sentence with the value of the explained cell in its place. */
function WithValue({ text, value }: { text: string; value: TraceValue }) {
  const parts = text.split(VALUE_MARK);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <strong className="font-semibold">
              <Value value={value} whole />
            </strong>
          )}
          {part}
        </Fragment>
      ))}
    </>
  );
}

/** Numbers in the lesson's formulas: whole numbers without decimals. */
function useLessonNumber() {
  const formatters = useFormatters();
  return useCallback(
    (value: number) =>
      Number.isInteger(value) ? formatters.number(value, 0) : formatters.value(value),
    [formatters],
  );
}

interface CalculationProps {
  readonly trace: Trace;
  readonly textKey: string;
  readonly explanation: CellExplanation;
  readonly activeTerm: string | null;
  readonly onTerm: (term: string | null) => void;
  readonly onDerivation: (anchor: HTMLElement) => void;
}

/**
 * The explained cell: the calculation in words, the same calculation with its numbers, what
 * the result means, and the formula with a legend of its symbols on request.
 */
function Calculation({
  trace,
  textKey,
  explanation,
  activeTerm,
  onTerm,
  onDerivation,
}: CalculationProps) {
  const { t } = useTranslation('explain');
  const textOf = useTextRef();
  const texts = useLessonTexts(textKey);
  const number = useLessonNumber();
  const labelsOf = useCellLabels(trace);
  const formulaId = useId();
  const [showFormula, setShowFormula] = useState(false);
  const { formula, step, ref, cell } = explanation;
  const labels = labelsOf(ref);
  const tones = useMemo(() => termTones(explanation), [explanation]);
  const substitution = useMemo(
    () => substitutionLatex(explanation, { number: markNumber(number), wrapTerm: markTerm(tones) }),
    [explanation, number, tones],
  );
  const values = { row: labels.row, column: labels.column, cell: labels.cell, value: VALUE_MARK };

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      aria-label={t('lesson.calculation')}
      data-testid="lesson-calculation"
    >
      <p className="text-xs font-medium text-muted-foreground" data-testid="lesson-cell">
        {labels.cell}
      </p>
      {formula ? (
        <>
          <p className="text-sm" data-testid="lesson-how">
            {texts.formula(step.id, formula.id, 'how', values)}
          </p>
          {substitution !== null && (
            <div className="rounded-md bg-muted/60 px-3 py-2" data-testid="lesson-substitution">
              <Formula display latex={substitution} activeTerm={activeTerm} onTerm={onTerm} />
            </div>
          )}
          <div
            className="flex flex-col gap-1 rounded-md bg-success/10 px-3 py-2.5 text-sm"
            data-testid="lesson-meaning"
          >
            <span className="font-semibold text-success">{t('lesson.meaning')}</span>
            <span>
              <WithValue
                text={texts.formula(step.id, formula.id, 'meaning', values)}
                value={cell.value}
              />
            </span>
          </div>
          <div className="rounded-md border border-border">
            <button
              type="button"
              aria-expanded={showFormula}
              aria-controls={formulaId}
              data-testid="lesson-formula-toggle"
              onClick={() => setShowFormula((open) => !open)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted"
            >
              <ChevronRight
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
                  showFormula && 'rotate-90',
                )}
                aria-hidden
              />
              {showFormula ? t('lesson.hideFormula') : t('lesson.showFormula')}
            </button>
            {showFormula && (
              <div
                id={formulaId}
                className="flex flex-col gap-3 border-t border-border px-3 py-3"
                data-testid="lesson-formula"
              >
                {formula.condition && (
                  <p className="text-xs text-muted-foreground">{textOf(formula.condition)}</p>
                )}
                <Formula
                  display
                  latex={symbolicLatex(formula, markTerm(tones))}
                  activeTerm={activeTerm}
                  onTerm={onTerm}
                />
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                  {explanation.bindings.map((binding) => {
                    const single = binding.operands.length === 1 ? binding.operands[0] : undefined;
                    return (
                      <Fragment key={binding.term.name}>
                        <dt
                          className="ex-term rounded-md border border-transparent px-1.5"
                          data-tone={tones.get(binding.term.name)}
                          data-active={activeTerm === binding.term.name ? '' : undefined}
                          onMouseEnter={() => onTerm(binding.term.name)}
                          onMouseLeave={() => onTerm(null)}
                        >
                          <Formula latex={binding.term.latex} />
                        </dt>
                        <dd
                          className="text-muted-foreground"
                          data-testid={`term-${binding.term.name}`}
                        >
                          {binding.term.description && (
                            <span className="text-foreground">
                              {textOf(binding.term.description)}
                            </span>
                          )}
                          {binding.term.description && ' · '}
                          {single ? (
                            <span translate="no" className="tabular-nums">
                              <Value value={single.value} whole />
                            </span>
                          ) : (
                            t('lesson.termValues', { count: binding.operands.length })
                          )}
                        </dd>
                      </Fragment>
                    );
                  })}
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  data-testid="lesson-derivation"
                  onClick={(event) => onDerivation(event.currentTarget)}
                >
                  <HelpCircle aria-hidden />
                  {t('lesson.derivation')}
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="lesson-no-formula">
          {cell.derivation.kind === 'input'
            ? t('lesson.entered', { cell: labels.cell })
            : explanation.carriedFrom
              ? t('lesson.carried', {
                  cell: labels.cell,
                  step: labelsOf(explanation.carriedFrom).step,
                })
              : t('lesson.noFormula', { cell: labels.cell })}
        </p>
      )}
    </section>
  );
}

/**
 * The cell a part of a lesson step explains when the learner has not picked one. A step
 * without formulas (the data) explains its first table.
 */
function partCell(trace: Trace, step: LessonStep, part: number, focus: LessonFocus) {
  const stepId = step.parts[part] ?? step.steps[0];
  return stepId === undefined ? null : exampleCell(trace, stepId, focus);
}

export interface LessonShellProps {
  /** The titles of the lesson's steps, in order. */
  readonly titles: readonly string[];
  /** The step shown, from 0. */
  readonly current: number;
  readonly onGo: (step: number) => void;
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  /** One sentence: what this step does. */
  readonly idea: string;
  /** Why it is done. */
  readonly why: string;
  /** Shown instead of Next on the last step. */
  readonly finish?: ReactNode;
  readonly children: ReactNode;
  readonly testId?: string;
  /** Data attributes of the lesson element, for tests. */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
}

/**
 * The frame every lesson shares: a row of step markers, the idea of the step and why it is
 * done, the content, and Back and Next. The arrow keys move between steps; nothing plays
 * by itself.
 */
export function LessonShell({
  titles,
  current,
  onGo,
  onBack,
  onNext,
  isFirst,
  isLast,
  idea,
  why,
  finish,
  children,
  testId = 'lesson',
  data,
}: LessonShellProps) {
  const { t } = useTranslation('explain');
  const reducedMotion = useReducedMotion();
  const title = titles[current] ?? '';

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target as HTMLElement;
    // Fields, tables (arrow keys move between cells), charts and popovers keep their own keys.
    if (target.closest('select, input, textarea, table, svg, [role="dialog"], [role="combobox"]')) {
      return;
    }
    if (event.key === 'ArrowRight' && !isLast) {
      event.preventDefault();
      onNext();
    } else if (event.key === 'ArrowLeft' && !isFirst) {
      event.preventDefault();
      onBack();
    }
  };

  return (
    <section
      className="flex flex-col gap-5 focus-visible:outline-none"
      aria-label={t('lesson.label')}
      data-testid={testId}
      {...data}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label={t('lesson.steps')}>
          <ol className="flex gap-1.5">
            {titles.map((entry, index) => (
              <li key={index}>
                <button
                  type="button"
                  aria-current={index === current ? 'step' : undefined}
                  aria-label={t('lesson.goTo', { current: index + 1, title: entry })}
                  title={entry}
                  data-testid={`${testId}-marker-${index}`}
                  onClick={() => onGo(index)}
                  className="group flex h-6 items-center"
                >
                  <span
                    className={cn(
                      'block h-1.5 w-7 rounded-full transition-colors',
                      index === current
                        ? 'bg-primary'
                        : index < current
                          ? 'bg-primary/45'
                          : 'bg-border group-hover:bg-muted-foreground/40',
                    )}
                  />
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <p
          className="text-xs text-muted-foreground tabular-nums"
          data-testid={`${testId}-progress`}
        >
          {t('lesson.stepOf', { current: current + 1, total: titles.length })}
          {' · '}
          {title}
        </p>
      </header>

      <div key={current} className={cn('flex flex-col gap-5', !reducedMotion && 'lesson-enter')}>
        <div className="flex max-w-3xl flex-col gap-1.5">
          <h3 className="text-xl font-semibold text-balance" data-testid={`${testId}-idea`}>
            {idea}
          </h3>
          <p className="text-sm text-muted-foreground" data-testid={`${testId}-why`}>
            {why}
          </p>
        </div>
        {children}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isFirst}
          data-testid={`${testId}-back`}
        >
          <ArrowLeft aria-hidden />
          {t('lesson.back')}
        </Button>
        <p className="sr-only" role="status" aria-live="polite">
          {t('lesson.announce', { current: current + 1, total: titles.length, title })}
        </p>
        {isLast ? (
          <div className="flex flex-wrap gap-2">{finish}</div>
        ) : (
          <Button onClick={onNext} data-testid={`${testId}-next`}>
            {t('lesson.next')}
            <ArrowRight aria-hidden />
          </Button>
        )}
      </footer>
    </section>
  );
}

export interface LessonViewProps {
  readonly trace: Trace;
  readonly sequence: ExplainSequence;
  readonly lesson: Lesson;
  /** The row and column to explain by default, for example the winner and the heaviest criterion. */
  readonly focus?: LessonFocus;
  /** Shown beside Back on the last step, for example "Try it with your own data". */
  readonly finish?: ReactNode;
}

/**
 * A lesson on one method run. Each step states one idea and why it is done, shows the tables
 * it reads and produces, and explains one cell: the calculation in words and in numbers, what
 * the result means, and the formula on request. The learner moves on with Next and Back (or
 * the arrow keys) and can click any cell to have it explained. Nothing plays by itself.
 *
 * Every number on screen is a value of the trace (`Value`, `markNumber`); the texts describe
 * the formulas the engine recorded and calculate nothing.
 */
export function LessonView({ trace, sequence, lesson, focus = {}, finish }: LessonViewProps) {
  const { t } = useTranslation('explain');
  const message = useMessage();
  const texts = useLessonTexts(lesson.textKey);
  const labelsOf = useCellLabels(trace);
  const [position, setPosition] = useState<Position>({ step: 0, part: 0 });
  const [picked, setPicked] = useState<CellRef | null>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [wholeTables, setWholeTables] = useState(false);
  const [derivation, setDerivation] = useState<DerivationTarget | null>(null);

  const step = lesson.steps[position.step] ?? lesson.steps[0]!;
  const partCount = Math.max(1, step.parts.length);
  const isFirst = position.step === 0 && position.part === 0;
  const isLast = position.step === lesson.steps.length - 1 && position.part === partCount - 1;

  const go = useCallback(
    (next: Position) => {
      setPosition(next);
      setPicked(null);
      setActiveTerm(null);
    },
    [setPosition],
  );
  const forward = useCallback(() => {
    if (position.part < partCount - 1) go({ step: position.step, part: position.part + 1 });
    else if (position.step < lesson.steps.length - 1) go({ step: position.step + 1, part: 0 });
  }, [go, position, partCount, lesson.steps.length]);
  const back = useCallback(() => {
    if (position.part > 0) go({ step: position.step, part: position.part - 1 });
    else if (position.step > 0) {
      const previous = lesson.steps[position.step - 1]!;
      go({ step: position.step - 1, part: Math.max(0, previous.parts.length - 1) });
    }
  }, [go, position, lesson.steps]);

  // The trace steps shown: the input steps of this lesson step, and its parts up to the current one.
  const shownSteps = useMemo(() => {
    const current = step.parts[position.part];
    const reached = current === undefined ? step.steps.length : step.steps.indexOf(current) + 1;
    return step.steps.slice(0, reached);
  }, [step, position.part]);

  // Source tables first, then the tables this lesson step produces.
  const tables = useMemo(() => [...step.sources, ...shownSteps], [step.sources, shownSteps]);

  const example = useMemo(() => {
    if (step.story) return null;
    if (picked && tables.includes(picked.step) && findCell(trace, picked)) return picked;
    return partCell(trace, step, position.part, focus);
  }, [picked, tables, trace, step, position.part, focus]);
  const explanation = useMemo(
    () => (example ? explainCell(trace, example) : null),
    [trace, example],
  );

  // The cells behind each term of the explained cell's formula, by term colour.
  const marks = useMemo(() => {
    const map = new Map<string, { tone: number; term: string; ref: CellRef }>();
    if (explanation) {
      const tones = termTones(explanation);
      for (const binding of explanation.bindings) {
        for (const operand of binding.operands) {
          if (operand.ref) {
            map.set(cellKey(operand.ref), {
              tone: tones.get(binding.term.name) ?? 0,
              term: binding.term.name,
              ref: operand.ref,
            });
          }
        }
      }
    }
    return map;
  }, [explanation]);
  const exampleKey = example ? cellKey(example) : null;
  const mark = useCallback(
    (ref: CellRef): CellMark | undefined => {
      const key = cellKey(ref);
      const found = marks.get(key);
      const selected = key === exampleKey;
      if (!found && !selected) return undefined;
      return {
        ...(found ? { tone: found.tone, active: found.term === activeTerm } : {}),
        selected,
      };
    },
    [marks, exampleKey, activeTerm],
  );
  const onHover = useCallback(
    (ref: CellRef | null) => setActiveTerm(ref ? (marks.get(cellKey(ref))?.term ?? null) : null),
    [marks],
  );
  const onCell = useCallback(
    (ref: CellRef) => {
      // A cell of a later part moves on to that part.
      const part = step.parts.indexOf(ref.step);
      if (part >= 0 && part !== position.part) setPosition({ step: position.step, part });
      setPicked(ref);
    },
    [step.parts, position],
  );

  // Rows and columns of large tables: the explained cell's row and column stay in view.
  const pinnedRows = useMemo(() => {
    const rows = new Set<string>();
    if (example) rows.add(example.row);
    for (const { ref } of marks.values()) rows.add(ref.row);
    if (focus.row) rows.add(focus.row);
    return [...rows];
  }, [example, marks, focus.row]);
  const pinnedColumns = useMemo(() => {
    const columns = new Set<string>();
    if (example) columns.add(example.column);
    for (const { ref } of marks.values()) columns.add(ref.column);
    if (focus.column) columns.add(focus.column);
    return [...columns];
  }, [example, marks, focus.column]);

  let anyFocused = false;
  const views = tables.map((id) => {
    const traceStep = getStep(trace, id);
    if (wholeTables) return { traceStep, rows: undefined, columns: undefined };
    const rows = focusAxis(traceStep.output.rows, FOCUS_LIMITS.rows, pinnedRows);
    const columns = focusAxis(traceStep.output.columns, FOCUS_LIMITS.columns, pinnedColumns);
    if (rows.hidden > 0 || columns.hidden > 0) anyFocused = true;
    return {
      traceStep,
      rows: rows.hidden > 0 ? rows.visible : undefined,
      columns: columns.hidden > 0 ? columns.visible : undefined,
    };
  });

  return (
    <LessonShell
      titles={lesson.steps.map((entry) => texts.step(entry.id, 'title'))}
      current={position.step}
      onGo={(index) => go({ step: index, part: 0 })}
      onBack={back}
      onNext={forward}
      isFirst={isFirst}
      isLast={isLast}
      idea={texts.step(step.id, 'idea')}
      why={texts.step(step.id, 'why')}
      finish={finish}
      data={{ 'data-step': step.id, 'data-part': step.parts[position.part] ?? '' }}
    >
      {step.story && sequence.story ? (
        <StoryView trace={trace} plan={sequence.story} />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            {views.map(({ traceStep, rows, columns }) => {
              const source = step.sources.includes(traceStep.id);
              return (
                <figure
                  key={traceStep.id}
                  className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2.5"
                  data-testid={`${source ? 'source' : 'output'}-${traceStep.id}`}
                >
                  <figcaption className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {source
                      ? t('lesson.from', { step: message(traceStep.nameKey) })
                      : message(traceStep.nameKey)}
                  </figcaption>
                  <div className="overflow-x-auto">
                    <TraceTable
                      step={traceStep}
                      caption={message(traceStep.nameKey)}
                      {...(rows ? { rows } : {})}
                      {...(columns ? { columns } : {})}
                      compact
                      plainIntegers
                      mark={mark}
                      onCell={onCell}
                      onHover={onHover}
                      cellDescription={(ref) =>
                        t('lesson.explainCell', { cell: labelsOf(ref).cell })
                      }
                    />
                  </div>
                </figure>
              );
            })}
            {(anyFocused || wholeTables) && (
              <button
                type="button"
                className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
                data-testid="lesson-whole-tables"
                onClick={() => setWholeTables((whole) => !whole)}
              >
                {wholeTables ? t('lesson.focusTables') : t('lesson.wholeTables')}
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
            {step.parts.length > 1 && (
              <div
                role="group"
                aria-label={t('lesson.parts')}
                className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
              >
                {step.parts.map((id, index) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={index === position.part}
                    data-testid={`lesson-part-${id}`}
                    onClick={() => go({ step: position.step, part: index })}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium',
                      index === position.part
                        ? 'bg-surface text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="mr-1 tabular-nums">{index + 1}.</span>
                    {message(getStep(trace, id).nameKey)}
                  </button>
                ))}
              </div>
            )}
            {explanation && (
              <Calculation
                trace={trace}
                textKey={lesson.textKey}
                explanation={explanation}
                activeTerm={activeTerm}
                onTerm={setActiveTerm}
                onDerivation={(anchor) => example && setDerivation({ cell: example, anchor })}
              />
            )}
            <p className="text-xs text-muted-foreground">{t('lesson.pickHint')}</p>
          </div>
        </div>
      )}
      <DerivationPopover trace={trace} target={derivation} onClose={() => setDerivation(null)} />
    </LessonShell>
  );
}
