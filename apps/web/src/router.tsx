import type { ComponentType } from 'react';
import { createHashRouter, type RouteObject } from 'react-router';
import { visibleNavigation, type NavItemId } from './navigation/navigation';
import { libraryPath } from './library/methods';
import { HomePage } from './routes/HomePage';
import { NotFoundPage } from './routes/NotFoundPage';
import { PlaceholderPage } from './routes/PlaceholderPage';
import { AboutPage } from './routes/settings/AboutPage';
import { AppearancePage } from './routes/settings/AppearancePage';
import { LanguageFormatsPage } from './routes/settings/LanguageFormatsPage';
import { AppShell } from './shell/AppShell';

/** Screens that exist in P1.7. Every other visible item renders a placeholder. */
const SCREENS: Partial<Record<NavItemId, () => React.JSX.Element>> = {
  home: HomePage,
  languageFormats: LanguageFormatsPage,
  appearance: AppearancePage,
  about: AboutPage,
};

/**
 * Screens loaded on first visit. The matrix editor brings the spreadsheet grid with it,
 * which would otherwise make every start of the app slower.
 */
const LAZY_SCREENS: Partial<Record<NavItemId, () => Promise<{ Component: ComponentType }>>> = {
  dataCenter: () =>
    import('./dataCenter/DataCenterPage').then((module) => ({
      Component: module.DataCenterPage,
    })),
  matrix: () => import('./editor/EditorPage').then((module) => ({ Component: module.EditorPage })),
  scales: () =>
    import('./editor/ScaleManager').then((module) => ({ Component: module.ScaleManagerPage })),
  library: () =>
    import('./library/LibraryIndexPage').then((module) => ({
      Component: module.LibraryIndexPage,
    })),
  // The workspaces bring the charts with them.
  weighting: () =>
    import('./workspace/WeightingPage').then((module) => ({ Component: module.WeightingPage })),
  ranking: () =>
    import('./workspace/MarcosPage').then((module) => ({ Component: module.MarcosPage })),
  marcos: () =>
    import('./workspace/MarcosPage').then((module) => ({ Component: module.MarcosPage })),
  sensitivity: () =>
    import('./workspace/SensitivityPage').then((module) => ({
      Component: module.SensitivityPage,
    })),
  results: () =>
    import('./workspace/ResultsPage').then((module) => ({ Component: module.ResultsPage })),
};

export function buildRoutes(): RouteObject[] {
  const children: RouteObject[] = visibleNavigation().flatMap((section) =>
    section.items.map((item) => {
      const Screen = SCREENS[item.id];
      const lazy = LAZY_SCREENS[item.id];
      if (lazy) return { path: item.path, lazy };
      return {
        path: item.path,
        element: Screen ? <Screen /> : <PlaceholderPage item={item} />,
      };
    }),
  );
  return [
    {
      element: <AppShell />,
      HydrateFallback: () => null,
      children: [
        ...children,
        {
          path: `${libraryPath()}/:pageId`,
          lazy: () =>
            import('./library/MethodPage').then((module) => ({ Component: module.MethodPage })),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ];
}

/**
 * Hash routing works the same in the browser build and in the desktop webview, where
 * deep links to `/settings/...` would not map to files.
 */
export function createAppRouter() {
  return createHashRouter(buildRoutes());
}
