import type { CellRef, Trace, TraceStep } from '@mateo/engine';
import { getStep } from '@mateo/engine';
import type { Scene, Span, VectorScene } from '@mateo/explain';
import { FOCUS_LIMITS, cellKey, focusAxis, spanProgress } from '@mateo/explain';
import { motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage, useTextRef } from '../editor/messages';
import { Bar, extent } from './Bar';
import { TraceTable, type CellMark } from './TraceTable';
import type { Playhead } from './usePlayer';
import { Value } from './Value';

/** Ease-out for the flights: a quick start and a long settle, like `--ease-standard`. */
function ease(t: number): number {
  const inverse = 1 - t;
  return 1 - inverse * inverse * inverse;
}

interface RevealActor {
  readonly element: HTMLElement;
  readonly bar: HTMLElement | undefined;
  readonly at: Span;
  last: number;
}

interface FlightActor {
  readonly ghost: HTMLElement;
  readonly dx: number;
  readonly dy: number;
  readonly at: Span;
  last: number;
}

interface Choreography {
  readonly scene: number;
  readonly reveals: RevealActor[];
  readonly flights: FlightActor[];
}

export interface StageProps {
  readonly trace: Trace;
  readonly scene: Scene;
  readonly playhead: Playhead;
  readonly animated: boolean;
  /** The cell being explained. Its row and column stay visible in large tables. */
  readonly example: CellRef | null;
  /** Colour and emphasis of the cells that stand for formula terms. */
  readonly mark: (ref: CellRef) => CellMark | undefined;
  /** Cells that must stay in view in large tables (the operands of the example). */
  readonly pinned: readonly CellRef[];
  readonly onPick: (ref: CellRef) => void;
  readonly onHover: (ref: CellRef | null) => void;
}

interface VectorProps {
  readonly scene: VectorScene;
  readonly caption: string;
  readonly sorted: boolean;
  readonly mark: StageProps['mark'];
  readonly onPick: StageProps['onPick'];
  readonly onHover: StageProps['onHover'];
  readonly register: (ref: CellRef, element: HTMLElement | null) => void;
  readonly registerBar: (ref: CellRef, element: HTMLElement | null) => void;
}

