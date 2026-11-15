import type { Language } from '@mateo/i18n';
import { render } from '@testing-library/react';
import type { i18n } from 'i18next';
import { createMemoryRouter } from 'react-router';
import { App } from '../App';
import { createAppI18n } from '../i18n/setup';
import { buildRoutes } from '../router';

export function renderApp(path = '/', options: { language?: Language; i18n?: i18n } = {}) {
  const i18n = options.i18n ?? createAppI18n(options.language ?? 'en');
  const router = createMemoryRouter(buildRoutes(), { initialEntries: [path] });
  return { i18n, router, ...render(<App i18n={i18n} router={router} />) };
}
