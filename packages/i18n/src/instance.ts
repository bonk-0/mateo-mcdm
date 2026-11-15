import i18next, { type i18n, type InitOptions, type Module, type ThirdPartyModule } from 'i18next';
import ICU from 'i18next-icu';
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from './catalogs';
import { SOURCE_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from './locales';

export interface CreateI18nOptions {
  readonly language: Language;
  /** Extra i18next plugins, for example `initReactI18next` from the web app. */
  readonly plugins?: readonly (Module | ThirdPartyModule)[];
  /** Extra i18next options, for example a post-processor in tests. */
  readonly options?: Omit<InitOptions, 'lng' | 'resources'>;
}

/**
 * Creates an isolated, synchronously initialised i18next instance with ICU message format
 * and every shipped catalog loaded. The catalogs are bundled, so no network or file I/O
 * happens at runtime.
 */
export function createI18n({ language, plugins = [], options = {} }: CreateI18nOptions): i18n {
  const instance = i18next.createInstance();
  instance.use(new ICU());
  for (const plugin of plugins) instance.use(plugin);
  void instance.init({
    lng: language,
    fallbackLng: SOURCE_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    resources,
    initAsync: false,
    returnNull: false,
    interpolation: { escapeValue: false },
    ...options,
  });
  return instance;
}