/** A vector as labelled values with bars, a ranking as an ordered list, or one value. */
function VectorOutput({
  scene,
  caption,
  sorted,
  mark,
  onPick,
  onHover,
  register,
  registerBar,
}: VectorProps) {
  const { t } = useTranslation('explain');
  const textOf = useTextRef();
  const scale = useMemo(
    () => Math.max(0, ...scene.items.map((entry) => extent(entry.value) ?? 0)),
    [scene.items],
  );

  if (scene.view === 'value') {
    const entry = scene.items[0];
    if (!entry) return null;
    const state = mark(entry.ref);
    return (
      <div
        className="ex-cell rounded-lg border border-border px-4 py-3 text-xl font-semibold tabular-nums"
        data-tone={state?.tone}
        data-active={state?.active ? '' : undefined}
        data-selected={state?.selected ? '' : undefined}
        data-testid={`value-${scene.stepId}`}
        onClick={() => onPick(entry.ref)}
        onMouseEnter={() => onHover(entry.ref)}
        onMouseLeave={() => onHover(null)}
      >
        <span ref={(element) => register(entry.ref, element)} className="inline-block">
          <Value value={entry.value} />
        </span>
      </div>
    );
  }

  const ranking = scene.view === 'ranking';
  const items =
    ranking && sorted && scene.order
      ? scene.order.flatMap((id) => scene.items.find((entry) => entry.item.id === id) ?? [])
      : scene.items;
  return (
    <table
      className="border-collapse text-sm"
      data-testid={`vector-${scene.stepId}`}
      onMouseLeave={() => onHover(null)}
    >
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t('stage.item')}</th>
          <th scope="col">{ranking ? t('stage.rank') : t('stage.value')}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((entry) => {
          const state = mark(entry.ref);
          return (
            <motion.tr key={entry.item.id} layout={ranking ? 'position' : false}>
              <th
                scope="row"
                className="border-b border-border px-3 py-1.5 text-left font-medium whitespace-nowrap"
              >
                {textOf(entry.item.label)}
              </th>
              <td
                className="ex-cell cursor-pointer border-b border-border px-3 py-1.5 text-right tabular-nums whitespace-nowrap"
                data-tone={state?.tone}
                data-active={state?.active ? '' : undefined}
                data-selected={state?.selected ? '' : undefined}
                onClick={() => onPick(entry.ref)}
                onMouseEnter={() => onHover(entry.ref)}
              >
                <span
                  ref={(element) => register(entry.ref, element)}
                  className={`inline-block ${ranking ? 'min-w-6 rounded-full bg-accent px-2 text-center font-semibold text-accent-foreground' : ''}`}
                >
                  <Value value={entry.value} whole={ranking} />
                </span>
              </td>
              {!ranking && (
                <td className="border-b border-border py-1.5 pr-3 pl-1">
                  <Bar
                    value={entry.value}
                    scale={scale}
                    register={(element) => registerBar(entry.ref, element)}
                  />
                </td>
              )}
            </motion.tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Panel({ title, name, children }: { title?: string; name: string; children: ReactNode }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-1.5 text-xs text-muted-foreground">
        {title && <span className="mr-1.5 font-semibold tracking-wide uppercase">{title}</span>}
        <span>{name}</span>
      </figcaption>
      {children}
    </figure>
  );
}

/**
 * The tables of one scene: the earlier steps the values come from, and the output of the
 * step. While the scene plays, values fly from their source cells to the cells they
 * produce and the output fills in. All of it follows the playhead directly in the DOM, so
 * a frame costs a few style writes and no React render.
 */
export function Stage({
  trace,
  scene,
  playhead,
  animated,
  example,
  mark,
  pinned,
  onPick,
  onHover,
}: StageProps) {
  const { t } = useTranslation('explain');
  const message = useMessage();
  const inner = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const bars = useRef(new Map<string, HTMLElement>());
  const choreography = useRef<Choreography | null>(null);
  const step = getStep(trace, scene.stepId);

  const register = useCallback((ref: CellRef, element: HTMLElement | null) => {
    if (element) cells.current.set(cellKey(ref), element);
    else cells.current.delete(cellKey(ref));
  }, []);
  const registerBar = useCallback((ref: CellRef, element: HTMLElement | null) => {
    if (element) bars.current.set(cellKey(ref), element);
    else bars.current.delete(cellKey(ref));
  }, []);

  // Large tables show the rows and columns of the example and of its operands.
  const focusOf = useCallback(
    (table: TraceStep) => {
      const involved = [...(example ? [example] : []), ...pinned].filter(
        (ref) => ref.step === table.id,
      );
      const rows = focusAxis(
        table.output.rows,
        FOCUS_LIMITS.rows,
        involved.map((ref) => ref.row),
      );
      const columns = focusAxis(
        table.output.columns,
        FOCUS_LIMITS.columns,
        involved.map((ref) => ref.column),
      );
      return { rows, columns, focused: rows.hidden > 0 || columns.hidden > 0 };
    },
    [example, pinned],
  );
  const outputFocus = useMemo(() => focusOf(step), [focusOf, step]);
  const sources = useMemo(
    () =>
      scene.sources.map((id) => {
        const source = getStep(trace, id);
        return { step: source, focus: focusOf(source) };
      }),
    [scene.sources, trace, focusOf],
  );
  const layoutKey = [outputFocus, ...sources.map((source) => source.focus)]
    .map((focus) => `${focus.rows.visible.join(',')}/${focus.columns.visible.join(',')}`)
    .join('|');

  // A ranking starts in the order of the input and settles into the order of the ranks.
  const sortAt = 0.55;
  const [sorted, setSorted] = useState(() => !animated || playhead.get().progress >= sortAt);
  useEffect(() => {
    const update = () => {
      const head = playhead.get();
      setSorted(!head.animated || head.scene !== scene.index || head.progress >= sortAt);
    };
    update();
    return playhead.subscribe(update);
  }, [playhead, scene.index]);

  const apply = useCallback(() => {
    const plan = choreography.current;
    const head = playhead.get();
    if (plan === null || plan.scene !== head.scene) return;
    const progress = head.animated ? head.progress : 1;
    for (const actor of plan.reveals) {
      const length = actor.at.end - actor.at.start;
      const shown =
        progress >= 1
          ? 1
          : spanProgress({ start: actor.at.start + 0.55 * length, end: actor.at.end }, progress);
      const rounded = Math.round(shown * 50) / 50;
      if (rounded === actor.last) continue;
      actor.last = rounded;
      actor.element.style.opacity = rounded >= 1 ? '' : String(rounded);
      if (actor.bar) actor.bar.style.transform = rounded >= 1 ? '' : `scaleX(${rounded})`;
    }
    for (const actor of plan.flights) {
      const t = progress >= 1 ? 1 : spanProgress(actor.at, progress);
      if (t === actor.last) continue;
      actor.last = t;
      if (t <= 0 || t >= 1) {
        actor.ghost.style.visibility = 'hidden';
        continue;
      }
      const eased = ease(t);
      actor.ghost.style.visibility = 'visible';
      actor.ghost.style.transform = `translate3d(${actor.dx * eased}px, ${actor.dy * eased}px, 0)`;
      actor.ghost.style.opacity = t > 0.8 ? String((1 - t) / 0.2) : '1';
    }
  }, [playhead]);

  const build = useCallback(() => {
    const root = inner.current;
    const layer = overlay.current;
    if (!root || !layer) return;
    layer.replaceChildren();
    // Start from a clean slate: elements are shared between the scenes of a step.
    for (const element of cells.current.values()) element.style.opacity = '';
    for (const element of bars.current.values()) element.style.transform = '';

    const reveals: RevealActor[] = [];
    const flights: FlightActor[] = [];
    if (animated) {
      const revealed = new Set<string>();
      for (const reveal of scene.reveals) {
        const key = cellKey(reveal.ref);
        const element = cells.current.get(key);
        if (!element) continue;
        revealed.add(key);
        reveals.push({ element, bar: bars.current.get(key), at: reveal.at, last: -1 });
      }
      // Output cells the scene does not reveal are not known yet.
      const prefix = `${JSON.stringify(scene.stepId)},`;
      for (const [key, element] of cells.current) {
        if (key.startsWith(`[${prefix}`) && !revealed.has(key)) element.style.opacity = '0';
      }
      const origin = root.getBoundingClientRect();
      for (const flight of scene.flights) {
        const from = cells.current.get(cellKey(flight.from));
        const to = cells.current.get(cellKey(flight.to));
        if (!from || !to) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const ghost = document.createElement('span');
        ghost.className = 'ex-ghost';
        // The text of the source cell itself: the same number, already formatted.
        ghost.textContent = from.textContent;
        ghost.style.left = `${a.left - origin.left}px`;
        ghost.style.top = `${a.top - origin.top}px`;
        ghost.style.width = `${a.width}px`;
        ghost.style.visibility = 'hidden';
        layer.append(ghost);
        flights.push({ ghost, dx: b.right - a.right, dy: b.top - a.top, at: flight.at, last: -1 });
      }
    }
    choreography.current = { scene: scene.index, reveals, flights };
    apply();
  }, [scene, animated, apply]);

  useLayoutEffect(() => {
    build();
    const root = inner.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => build());
    observer.observe(root);
    return () => observer.disconnect();
  }, [build, layoutKey, sorted]);

  useEffect(() => playhead.subscribe(apply), [playhead, apply]);

  const focused = outputFocus.focused || sources.some((source) => source.focus.focused);
  const caption = message(step.nameKey);
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4">
      <div ref={inner} className="relative">
        <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
          {sources.length > 0 && (
            <div className="flex flex-col gap-4" data-testid="stage-sources">
              {sources.map(({ step: source, focus }, index) => (
                <Panel
                  key={source.id}
                  name={message(source.nameKey)}
                  {...(index === 0 ? { title: t('stage.sources') } : {})}
                >
                  <TraceTable
                    step={source}
                    caption={message(source.nameKey)}
                    rows={focus.rows.visible}
                    columns={focus.columns.visible}
                    compact
                    mark={mark}
                    onHover={onHover}
                    register={register}
                    testId={`source-${source.id}`}
                  />
                </Panel>
              ))}
            </div>
          )}
          <Panel name={caption} {...(sources.length > 0 ? { title: t('stage.output') } : {})}>
            {scene.kind === 'vector' ? (
              <VectorOutput
                scene={scene}
                caption={caption}
                sorted={sorted}
                mark={mark}
                onPick={onPick}
                onHover={onHover}
                register={register}
                registerBar={registerBar}
              />
            ) : (
              <TraceTable
                step={step}
                caption={caption}
                rows={outputFocus.rows.visible}
                columns={outputFocus.columns.visible}
                mark={mark}
                onCell={onPick}
                onHover={onHover}
                register={register}
                testId={`output-${step.id}`}
              />
            )}
          </Panel>
        </div>
        <div ref={overlay} aria-hidden className="pointer-events-none absolute inset-0" />
      </div>
      {focused && (
        <p className="mt-3 text-xs text-muted-foreground" data-testid="stage-focused">
          {t('stage.focused', {
            rows: outputFocus.rows.visible.length,
            totalRows: step.output.rows.length,
            columns: outputFocus.columns.visible.length,
            totalColumns: step.output.columns.length,
          })}
        </p>
      )}
    </div>
  );
}
