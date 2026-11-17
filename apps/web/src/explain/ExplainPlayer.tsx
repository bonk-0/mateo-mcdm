import type { CellRef, Trace } from '@mateo/engine';
import { findCell, getStep } from '@mateo/engine';
import type { CellExplanation, Scene, Timeline } from '@mateo/explain';
import {
  PLAYER_SPEEDS,
  atEnd,
  cellKey,
  explainCell,
  formulaOfCell,
  playerPosition,
  substitutionLatex,
  symbolicLatex,
} from '@mateo/explain';
import { Button, Kbd, Tooltip, TooltipContent, TooltipTrigger } from '@mateo/ui';
import {
  ChevronFirst,
  ChevronLast,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage, useTextRef } from '../editor/messages';
import { useFormatters, useReducedMotion } from '../hooks/preferences';
import { DerivationPopover, termTones, type DerivationTarget } from './Derivation';
import { Formula, markNumber, markTerm } from './Formula';
import { firstCell, useCellLabels } from './labels';
import { Stage } from './Stage';
import type { CellMark } from './TraceTable';
import { usePlayer } from './usePlayer';
import { Value } from './Value';

const fieldClass =
  'h-8 rounded-md border border-border bg-surface px-2 text-sm text-foreground disabled:opacity-50';

function Toggle({
  pressed,
  onChange,
  children,
  disabled = false,
  testId,
}: {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      data-testid={testId}
      onClick={() => onChange(!pressed)}
      className={`h-8 rounded-md border px-2.5 text-sm font-medium transition-colors ${pressed ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-surface text-muted-foreground hover:bg-muted'} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  shortcut,
  onClick,
  disabled,
  primary,
  testId,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  testId: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={primary ? 'primary' : 'outline'}
          size="icon"
          aria-label={label}
          disabled={disabled}
          data-testid={testId}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && (
          <>
            {' '}
            <Kbd>{shortcut}</Kbd>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/** The cell a scene explains when the user has not picked one. */
function defaultExample(trace: Trace, scene: Scene): CellRef | null {
  if (scene.kind === 'formula') return scene.example;
  const step = getStep(trace, scene.stepId);
  for (const preferRegular of [true, false]) {
    for (const [r, row] of step.output.cells.entries()) {
      const item = step.output.rows[r]!;
      if (preferRegular && item.kind === 'reference') continue;
      const c = row.findIndex((cell) => formulaOfCell(step, cell) !== null);
      if (c >= 0) return { step: step.id, row: item.id, column: step.output.columns[c]!.id };
    }
  }
  return firstCell(step);
}

interface FormulaPanelProps {
  readonly trace: Trace;
  readonly explanation: CellExplanation;
  readonly showSubstitution: boolean;
  readonly activeTerm: string | null;
  readonly onTerm: (term: string | null) => void;
  readonly onPick: (ref: CellRef) => void;
  readonly onDerivation: (anchor: HTMLElement) => void;
}

/**
 * The formula of the example cell, the same formula with the numbers of that cell, and
 * the terms as buttons. Pointing at or focusing a term highlights its cells in the tables.
 */
function FormulaPanel({
  trace,
  explanation,
  showSubstitution,
  activeTerm,
  onTerm,
  onPick,
  onDerivation,
}: FormulaPanelProps) {
  const { t } = useTranslation('explain');
  const textOf = useTextRef();
  const formatters = useFormatters();
  const labelsOf = useCellLabels(trace);
  const rowId = useId();
  const columnId = useId();
  const { formula, step, ref } = explanation;
  const labels = labelsOf(ref);
  const tones = useMemo(() => termTones(explanation), [explanation]);
  const substitution = useMemo(
    () =>
      substitutionLatex(explanation, {
        number: markNumber(formatters.value),
        wrapTerm: markTerm(tones),
      }),
    [explanation, formatters, tones],
  );
  const { rows, columns } = step.output;

  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-surface px-4 py-3"
      aria-label={t('formula.title')}
      data-testid="explain-formula"
    >
      <div className="flex flex-wrap items-end gap-3">
        {rows.length > 1 && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={rowId}>
            {t('formula.exampleRow')}
            <select
              id={rowId}
              className={fieldClass}
              value={ref.row}
              data-testid="example-row"
              onChange={(event) => onPick({ ...ref, row: event.target.value })}
            >
              {rows.map((item) => (
                <option key={item.id} value={item.id}>
                  {textOf(item.label)}
                </option>
              ))}
            </select>
          </label>
        )}
        {columns.length > 1 && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor={columnId}>
            {t('formula.exampleColumn')}
            <select
              id={columnId}
              className={fieldClass}
              value={ref.column}
              data-testid="example-column"
              onChange={(event) => onPick({ ...ref, column: event.target.value })}
            >
              {columns.map((item) => (
                <option key={item.id} value={item.id}>
                  {textOf(item.label)}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          data-testid="explain-derivation"
          onClick={(event) => onDerivation(event.currentTarget)}
        >
          <HelpCircle aria-hidden />
          {t('formula.howCalculated')}
        </Button>
      </div>

      {formula ? (
        <>
          <div className="grid items-center gap-x-6 gap-y-2 md:grid-cols-2">
            <div>
              {formula.condition && (
                <p className="text-center text-xs text-muted-foreground">
                  {textOf(formula.condition)}
                </p>
              )}
              <Formula
                display
                latex={symbolicLatex(formula, markTerm(tones))}
                activeTerm={activeTerm}
                onTerm={onTerm}
              />
            </div>
            {showSubstitution && substitution !== null && (
              <div data-testid="explain-substitution">
                <p className="text-center text-xs text-muted-foreground">
                  {t('formula.withNumbers', { cell: labels.cell })}
                </p>
                <Formula display latex={substitution} activeTerm={activeTerm} onTerm={onTerm} />
              </div>
            )}
          </div>
          <ul className="flex flex-wrap gap-2" aria-label={t('formula.terms')}>
            {explanation.bindings.map((binding) => {
              const single = binding.operands.length === 1 ? binding.operands[0] : undefined;
              return (
                <li key={binding.term.name}>
                  <button
                    type="button"
                    className="ex-term flex items-center gap-2 rounded-md border border-border px-2 py-0.5 text-sm"
                    data-tone={tones.get(binding.term.name)}
                    data-active={activeTerm === binding.term.name ? '' : undefined}
                    data-testid={`term-${binding.term.name}`}
                    aria-description={t('formula.highlight', { term: binding.term.name })}
                    onMouseEnter={() => onTerm(binding.term.name)}
                    onMouseLeave={() => onTerm(null)}
                    onFocus={() => onTerm(binding.term.name)}
                    onBlur={() => onTerm(null)}
                  >
                    <Formula latex={binding.term.latex} />
                    <span className="text-muted-foreground tabular-nums">
                      {single ? (
                        <span translate="no">
                          = <Value value={single.value} />
                        </span>
                      ) : (
                        t('formula.termValues', { count: binding.operands.length })
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="explain-no-formula">
          {explanation.cell.derivation.kind === 'input'
            ? t('formula.entered', { cell: labels.cell })
            : explanation.carriedFrom
              ? t('formula.carried', {
                  cell: labels.cell,
                  source: t('derivation.location', {
                    step: labelsOf(explanation.carriedFrom).step,
                    cell: labelsOf(explanation.carriedFrom).cell,
                  }),
                })
              : t('formula.noFormula', { cell: labels.cell })}
        </p>
      )}
    </section>
  );
}

/**
 * Explain mode: the timeline of one analysis with its player. Play, pause, step, scrub,
 * change speed, jump to a step, and show or hide the formula, its numbers and the
 * explanation. With reduced motion every step is shown complete and nothing moves.
 */
export function ExplainPlayer({ trace, timeline }: { trace: Trace; timeline: Timeline }) {
  const { t } = useTranslation('explain');
  const message = useMessage();
  const textOf = useTextRef();
  const formatters = useFormatters();
  const reducedMotion = useReducedMotion();
  const [wantsAnimation, setWantsAnimation] = useState(true);
  const animated = wantsAnimation && !reducedMotion;
  const { state, playhead, dispatch } = usePlayer(timeline, animated);
  const [showFormula, setShowFormula] = useState(true);
  const [showSubstitution, setShowSubstitution] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [picked, setPicked] = useState<CellRef | null>(null);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [derivation, setDerivation] = useState<DerivationTarget | null>(null);
  const scrubber = useRef<HTMLInputElement>(null);

  const scene = timeline.scenes[state.scene] ?? timeline.scenes[0]!;
  const step = getStep(trace, scene.stepId);

  // The picked example applies to the step it was picked in, and in a formula scene only
  // while it is a cell of that formula.
  const example = useMemo(() => {
    const cell = picked && picked.step === scene.stepId ? findCell(trace, picked) : undefined;
    if (
      picked &&
      cell &&
      (scene.kind !== 'formula' || formulaOfCell(step, cell)?.id === scene.formulaId)
    ) {
      return picked;
    }
    return defaultExample(trace, scene);
  }, [picked, scene, step, trace]);
  const explanation = useMemo(
    () => (example ? explainCell(trace, example) : null),
    [trace, example],
  );

  // Linked highlighting: the cells behind each term of the formula, by term colour.
  const marks = useMemo(() => {
    const map = new Map<string, { tone: number; term: string }>();
    if (explanation) {
      const tones = termTones(explanation);
      for (const binding of explanation.bindings) {
        for (const operand of binding.operands) {
          if (!operand.ref) continue;
          map.set(cellKey(operand.ref), {
            tone: tones.get(binding.term.name) ?? 0,
            term: binding.term.name,
          });
        }
      }
    }
    return map;
  }, [explanation]);
  const pinned = useMemo(
    () =>
      explanation?.bindings.flatMap((binding) =>
        binding.range ? [] : binding.operands.flatMap((operand) => operand.ref ?? []),
      ) ?? [],
    [explanation],
  );
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
  const onPick = useCallback(
    (ref: CellRef) => {
      setPicked(ref);
      const cell = findCell(trace, ref);
      const fits =
        scene.kind !== 'formula' ||
        (cell !== undefined && formulaOfCell(step, cell)?.id === scene.formulaId);
      const entry = timeline.steps[scene.stepIndex];
      // A cell another formula produced is explained on the complete table of the step.
      if (fits || !entry) dispatch({ type: 'pause' });
      else dispatch({ type: 'show', scene: entry.firstScene + entry.sceneCount - 1 });
    },
    [dispatch, scene, step, timeline, trace],
  );

  // The scrub bar follows the playhead without rendering the player again.
  useEffect(() => {
    const sync = () => {
      if (scrubber.current) scrubber.current.value = String(playerPosition(playhead.get()));
    };
    sync();
    return playhead.subscribe(sync);
  }, [playhead]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    // Fields and the derivation popover keep their own keys; the scrub bar steps scene by
    // scene; Space on a button presses that button.
    if (target !== scrubber.current && target.closest('select, input, textarea, [role="dialog"]')) {
      return;
    }
    if (event.key === ' ' && target.closest('button, a')) return;
    const action =
      event.key === ' ' || event.key === 'k'
        ? ({ type: 'toggle' } as const)
        : event.key === 'ArrowRight'
          ? ({ type: 'step-forward' } as const)
          : event.key === 'ArrowLeft'
            ? ({ type: 'step-back' } as const)
            : event.key === 'Home'
              ? ({ type: 'first' } as const)
              : event.key === 'End'
                ? ({ type: 'last' } as const)
                : null;
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  };

  const ended = atEnd(state, timeline);
  const kind = scene.kind === 'formula' ? t('player.kind.formula') : t('player.kind.fill');
  const stepName = message(scene.nameKey);
  const sceneFormula =
    scene.kind === 'formula'
      ? step.formulas.find((item) => item.id === scene.formulaId)
      : undefined;

  return (
    <section
      className="space-y-4 focus-visible:outline-none"
      aria-label={t('player.label')}
      data-testid="explain-player"
      data-scene={scene.id}
      data-animated={animated}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label={t('player.steps')}>
          <ol className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {timeline.steps.map((entry) => {
              const current = entry.stepId === scene.stepId;
              return (
                <li key={entry.stepId} className="shrink-0">
                  <button
                    type="button"
                    aria-current={current ? 'step' : undefined}
                    data-testid={`explain-step-${entry.stepId}`}
                    onClick={() => dispatch({ type: 'jump', scene: entry.firstScene })}
                    className={`flex w-full items-baseline gap-2 rounded-md px-2.5 py-1.5 text-left text-sm ${current ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    <span className="tabular-nums" translate="no">
                      {entry.stepIndex + 1}
                    </span>
                    <span>{message(entry.nameKey)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 space-y-4">
          <header>
            <p className="text-xs text-muted-foreground">
              {t('player.stepOf', { current: scene.stepIndex + 1, total: timeline.steps.length })}
              {' · '}
              {kind}
              {sceneFormula?.condition && ` · ${textOf(sceneFormula.condition)}`}
            </p>
            <h3 className="text-base font-semibold" data-testid="explain-step-name">
              {stepName}
            </h3>
            <p className="sr-only" role="status" aria-live="polite">
              {t('player.announce', { step: stepName, kind })}
            </p>
          </header>

          {showExplanation && (
            <p className="max-w-3xl text-sm text-muted-foreground" data-testid="explain-text">
              {scene.kind === 'formula' && scene.narration
                ? textOf(scene.narration)
                : message(scene.explanationKey, scene.explanationParams)}
            </p>
          )}

          {showFormula && explanation && (
            <FormulaPanel
              trace={trace}
              explanation={explanation}
              showSubstitution={showSubstitution}
              activeTerm={activeTerm}
              onTerm={setActiveTerm}
              onPick={onPick}
              onDerivation={(anchor) => example && setDerivation({ cell: example, anchor })}
            />
          )}

          <Stage
            trace={trace}
            scene={scene}
            playhead={playhead}
            animated={animated}
            example={example}
            mark={mark}
            pinned={pinned}
            onPick={onPick}
            onHover={onHover}
          />
        </div>
      </div>

      <div
        className="sticky bottom-0 z-10 space-y-2 rounded-lg border border-border bg-surface p-3 shadow-sm"
        data-testid="explain-controls"
      >
        <input
          ref={scrubber}
          type="range"
          className="ex-scrubber block w-full"
          min={0}
          max={timeline.scenes.length}
          step={0.01}
          defaultValue={playerPosition(state)}
          aria-label={t('player.position')}
          aria-valuetext={t('player.positionText', {
            current: state.scene + 1,
            total: timeline.scenes.length,
            name: stepName,
          })}
          data-testid="explain-scrubber"
          onChange={(event) => dispatch({ type: 'seek', position: Number(event.target.value) })}
        />
        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            label={t('player.first')}
            shortcut="Home"
            testId="explain-first"
            onClick={() => dispatch({ type: 'first' })}
          >
            <ChevronFirst aria-hidden />
          </IconButton>
          <IconButton
            label={t('player.previous')}
            shortcut="←"
            testId="explain-previous"
            onClick={() => dispatch({ type: 'step-back' })}
          >
            <SkipBack aria-hidden />
          </IconButton>
          {animated && (
            <IconButton
              primary
              label={
                state.playing ? t('player.pause') : ended ? t('player.replay') : t('player.play')
              }
              shortcut="Space"
              testId="explain-play"
              onClick={() => dispatch({ type: 'toggle' })}
            >
              {state.playing ? (
                <Pause aria-hidden />
              ) : ended ? (
                <RotateCcw aria-hidden />
              ) : (
                <Play aria-hidden />
              )}
            </IconButton>
          )}
          <IconButton
            label={t('player.next')}
            shortcut="→"
            testId="explain-next"
            disabled={ended}
            onClick={() => dispatch({ type: 'step-forward' })}
          >
            <SkipForward aria-hidden />
          </IconButton>
          <IconButton
            label={t('player.last')}
            shortcut="End"
            testId="explain-last"
            onClick={() => dispatch({ type: 'last' })}
          >
            <ChevronLast aria-hidden />
          </IconButton>

          <span
            className="px-1 text-sm text-muted-foreground tabular-nums"
            data-testid="explain-scene"
          >
            {t('player.sceneOf', { current: state.scene + 1, total: timeline.scenes.length })}
          </span>

          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            {t('player.speed')}
            <select
              className={fieldClass}
              value={state.speed}
              disabled={!animated}
              data-testid="explain-speed"
              onChange={(event) => dispatch({ type: 'speed', speed: Number(event.target.value) })}
            >
              {PLAYER_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {t('player.speedValue', { speed: formatters.number(speed) })}
                </option>
              ))}
            </select>
          </label>

          <div
            role="group"
            aria-label={t('player.show')}
            className="flex flex-wrap items-center gap-1.5"
          >
            <Toggle
              pressed={showExplanation}
              onChange={setShowExplanation}
              testId="toggle-explanation"
            >
              {t('player.explanation')}
            </Toggle>
            <Toggle pressed={showFormula} onChange={setShowFormula} testId="toggle-formula">
              {t('player.formula')}
            </Toggle>
            <Toggle
              pressed={showFormula && showSubstitution}
              onChange={(pressed) => {
                setShowSubstitution(pressed);
                if (pressed) setShowFormula(true);
              }}
              testId="toggle-substitution"
            >
              {t('player.substitution')}
            </Toggle>
            <Toggle
              pressed={animated}
              disabled={reducedMotion}
              onChange={setWantsAnimation}
              testId="toggle-animations"
            >
              {t('player.animations')}
            </Toggle>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {reducedMotion ? t('player.reducedMotion') : t('player.shortcuts')}
        </p>
      </div>

      <DerivationPopover trace={trace} target={derivation} onClose={() => setDerivation(null)} />
    </section>
  );
}
