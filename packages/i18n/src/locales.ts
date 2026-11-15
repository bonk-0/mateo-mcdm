/** UI languages that ship with Mateo. English is the source language (docs/plan.md §11). */
export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const SOURCE_LANGUAGE: Language = 'en';

/** Each language's name in that language, used by the language switcher. */
export const LANGUAGE_NATIVE_NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  tr: 'Türkçe',
};

/**
 * The BCP 47 locale a language formats with when the user has not picked a separate
 * number or date format.
 */
export const LANGUAGE_DEFAULT_LOCALE: Readonly<Record<Language, string>> = {
  en: 'en-US',
  tr: 'tr-TR',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Picks the first supported language from a list of BCP 47 tags in preference order
 * (for example `navigator.languages`). Region and script subtags are ignored, so
 * `tr-TR` and `tr` both resolve to Turkish. Falls back to the source language.
 */
export function resolveLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (isLanguage(base)) return base;
  }
  return SOURCE_LANGUAGE;
}
