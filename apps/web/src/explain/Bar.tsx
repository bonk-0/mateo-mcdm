import type { TraceValue } from '@mateo/engine';

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
  const percent = (part: number) => `${Math.max(0, Math.min(100, (part / scale) * 100))}%`;
  const fuzzy = typeof value === 'object' && value !== null ? value.components : null;
  const low = fuzzy?.['l'];
  const modal = fuzzy?.['m'];
  return (
    <span aria-hidden className="relative block h-2.5 w-40 rounded-full bg-muted">
      <span ref={register} className="absolute inset-0 origin-left">
        <span
          className="absolute inset-y-0 rounded-full bg-primary"
          style={{
            left: low === undefined ? 0 : percent(low),
            right: `calc(100% - ${percent(size)})`,
            opacity: fuzzy ? 0.45 : 1,
          }}
        />
        {modal !== undefined && (
          <span
            className="absolute inset-y-[-2px] w-0.5 rounded bg-primary"
            style={{ left: percent(modal) }}
          />
        )}
      </span>
    </span>
  );
}
