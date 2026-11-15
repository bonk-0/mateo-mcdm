import { LANGUAGE_NATIVE_NAMES, SUPPORTED_LANGUAGES } from '@mateo/i18n';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@mateo/ui';
import { Languages, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffectiveLanguage, useResolvedTheme } from '../hooks/preferences';
import { useSettings, type LanguagePreference, type ThemePreference } from '../settings/store';

export function LanguageMenu() {
  const { t } = useTranslation('shell');
  const preference = useSettings((s) => s.language);
  const update = useSettings((s) => s.update);
  const language = useEffectiveLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Languages aria-hidden />
          <span className="sr-only">{t('language.change')}</span>{' '}
          <span translate="no" className="font-semibold uppercase">
            {language}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => update({ language: value as LanguagePreference })}
        >
          <DropdownMenuRadioItem value="system">
            {t('language.system', { language: LANGUAGE_NATIVE_NAMES[language] })}
          </DropdownMenuRadioItem>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuRadioItem key={lang} value={lang} lang={lang}>
              {LANGUAGE_NATIVE_NAMES[lang]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function ThemeMenu() {
  const { t } = useTranslation('shell');
  const preference = useSettings((s) => s.theme);
  const update = useSettings((s) => s.update);
  const resolved = useResolvedTheme();
  const Current = resolved === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('theme.change')}>
          <Current aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => update({ theme: value as ThemePreference })}
        >
          {(['system', 'light', 'dark'] as const).map((theme) => {
            const Icon = THEME_ICONS[theme];
            return (
              <DropdownMenuRadioItem key={theme} value={theme}>
                <Icon aria-hidden />
                {t(`theme.${theme}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
