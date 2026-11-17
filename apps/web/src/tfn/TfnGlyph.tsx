import type { TraceValue } from '@mateo/engine';

/** The three components of a fuzzy trace value, or `null` for any other value. */
export function tfnOfValue(value: TraceValue): { l: number; m: number; u: number } | null {
  if (value === null || typeof value !== 'object') return null;
  const { l, m, u } = value.components;
  return typeof l === 'number' && typeof m === 'number' && typeof u === 'number'
    ? { l, m, u }
    : null;
}

/**
 * A small membership triangle of a fuzzy number, drawn between `from` and `to` of the
 * number line. It shows no text: the numbers stay in `Value`. Drawing only.
 */
export function TfnGlyph({
  value,
  from = 0,
  to,
  className = 'h-4 w-14',
}: {
  value: { l: number; m: number; u: number };
  from?: number;
  to: number;
  className?: string;
}) {
  const span = to - from;
  if (!(span > 0)) return null;
  const px = (v: number) => Math.max(0, Math.min(100, ((v - from) / span) * 100));
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      className={`tfn-glyph ${className}`}
      data-testid="tfn-glyph"
    >
      <line
        x1="0"
        x2="100"
        y1="23"
        y2="23"
        stroke="var(--border)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`${px(value.l)},23 ${px(value.m)},2 ${px(value.u)},23`}
        fill="var(--primary)"
        fillOpacity={0.22}
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
