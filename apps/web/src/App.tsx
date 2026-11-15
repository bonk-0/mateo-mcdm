import type { i18n } from 'i18next';
import { useState, type ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { RouterProvider } from 'react-router';
import { createAppRouter } from './router';
import { SettingsEffects } from './settings/SettingsEffects';

type Router = ComponentProps<typeof RouterProvider>['router'];

export function App({ i18n, router }: { i18n: i18n; router?: Router }) {
  const [appRouter] = useState(() => router ?? createAppRouter());
  return (
    <I18nextProvider i18n={i18n}>
      <SettingsEffects />
      <RouterProvider router={appRouter} />
    </I18nextProvider>
  );
}
