import '@fontsource-variable/inter';
import './styles.css';
import { resolveLanguage } from '@mateo/i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createAppI18n } from './i18n/setup';
import { useSettings } from './settings/store';
import { systemLanguages, systemPrefersDark } from './settings/system';

// Settings hydrate synchronously from localStorage, so the first paint already has the
// right language and theme.
const { language, theme } = useSettings.getState();
const initialLanguage = language === 'system' ? resolveLanguage(systemLanguages()) : language;
document.documentElement.lang = initialLanguage;
document.documentElement.classList.toggle(
  'dark',
  theme === 'dark' || (theme === 'system' && systemPrefersDark()),
);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App i18n={createAppI18n(initialLanguage)} />
  </StrictMode>,
);
