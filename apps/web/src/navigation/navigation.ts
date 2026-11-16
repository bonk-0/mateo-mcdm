import {
  BookOpen,
  Boxes,
  Calculator,
  Database,
  FolderOpen,
  GitCompareArrows,
  Home,
  Info,
  Languages,
  ListOrdered,
  type LucideIcon,
  Network,
  Table2,
  Palette,
  Ruler,
  Scale,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  Users,
  Workflow,
} from 'lucide-react';

/** Main phases from docs/plan.md §3. Items of later phases stay hidden until they ship. */
export type Phase = 1 | 2 | 3 | 4;

/** The phase the app is currently built for. */
export const CURRENT_PHASE: Phase = 1;

export type NavSectionId = 'home' | 'methods' | 'analysis' | 'learn' | 'settings';

export type NavItemId =
  | 'home'
  | 'projects'
  | 'dataCenter'
  | 'matrix'
  | 'weighting'
  | 'ranking'
  | 'dematel'
  | 'riskAssessment'
  | 'hybridBuilder'
  | 'marcos'
  | 'results'
  | 'sensitivity'
  | 'comparison'
  | 'groupDecisions'
  | 'batch'
  | 'library'
  | 'playground'
  | 'practice'
  | 'languageFormats'
  | 'appearance'
  | 'scales'
  | 'about';

export interface NavItem {
  readonly id: NavItemId;
  readonly path: string;
  readonly icon: LucideIcon;
  /** First main phase in which the item is visible. */
  readonly phase: Phase;
  /** Sub-phase that builds the screen; set while the route is still a placeholder. */
  readonly plannedIn?: string;
}

export interface NavSection {
  readonly id: NavSectionId;
  readonly items: readonly NavItem[];
}

/** The full navigation tree from docs/plan.md §12. */
export const NAVIGATION: readonly NavSection[] = [
  {
    id: 'home',
    items: [
      { id: 'home', path: '/', icon: Home, phase: 1 },
      { id: 'projects', path: '/projects', icon: FolderOpen, phase: 1, plannedIn: 'P1.8' },
      { id: 'dataCenter', path: '/data-center', icon: Database, phase: 1, plannedIn: 'P1.10' },
      { id: 'matrix', path: '/matrix', icon: Table2, phase: 1 },
    ],
  },
  {
    id: 'methods',
    items: [
      { id: 'weighting', path: '/methods/weighting', icon: Scale, phase: 1 },
      { id: 'ranking', path: '/methods/ranking', icon: ListOrdered, phase: 1 },
      { id: 'dematel', path: '/methods/dematel', icon: Network, phase: 2, plannedIn: 'P2.8' },
      {
        id: 'riskAssessment',
        path: '/methods/risk',
        icon: ShieldAlert,
        phase: 3,
        plannedIn: 'P3.5',
      },
      {
        id: 'hybridBuilder',
        path: '/methods/hybrid',
        icon: Workflow,
        phase: 2,
        plannedIn: 'P2.9',
      },
    ],
  },
  {
    id: 'analysis',
    items: [
      { id: 'marcos', path: '/analysis/marcos', icon: Target, phase: 1 },
      { id: 'results', path: '/analysis/results', icon: Trophy, phase: 1 },
      {
        id: 'sensitivity',
        path: '/analysis/sensitivity',
        icon: SlidersHorizontal,
        phase: 1,
        plannedIn: 'P1.15',
      },
      {
        id: 'comparison',
        path: '/analysis/comparison',
        icon: GitCompareArrows,
        phase: 2,
        plannedIn: 'P2.10',
      },
      {
        id: 'groupDecisions',
        path: '/analysis/groups',
        icon: Users,
        phase: 3,
        plannedIn: 'P3.4',
      },
      { id: 'batch', path: '/analysis/batch', icon: Boxes, phase: 3, plannedIn: 'P3.7' },
    ],
  },
  {
    id: 'learn',
    items: [
      { id: 'library', path: '/learn/library', icon: BookOpen, phase: 1, plannedIn: 'P1.17' },
      {
        id: 'playground',
        path: '/learn/playground',
        icon: Sparkles,
        phase: 1,
        plannedIn: 'P1.14',
      },
      { id: 'practice', path: '/learn/practice', icon: Calculator, phase: 4, plannedIn: 'P4.5' },
    ],
  },
  {
    id: 'settings',
    items: [
      { id: 'languageFormats', path: '/settings/language', icon: Languages, phase: 1 },
      { id: 'appearance', path: '/settings/appearance', icon: Palette, phase: 1 },
      { id: 'scales', path: '/settings/scales', icon: Ruler, phase: 1 },
      { id: 'about', path: '/settings/about', icon: Info, phase: 1 },
    ],
  },
];

/** Navigation with only the items that have shipped in `phase`; empty sections are dropped. */
export function visibleNavigation(phase: Phase = CURRENT_PHASE): NavSection[] {
  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.phase <= phase),
  })).filter((section) => section.items.length > 0);
}

export interface NavMatch {
  readonly section: NavSection;
  readonly item: NavItem;
}

/** Finds the visible item for a route path. */
export function findNavItem(path: string, phase: Phase = CURRENT_PHASE): NavMatch | undefined {
  for (const section of visibleNavigation(phase)) {
    const item = section.items.find((i) => i.path === path);
    if (item) return { section, item };
  }
  return undefined;
}
