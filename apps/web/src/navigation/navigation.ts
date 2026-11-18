/**
 * The places of the app. Mateo is one guided path, Data → Weights → Result, with two
 * side areas (Learn and Settings) reached from the top bar. There is no sidebar: every
 * screen belongs to one step of the path or to one side area.
 */

/** The steps of the decision path, in order. */
export const FLOW_STEPS = ['data', 'weights', 'result'] as const;
export type FlowStepId = (typeof FLOW_STEPS)[number];

export type AreaId = 'start' | FlowStepId | 'learn' | 'settings';

export type PageId =
  | 'start'
  | 'data'
  | 'dataSources'
  | 'weights'
  | 'result'
  | 'history'
  | 'library'
  | 'fuzzyLesson'
  | 'playground'
  | 'languageFormats'
  | 'appearance'
  | 'scales'
  | 'about';

export interface Page {
  readonly id: PageId;
  readonly path: string;
  /** The step of the path or the side area the page belongs to. */
  readonly area: AreaId;
}

export const PAGES: readonly Page[] = [
  { id: 'start', path: '/', area: 'start' },
  { id: 'data', path: '/data', area: 'data' },
  { id: 'dataSources', path: '/data/sources', area: 'data' },
  { id: 'weights', path: '/weights', area: 'weights' },
  { id: 'result', path: '/result', area: 'result' },
  { id: 'history', path: '/result/history', area: 'result' },
  { id: 'library', path: '/learn/library', area: 'learn' },
  { id: 'fuzzyLesson', path: '/learn/fuzzy', area: 'learn' },
  { id: 'playground', path: '/learn/playground', area: 'learn' },
  { id: 'languageFormats', path: '/settings/language', area: 'settings' },
  { id: 'appearance', path: '/settings/appearance', area: 'settings' },
  { id: 'scales', path: '/settings/scales', area: 'settings' },
  { id: 'about', path: '/settings/about', area: 'settings' },
];

/**
 * The tabs of a side area, in order. Learn has none: its home page lists every lesson, and
 * each lesson links back to it.
 */
export const AREA_PAGES: Readonly<Record<'settings', readonly PageId[]>> = {
  settings: ['languageFormats', 'appearance', 'scales', 'about'],
};

export function pathOf(id: PageId): string {
  const page = PAGES.find((item) => item.id === id);
  if (!page) throw new Error(`Unknown page ${id}`);
  return page.path;
}

/**
 * Addresses of the earlier, sidebar-based layout. Links saved before the redesign (and the
 * Method Library's sample links in older files) keep working.
 */
export const REDIRECTS: readonly (readonly [from: string, to: string])[] = [
  ['/projects', '/'],
  ['/data-center', '/data/sources'],
  ['/matrix', '/data'],
  ['/methods/weighting', '/weights'],
  ['/methods/ranking', '/result'],
  ['/analysis/marcos', '/result'],
  ['/analysis/sensitivity', '/result'],
  ['/analysis/results', '/result/history'],
];

/**
 * The page for a route path. A path below a page's path belongs to that page, so
 * `/learn/library/marcos` is the Method Library.
 */
export function findPage(path: string): Page | undefined {
  const exact = PAGES.find((page) => page.path === path);
  if (exact) return exact;
  return PAGES.filter((page) => page.path !== '/' && path.startsWith(`${page.path}/`)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];
}

/** The step of the decision path a route belongs to, if any. */
export function flowStepOf(path: string): FlowStepId | null {
  const area = findPage(path)?.area;
  return (FLOW_STEPS as readonly string[]).includes(area ?? '') ? (area as FlowStepId) : null;
}
