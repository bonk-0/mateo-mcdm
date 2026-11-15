/**
 * @mateo/i18n — translation catalogs, i18next setup and `Intl` formatting helpers.
 *
 * Environment-agnostic: nothing here reads browser or OS globals. Callers pass the
 * user's preferred languages and system locale in.
 */
export { DEFAULT_NAMESPACE, NAMESPACES, resources, type Namespace } from './catalogs';
export {
  checkCatalogs,
  flattenCatalog,
  formatCatalogIssues,
  messageArguments,
  type CatalogIssue,
  type CatalogIssueCode,
  type CatalogSet,
  type CatalogTree,
} from './check';
export {
  formatDate,
  formatNumber,
  formatPercent,
  isNumberFormatId,
  localeForNumberFormat,
  NUMBER_FORMAT_IDS,
  NUMBER_FORMATS,
  numberSeparators,
  type DateStyle,
  type FormatNumberOptions,
  type NumberFormatId,
  type NumberFormatPreset,
  type NumberSeparators,
} from './format';
export { createI18n, type CreateI18nOptions } from './instance';
export {
  isLanguage,
  LANGUAGE_DEFAULT_LOCALE,
  LANGUAGE_NATIVE_NAMES,
  resolveLanguage,
  SOURCE_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type Language,
} from './locales';
