/** Reads locale preferences from the operating system through the browser or webview. */

const FALLBACK_LOCALE = 'en-US';

/** The OS language preferences, most preferred first. */
export function systemLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [FALLBACK_LOCALE];
  if (navigator.languages.length > 0) return navigator.languages;
  return [navigator.language || FALLBACK_LOCALE];
}

/** The OS locale used for `system` number formats. */
export function systemLocale(): string {
  return systemLanguages()[0] ?? FALLBACK_LOCALE;
}

export function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function systemPrefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
