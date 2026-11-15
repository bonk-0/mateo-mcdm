/**
 * Locale-aware formatting helpers built on `Intl`.
 *
 * Mateo keeps three independent settings (docs/plan.md §11): the UI language, the number
 * format used for display, and the number format used for import. A number format is
 * identified by a {@link NumberFormatId}; `system` follows the operating system.
 */

/** Number format presets, each named after its pattern for a thousand and a fraction. */
export const NUMBER_FORMATS = {
  /** 1,234.56 */
  'comma-dot': 'en-US',
  /** 1.234,56 */
  'dot-comma': 'tr-TR',
  /** 1 234,56 (narrow no-break space as the group separator) */
  'space-comma': 'fr-FR',
  /** 1’234.56 (or 1'234.56, depending on the CLDR version) */
  'apostrophe-dot': 'de-CH',
} as const satisfies Record<string, string>;

export type NumberFormatPreset = keyof typeof NUMBER_FORMATS;
export type NumberFormatId = 'system' | NumberFormatPreset;

export const NUMBER_FORMAT_IDS: readonly NumberFormatId[] = [
  'system',
  ...(Object.keys(NUMBER_FORMATS) as NumberFormatPreset[]),
];

export function isNumberFormatId(value: unknown): value is NumberFormatId {
  return typeof value === 'string' && (NUMBER_FORMAT_IDS as readonly string[]).includes(value);
}

/**
 * Turns a number format id into the BCP 47 locale `Intl` should use. `system` resolves to
 * `systemLocale`, which callers read from the environment (for example
 * `navigator.language`); the helper itself never touches globals.
 */
export function localeForNumberFormat(id: NumberFormatId, systemLocale: string): string {
  return id === 'system' ? systemLocale : NUMBER_FORMATS[id];
}

export interface NumberSeparators {
  readonly decimal: string;
  readonly group: string;
}

/** The decimal and group separators `Intl` uses for `locale`. */
export function numberSeparators(locale: string): NumberSeparators {
  const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(1234567.5);
  return {
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    group: parts.find((p) => p.type === 'group')?.value ?? '',
  };
}

export interface FormatNumberOptions {
  /** Exact number of fraction digits. When omitted, up to `maxFractionDigits` are shown. */
  readonly fractionDigits?: number;
  /** Upper bound on fraction digits when `fractionDigits` is not set. Defaults to 6. */
  readonly maxFractionDigits?: number;
  readonly useGrouping?: boolean;
}

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function cachedNumberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormatCache.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormatCache.set(key, format);
  }
  return format;
}

/**
 * Formats a number for display. Display precision only changes how a value looks; stored
 * values keep full precision (docs/plan.md §5). Non-finite values are shown as-is so that
 * invalid data is never disguised as a number.
 */
export function formatNumber(
  value: number,
  locale: string,
  options: FormatNumberOptions = {},
): string {
  if (!Number.isFinite(value)) return String(value);
  const { fractionDigits, maxFractionDigits = 6, useGrouping = true } = options;
  return cachedNumberFormat(locale, {
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? maxFractionDigits,
    useGrouping,
  }).format(value);
}

/** Formats a ratio (0.25) as a percentage (25%). */
export function formatPercent(value: number, locale: string, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return String(value);
  return cachedNumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export type DateStyle = 'short' | 'medium' | 'long';

/** Formats a date (and optionally its time) for display. */
export function formatDate(
  value: Date | number,
  locale: string,
  options: { readonly dateStyle?: DateStyle; readonly withTime?: boolean } = {},
): string {
  const { dateStyle = 'medium', withTime = false } = options;
  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(value);
}
