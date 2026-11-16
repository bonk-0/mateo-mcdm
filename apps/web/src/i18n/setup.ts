import type { DEFAULT_NAMESPACE } from '@mateo/i18n';
import { createI18n, type CreateI18nOptions, type Language, type resources } from '@mateo/i18n';
import { ENGINE_MESSAGES } from '@mateo/engine';
import { FUZZY_MESSAGES } from '@mateo/fuzzy';
import { PROJECT_MESSAGES } from '@mateo/project';
import { initReactI18next } from 'react-i18next';

/** Namespace of the texts that the engine, fuzzy and project packages ship themselves. */
export const PACKAGES_NAMESPACE = 'packages';

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
  const instance = createI18n({
    language,
    plugins: [initReactI18next, ...(extra.plugins ?? [])],
    ...(extra.options ? { options: extra.options } : {}),
  });
  // Their keys are flat and contain dots, so they live in a namespace of their own.
  for (const code of ['en', 'tr'] as const) {
    instance.addResourceBundle(
      code,
      PACKAGES_NAMESPACE,
      { ...ENGINE_MESSAGES[code], ...FUZZY_MESSAGES[code], ...PROJECT_MESSAGES[code] },
      false,
      true,
    );
  }
  return instance;
}
