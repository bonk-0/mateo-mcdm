import type { TextRef } from '@mateo/engine';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PACKAGES_NAMESPACE } from '../i18n/setup';

export type MessageValues = Readonly<Record<string, string | number>>;

/**
 * Translates a key that a package emits (scale names, validation messages, command
 * labels). Keys of the form `matrix:commands.paste` come from the app's own catalog.
 */
export function useMessage(): (key: string, values?: MessageValues) => string {
  const { t, i18n } = useTranslation();
  // `i18n.language` is a dependency so that a language change rebuilds the function.
  const language = i18n.language;
  return useCallback(
    (key, values) => {
      void language;
      const translate = t as unknown as (key: string, options?: object) => string;
      const own = /^([a-z]+):(.+)$/u.exec(key);
      return own
        ? translate(own[2] as string, { ns: own[1] as string, ...values })
        : translate(key, { ns: PACKAGES_NAMESPACE, ...values });
    },
    [t, language],
  );
}

/** Resolves a text reference: a literal as it is, a key through the packages catalog. */
export function useTextRef(): (ref: TextRef) => string {
  const message = useMessage();
  return useCallback(
    (ref) =>
      'text' in ref ? ref.text : message(ref.key, 'params' in ref ? ref.params : undefined),
    [message],
  );
}
