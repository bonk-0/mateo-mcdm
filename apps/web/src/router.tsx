import { createHashRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { REDIRECTS } from './navigation/navigation';
import { NotFoundPage } from './routes/NotFoundPage';
import { StartPage } from './routes/StartPage';
import { AboutPage } from './routes/settings/AboutPage';
import { AppearancePage } from './routes/settings/AppearancePage';
import { LanguageFormatsPage } from './routes/settings/LanguageFormatsPage';
import { AppShell } from './shell/AppShell';
import { AreaLayout } from './shell/AreaLayout';

/** Sends an old address to its new page and keeps the query, so sample links still apply. */
function Redirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

/*
 * Screens below are loaded on first visit. The data step brings the spreadsheet grid with
 * it and the weights and result steps bring the charts, which would otherwise make every
 * start of the app slower.
 */

export function buildRoutes(): RouteObject[] {
  return [
    {
      element: <AppShell />,
      HydrateFallback: () => null,
      children: [
        { index: true, element: <StartPage /> },
        {
          path: 'data',
          lazy: () =>
            import('./editor/EditorPage').then((module) => ({ Component: module.EditorPage })),
        },
        {
          path: 'data/sources',
          lazy: () =>
            import('./dataCenter/DataCenterPage').then((module) => ({
              Component: module.DataCenterPage,
            })),
        },
        {
          path: 'weights',
          lazy: () =>
            import('./flow/WeightsStep').then((module) => ({ Component: module.WeightsStep })),
        },
        {
          path: 'result',
          lazy: () =>
            import('./flow/ResultStep').then((module) => ({ Component: module.ResultStep })),
        },
        {
          path: 'result/history',
          lazy: () =>
            import('./workspace/ResultsPage').then((module) => ({ Component: module.ResultsPage })),
        },
        {
          path: 'learn',
          children: [
            { index: true, element: <Redirect to="/learn/library" /> },
            {
              path: 'library',
              lazy: () =>
                import('./library/LibraryIndexPage').then((module) => ({
                  Component: module.LibraryIndexPage,
                })),
            },
            {
              path: 'library/:pageId',
              lazy: () =>
                import('./library/MethodPage').then((module) => ({
                  Component: module.MethodPage,
                })),
            },
            {
              path: 'fuzzy',
              lazy: () =>
                import('./tfn/FuzzyLesson').then((module) => ({
                  Component: module.FuzzyLesson,
                })),
            },
            {
              path: 'playground',
              lazy: () =>
                import('./tfn/FuzzyPlayground').then((module) => ({
                  Component: module.FuzzyPlayground,
                })),
            },
          ],
        },
        {
          path: 'settings',
          element: <AreaLayout area="settings" />,
          children: [
            { index: true, element: <Redirect to="/settings/language" /> },
            { path: 'language', element: <LanguageFormatsPage /> },
            { path: 'appearance', element: <AppearancePage /> },
            {
              path: 'scales',
              lazy: () =>
                import('./editor/ScaleManager').then((module) => ({
                  Component: module.ScaleManagerPage,
                })),
            },
            { path: 'about', element: <AboutPage /> },
          ],
        },
        ...REDIRECTS.map(([from, to]) => ({ path: from, element: <Redirect to={to} /> })),
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
