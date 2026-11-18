import { describe, expect, it } from 'vitest';
import { AREA_PAGES, findPage, flowStepOf, PAGES, REDIRECTS } from './navigation';

describe('navigation', () => {
  it('uses unique paths and ids', () => {
    expect(new Set(PAGES.map((page) => page.path)).size).toBe(PAGES.length);
    expect(new Set(PAGES.map((page) => page.id)).size).toBe(PAGES.length);
  });

  it('puts every tab of a side area in that area', () => {
    for (const [area, ids] of Object.entries(AREA_PAGES)) {
      for (const id of ids) expect(PAGES.find((page) => page.id === id)?.area).toBe(area);
    }
  });

  it('finds pages by path and by a path below them', () => {
    expect(findPage('/')?.id).toBe('start');
    expect(findPage('/data')?.id).toBe('data');
    expect(findPage('/data/sources')?.id).toBe('dataSources');
    expect(findPage('/learn/library/marcos')?.id).toBe('library');
    expect(findPage('/result/history')?.id).toBe('history');
    expect(findPage('/nowhere')).toBeUndefined();
  });

  it('maps pages to the step of the decision path', () => {
    expect(flowStepOf('/data/sources')).toBe('data');
    expect(flowStepOf('/weights')).toBe('weights');
    expect(flowStepOf('/result/history')).toBe('result');
    expect(flowStepOf('/settings/language')).toBeNull();
    expect(flowStepOf('/')).toBeNull();
  });

  it('redirects old addresses to existing pages', () => {
    for (const [from, to] of REDIRECTS) {
      expect(findPage(from)?.path).not.toBe(from);
      expect(findPage(to)).toBeDefined();
    }
  });
});
