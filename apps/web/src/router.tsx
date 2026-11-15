import { createHashRouter, type RouteObject } from 'react-router';
import { visibleNavigation, type NavItemId } from './navigation/navigation';
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

export function buildRoutes(): RouteObject[] {
  const children: RouteObject[] = visibleNavigation().flatMap((section) =>
    section.items.map((item) => {
      const Screen = SCREENS[item.id];
      return {
        path: item.path,
        element: Screen ? <Screen /> : <PlaceholderPage item={item} />,
      };
    }),
  );
  return [
    { element: <AppShell />, children: [...children, { path: '*', element: <NotFoundPage /> }] },
  ];
}

/**
 * Hash routing works the same in the browser build and in the desktop webview, where
 * deep links to `/settings/...` would not map to files.
 */
export function createAppRouter() {
  return createHashRouter(buildRoutes());
}
