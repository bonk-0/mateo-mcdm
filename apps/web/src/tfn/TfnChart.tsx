import type { TFN } from '@mateo/fuzzy';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { TFN_POINTS, domainOf, moveTfnPoint, ticksFor, type TfnPoint } from './geometry';

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { left: 36, right: 16, top: 16, bottom: 32 };
const SERIES = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'];

/** One membership triangle of the chart. */
export interface TfnSeries {
  readonly id: string;
  /** Written next to the peak, for example `A` or `VG`. */
  readonly label: string;
  readonly value: TFN;
  /** Index of the series colour (0 to 4). Default: the position in the list. */
  readonly tone?: number;
}

/** A vertical line, for example a defuzzified value. */
export interface TfnMarker {
  readonly id: string;
  readonly label: string;
  readonly at: number;
  readonly tone?: number;
}

export interface TfnChartProps {
  /** The triangles. Those listed in `movable` can be dragged. */
  readonly series: readonly TfnSeries[];
  /** A linguistic scale drawn faintly behind the triangles. */
  readonly scale?: readonly TfnSeries[];
  readonly markers?: readonly TfnMarker[];
  /** Fixed number line. Default: the extent of everything drawn. */
  readonly domain?: readonly [number, number];
  /** Ids of the series whose points the user can drag or move with the arrow keys. */
  readonly movable?: readonly string[];
  readonly onChange?: (id: string, value: TFN) => void;
  /** Grid dragging snaps to, and the arrow-key step. */
  readonly step?: number;
  readonly numberFormat: (value: number) => string;
  readonly ariaLabel: string;
  /** Accessible name of a handle, for example "A, peak m". */
  readonly handleLabel?: (series: TfnSeries, point: TfnPoint) => string;
  readonly testId?: string;
}

const toneColor = (tone: number) => `var(${SERIES[tone % SERIES.length] as string})`;

/**
 * Membership triangles of triangular fuzzy numbers over a number line, optionally with a
 * linguistic scale behind them and with draggable points. Pure drawing: it never
 * calculates; what the triangles stand for comes from the caller (`@mateo/fuzzy`).
 */
export function TfnChart({
  series,
  scale = [],
  markers = [],
  domain,
  movable = [],
  onChange,
  step,
  numberFormat,
  ariaLabel,
  handleLabel,
  testId,
}: TfnChartProps) {
  const svg = useRef<SVGSVGElement>(null);
  const [min, max] = domain ?? domainOf([...series, ...scale].map((entry) => entry.value));
  const span = max - min || 1;
  const x = (value: number) => PAD.left + ((value - min) / span) * (WIDTH - PAD.left - PAD.right);
  const y = (degree: number) => PAD.top + (1 - degree) * (HEIGHT - PAD.top - PAD.bottom);
  const interactive = onChange !== undefined && movable.length > 0;
  const grid = step ?? span / 200;

  const valueAt = (clientX: number): number | null => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const px = ((clientX - rect.left) / rect.width) * WIDTH;
    return min + ((px - PAD.left) / (WIDTH - PAD.left - PAD.right)) * span;
  };

  const drag = (entry: TfnSeries, point: TfnPoint) => (event: PointerEvent<SVGElement>) => {
    if (event.buttons === 0 && event.type === 'pointermove') return;
    const at = valueAt(event.clientX);
    if (at !== null) onChange?.(entry.id, moveTfnPoint(entry.value, point, at, [min, max], grid));
  };

  const press = (entry: TfnSeries, point: TfnPoint) => (event: KeyboardEvent<SVGElement>) => {
    const direction =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -1
          : 0;
    if (direction === 0) return;
    event.preventDefault();
    const jump = direction * grid * (event.shiftKey ? 10 : 1);
    onChange?.(
      entry.id,
      moveTfnPoint(entry.value, point, entry.value[point] + jump, [min, max], grid),
    );
  };

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role={interactive ? 'group' : 'img'}
      aria-label={ariaLabel}
      className="h-auto w-full max-w-2xl touch-none"
      data-testid={testId}
    >
      {[0, 0.5, 1].map((degree) => (
        <g key={degree}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(degree)}
            y2={y(degree)}
            stroke="var(--border)"
            strokeDasharray={degree === 0 ? undefined : '3 4'}
          />
          <text
            x={PAD.left - 6}
            y={y(degree) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            {numberFormat(degree)}
          </text>
        </g>
      ))}
      {ticksFor(min, max).map((tick) => (
        <text
          key={tick}
          x={x(tick)}
          y={HEIGHT - PAD.bottom + 16}
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted-foreground)"
        >
          {numberFormat(tick)}
        </text>
      ))}
      {scale.map((term) => {
        const { l, m, u } = term.value;
        return (
          <g key={term.id} data-testid={testId ? `${testId}-scale-${term.id}` : undefined}>
            <polygon
              points={`${x(l)},${y(0)} ${x(m)},${y(1)} ${x(u)},${y(0)}`}
              fill="var(--muted-foreground)"
              fillOpacity={0.06}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.55}
              strokeDasharray="4 3"
              strokeWidth={1.25}
              strokeLinejoin="round"
            />
            <text
              x={x(m)}
              y={y(0) - 4}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              {term.label}
            </text>
          </g>
        );
      })}
      {series.map((entry, index) => {
        const { l, m, u } = entry.value;
        const color = toneColor(entry.tone ?? index);
        return (
          <g key={entry.id} data-testid={testId ? `${testId}-series-${entry.id}` : undefined}>
            <polygon
              points={`${x(l)},${y(0)} ${x(m)},${y(1)} ${x(u)},${y(0)}`}
              fill={color}
              fillOpacity={0.14}
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <text
              x={x(m)}
              y={y(1) - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--foreground)"
            >
              {entry.label}
            </text>
          </g>
        );
      })}
      {markers.map((marker, index) => {
        const color = toneColor(marker.tone ?? index);
        return (
          <g key={marker.id} data-testid={testId ? `${testId}-marker-${marker.id}` : undefined}>
            <line
              x1={x(marker.at)}
              x2={x(marker.at)}
              y1={y(0)}
              y2={y(1) - 2}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
            <text
              x={x(marker.at) + 4}
              y={y(0.12) - index * 12}
              fontSize="10"
              fill="var(--foreground)"
            >
              {marker.label}
            </text>
          </g>
        );
      })}
      {interactive &&
        series
          .filter((entry) => movable.includes(entry.id))
          .flatMap((entry) => {
            const color = toneColor(entry.tone ?? series.indexOf(entry));
            return TFN_POINTS.map((point) => {
              const at = entry.value[point];
              const cx = x(at);
              const cy = point === 'm' ? y(1) : y(0);
              const name = handleLabel ? handleLabel(entry, point) : `${entry.label} ${point}`;
              return (
                <circle
                  key={`${entry.id}-${point}`}
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill="var(--background)"
                  stroke={color}
                  strokeWidth={2.5}
                  className="cursor-grab focus:outline-none focus-visible:stroke-[4] active:cursor-grabbing"
                  tabIndex={0}
                  role="slider"
                  aria-label={name}
                  aria-orientation="horizontal"
                  aria-valuemin={min}
                  aria-valuemax={max}
                  aria-valuenow={at}
                  aria-valuetext={numberFormat(at)}
                  data-testid={testId ? `${testId}-handle-${entry.id}-${point}` : undefined}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    drag(entry, point)(event);
                  }}
                  onPointerMove={drag(entry, point)}
                  onKeyDown={press(entry, point)}
                />
              );
            });
          })}
    </svg>
  );
}
