import {
  formatDate,
  formatNumber,
  formatPercent,
  LANGUAGE_DEFAULT_LOCALE,
  localeForNumberFormat,
  resolveLanguage,
  type DateStyle,
  type Language,
} from '@mateo/i18n';
import { useMemo } from 'react';
import { useSettings } from '../settings/store';
import { systemLanguages, systemLocale } from '../settings/system';
import { useMediaQuery } from './useMediaQuery';

/** The UI language in effect: the user's choice, or the best match for the OS. */
export function useEffectiveLanguage(): Language {
  const preference = useSettings((s) => s.language);
  return preference === 'system' ? resolveLanguage(systemLanguages()) : preference;
}

/** `light` or `dark`, after resolving the `system` preference. */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useSettings((s) => s.theme);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

/**
 * Whether animations should be reduced, from the app setting or, by default, the OS
 * `prefers-reduced-motion` setting. Explain mode and decorative motion must honour it.
 */
export function useReducedMotion(): boolean {
  const preference = useSettings((s) => s.motion);
  const systemReduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  if (preference === 'system') return systemReduce;
  return preference === 'reduce';
}

export interface Formatters {
  /** Locale used to display numbers. */
  readonly numberLocale: string;
  /** Locale used to display dates (follows the UI language). */
  readonly dateLocale: string;
  /** A computed value at the user's display precision. */
  readonly value: (value: number) => string;
  /** A number with explicit fraction digits (`undefined` shows up to 6). */
  readonly number: (value: number, fractionDigits?: number) => string;
  readonly percent: (value: number, fractionDigits?: number) => string;
  readonly date: (value: Date | number, style?: DateStyle, withTime?: boolean) => string;
}

/** Formatting helpers bound to the user's display settings. */
export function useFormatters(): Formatters {
  const language = useEffectiveLanguage();
  const displayNumberFormat = useSettings((s) => s.displayNumberFormat);
  const precision = useSettings((s) => s.displayPrecision);
  return useMemo(() => {
    const numberLocale = localeForNumberFormat(displayNumberFormat, systemLocale());
    const dateLocale = LANGUAGE_DEFAULT_LOCALE[language];
    return {
      numberLocale,
      dateLocale,
      value: (v) => formatNumber(v, numberLocale, { fractionDigits: precision }),
      number: (v, digits) =>
        formatNumber(v, numberLocale, digits === undefined ? {} : { fractionDigits: digits }),
      percent: (v, digits) => formatPercent(v, numberLocale, digits),
      date: (v, dateStyle, withTime) => formatDate(v, dateLocale, { dateStyle, withTime }),
    };
  }, [language, displayNumberFormat, precision]);
}
