import type { TraceValue } from '@mateo/engine';
import { TfnGlyph, tfnOfValue } from '../tfn/TfnGlyph';

/**
 * The size a value is drawn with: a number itself, the largest component of a fuzzy number.
 * Bar lengths are drawing, not results: no number is shown that the trace does not hold.
 */
export function extent(value: TraceValue): number | null {
  if (typeof value === 'number') return value;
  if (value !== null && typeof value === 'object') {
    const sizes = Object.values(value.components);
    return sizes.length > 0 ? Math.max(...sizes) : null;
  }
  return null;
}

export function Bar({
  value,
  scale,
  register,
}: {
  value: TraceValue;
  scale: number;
  register?: (element: HTMLElement | null) => void;
}) {
  const size = extent(value);
  if (size === null || !(scale > 0) || size < 0) return null;
  const fuzzy = tfnOfValue(value);
  if (fuzzy) {
    // A fuzzy number is drawn as its membership triangle on the same number line as the
    // other bars; the registered element grows from the left like a bar does.
    return (
      <span aria-hidden className="relative block h-6 w-40 rounded bg-muted/60">
        <span ref={register} className="absolute inset-0 origin-left">
          <TfnGlyph value={fuzzy} to={scale} className="h-full w-full" />
        </span>
      </span>
    );
  }
  const percent = (part: number) => `${Math.max(0, Math.min(100, (part / scale) * 100))}%`;
  return (
    <span aria-hidden className="relative block h-2.5 w-40 rounded-full bg-muted">
      <span ref={register} className="absolute inset-0 origin-left">
        <span
          className="absolute inset-y-0 rounded-full bg-primary"
          style={{ left: 0, right: `calc(100% - ${percent(size)})` }}
        />
      </span>
    </span>
  );
}
