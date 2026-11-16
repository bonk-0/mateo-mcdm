import { describe, expect, it, vi } from 'vitest';
import { createRecentProjects, type KeyValueStore } from './recent';

function memoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

const entry = (location: string, name = location) => ({
  location,
  name,
  openedAt: '2026-01-01T00:00:00.000Z',
});

describe('recent projects', () => {
  it('lists the most recently used first, without duplicates', () => {
    const store = memoryStore();
    const recent = createRecentProjects(store);
    expect(recent.list()).toEqual([]);
    recent.add(entry('/a.mateo', 'A'));
    recent.add(entry('/b.mateo', 'B'));
    recent.add(entry('/a.mateo', 'A renamed'));
    expect(recent.list().map((item) => `${item.location} ${item.name}`)).toEqual([
      '/a.mateo A renamed',
      '/b.mateo B',
    ]);
    // Another instance on the same store sees the same list.
    expect(createRecentProjects(store).list()).toEqual(recent.list());
    expect([...store.items.keys()]).toEqual(['mateo.recentProjects']);
  });

  it('keeps at most `limit` entries', () => {
    const recent = createRecentProjects(memoryStore(), { limit: 3, key: 'custom' });
    for (const name of ['a', 'b', 'c', 'd', 'e']) recent.add(entry(name));
    expect(recent.list().map((item) => item.location)).toEqual(['e', 'd', 'c']);
  });

  it('removes entries, clears the list and notifies subscribers', () => {
    const recent = createRecentProjects(memoryStore());
    const listener = vi.fn();
    const unsubscribe = recent.subscribe(listener);
    recent.add(entry('a'));
    recent.add(entry('b'));
    recent.remove('a');
    expect(recent.list().map((item) => item.location)).toEqual(['b']);
    recent.clear();
    expect(recent.list()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    recent.add(entry('c'));
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('survives unreadable or foreign content and a store that cannot be written', () => {
    for (const content of ['not json', '{"a":1}', '[1, null, {"location": 5}]']) {
      expect(createRecentProjects(memoryStore({ 'mateo.recentProjects': content })).list()).toEqual(
        [],
      );
    }
    const mixed = JSON.stringify([{ ...entry('ok'), extra: true }, { location: 'bad' }]);
    expect(createRecentProjects(memoryStore({ 'mateo.recentProjects': mixed })).list()).toEqual([
      entry('ok'),
    ]);

    const readOnly = createRecentProjects({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => readOnly.add(entry('a'))).not.toThrow();
    expect(readOnly.list()).toEqual([]);
  });
});
