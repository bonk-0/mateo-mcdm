import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEffectiveLanguage, useResolvedTheme } from '../hooks/preferences';
import { useSettings } from './store';

/** Applies settings to the document: language, theme class and motion preference. */
export function SettingsEffects() {
  const { i18n } = useTranslation();
  const language = useEffectiveLanguage();
  const theme = useResolvedTheme();
  const motion = useSettings((s) => s.motion);

  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [i18n, language]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (motion === 'system') root.removeAttribute('data-reduced-motion');
    else root.dataset['reducedMotion'] = motion === 'reduce' ? 'true' : 'false';
  }, [motion]);

  return null;
}
