import { describe, expect, it } from 'vitest';
import { findNavItem, NAVIGATION, visibleNavigation } from './navigation';

describe('navigation', () => {
  it('follows the section order of docs/plan.md §12', () => {
    expect(NAVIGATION.map((s) => s.id)).toEqual([
      'home',
      'methods',
      'analysis',
      'learn',
      'settings',
    ]);
  });

  it('hides items of later phases', () => {
    const ids = visibleNavigation(1).flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain('marcos');
    expect(ids).not.toContain('dematel');
    expect(ids).not.toContain('practice');
    const phase4 = visibleNavigation(4).flatMap((s) => s.items.map((i) => i.id));
    expect(phase4).toHaveLength(NAVIGATION.flatMap((s) => s.items).length);
  });

  it('uses unique paths and ids', () => {
    const items = NAVIGATION.flatMap((s) => s.items);
    expect(new Set(items.map((i) => i.path)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('finds visible items by path only', () => {
    expect(findNavItem('/settings/appearance')?.item.id).toBe('appearance');
    expect(findNavItem('/methods/dematel')).toBeUndefined();
  });
});
