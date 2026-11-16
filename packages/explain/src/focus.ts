import type { TraceAxisItem } from '@mateo/engine';

/** Tables up to this size are shown and animated in full. */
export const FOCUS_LIMITS = { rows: 12, columns: 10 } as const;

export interface AxisFocus {
  /** Ids of the items that are shown, in the order of the axis. */
  readonly visible: readonly string[];
  /** How many items are left out. */
  readonly hidden: number;
}

/**
 * The part of a long axis that is shown: the pinned items (the row of the cell being
 * explained, say), every reference item such as the ideal solution, and the first other
 * items up to `limit`. A short axis is shown in full.
 */
export function focusAxis(
  items: readonly TraceAxisItem[],
  limit: number,
  pinned: readonly string[] = [],
): AxisFocus {
  const regular = items.filter((item) => item.kind !== 'reference');
  if (regular.length <= limit) return { visible: items.map((item) => item.id), hidden: 0 };
  const keep = new Set<string>();
  for (const id of pinned) {
    if (keep.size < limit && regular.some((item) => item.id === id)) keep.add(id);
  }
  for (const item of regular) {
    if (keep.size >= limit) break;
    keep.add(item.id);
  }
  const visible = items
    .filter((item) => item.kind === 'reference' || keep.has(item.id))
    .map((item) => item.id);
  return { visible, hidden: items.length - visible.length };
}
