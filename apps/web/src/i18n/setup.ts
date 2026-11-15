import type { DEFAULT_NAMESPACE } from '@mateo/i18n';
import { createI18n, type CreateI18nOptions, type Language, type resources } from '@mateo/i18n';
import { initReactI18next } from 'react-i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: (typeof resources)['en'];
  }
}

/** Creates the app's i18next instance, bound to React. */
export function createAppI18n(
  language: Language,
  extra: Pick<CreateI18nOptions, 'plugins' | 'options'> = {},
) {
  return createI18n({
    language,
    plugins: [initReactI18next, ...(extra.plugins ?? [])],
    ...(extra.options ? { options: extra.options } : {}),
  });
}
