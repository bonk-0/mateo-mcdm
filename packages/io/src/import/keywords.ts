/**
 * Words the structure detection recognises, in English and Turkish. Every list holds
 * folded text (see {@link fold}): lower case, no diacritics, single spaces.
 */
import type { CriterionDirection } from '@mateo/engine';
import { cleanLabel, fold } from './text';

const BENEFIT_WORDS = [
  'benefit',
  'beneficial',
  'max',
  'max.',
  'maks',
  'maks.',
  'maximum',
  'maksimum',
  'maximize',
  'maximise',
  'maksimize',
  'maximization',
  'maksimizasyon',
  'fayda',
  'faydali',
  'fayda kriteri',
  'fayda yonlu',
  '+',
  '↑',
];

const COST_WORDS = [
  'cost',
  'non-beneficial',
  'nonbeneficial',
  'non beneficial',
  'min',
  'min.',
  'minimum',
  'minimize',
  'minimise',
  'minimize et',
  'minimization',
  'minimizasyon',
  'maliyet',
  'maliyetli',
  'maliyet kriteri',
  'maliyet yonlu',
  '-',
  '\u2212',
  '↓',
];

const DIRECTIONS = new Map<string, CriterionDirection>([
  ...BENEFIT_WORDS.map((word): [string, CriterionDirection] => [word, 'benefit']),
  ...COST_WORDS.map((word): [string, CriterionDirection] => [word, 'cost']),
]);

/** `B` and `C` count as directions only in a row labelled as a direction row. */
const LETTER_DIRECTIONS = new Map<string, CriterionDirection>([
  ['b', 'benefit'],
  ['c', 'cost'],
]);

/** The direction a cell of a direction row names, or `undefined`. */
export function directionWord(
  text: string,
  options: { letters?: boolean } = {},
): CriterionDirection | undefined {
  const word = fold(text);
  return DIRECTIONS.get(word) ?? (options.letters ? LETTER_DIRECTIONS.get(word) : undefined);
}

function matcher(words: readonly string[]): (text: string) => boolean {
  const set = new Set(words);
  return (text) => {
    const word = fold(text).replace(/[:.]+$/, '');
    return word !== '' && set.has(word);
  };
}

export const isDirectionLabel = matcher([
  'yon',
  'yonu',
  'yonler',
  'kriter yonu',
  'tur',
  'turu',
  'tip',
  'kriter turu',
  'kriter tipi',
  'amac',
  'hedef',
  'optimizasyon',
  'optimizasyon yonu',
  'max/min',
  'min/max',
  'maks/min',
  'fayda/maliyet',
  'direction',
  'directions',
  'type',
  'criterion type',
  'criteria type',
  'optimization',
  'optimisation',
  'objective',
  'goal',
  'benefit/cost',
  'b/c',
]);

export const isUnitLabel = matcher(['birim', 'birimi', 'birimler', 'olcu birimi', 'unit', 'units']);

export const isWeightLabel = matcher([
  'agirlik',
  'agirliklar',
  'agirliklari',
  'kriter agirligi',
  'kriter agirliklari',
  'onem agirligi',
  'onem',
  'weight',
  'weights',
  'criteria weights',
  'criterion weights',
  'criterion weight',
  'w',
  'wj',
  'w_j',
  'w(j)',
]);

export const isAggregateLabel = matcher([
  'toplam',
  'genel toplam',
  'ara toplam',
  'ortalama',
  'ort',
  'aritmetik ortalama',
  'medyan',
  'standart sapma',
  'std sapma',
  'std',
  'ss',
  'sum',
  'total',
  'grand total',
  'subtotal',
  'average',
  'avg',
  'mean',
  'median',
  'standard deviation',
  'st dev',
  'stdev',
  'max',
  'maks',
  'maksimum',
  'maximum',
  'min',
  'minimum',
  'en buyuk',
  'en kucuk',
]);

export const isIdealLabel = matcher([
  'ai',
  'aai',
  'ideal',
  'anti-ideal',
  'anti ideal',
  'ideal cozum',
  'anti-ideal cozum',
  'pozitif ideal',
  'negatif ideal',
  'positive ideal',
  'negative ideal',
  'a+',
  'a-',
  'a*',
]);

export const isRowNumberHeader = matcher([
  'no',
  'nr',
  '#',
  'sira',
  'sira no',
  's no',
  's.no',
  's. no',
  'sn',
  'index',
  'row',
  'satir',
  'satir no',
]);

export const isIdHeader = matcher([
  'alternatif',
  'alternatifler',
  'alternative',
  'alternatives',
  'alt',
  'alt.',
  'secenek',
  'secenekler',
  'option',
  'options',
  'ad',
  'adi',
  'isim',
  'name',
  'tedarikci',
  'tedarikciler',
  'supplier',
  'suppliers',
  'firma',
  'firmalar',
  'sirket',
  'company',
  'aday',
  'candidate',
  'proje',
  'project',
  'ulke',
  'country',
  'il',
  'sehir',
  'city',
  'yil',
  'year',
  'donem',
  'period',
]);

const MISSING_WORDS = new Set([
  '-',
  '\u2013',
  '\u2014',
  '--',
  '?',
  '.',
  '..',
  '...',
  'n/a',
  'na',
  'n.a.',
  'nan',
  'null',
  'none',
  'yok',
  'bos',
  'eksik',
  'veri yok',
  'missing',
  '#n/a',
  '#yok',
]);

/** Text that a spreadsheet uses for "no value": `-`, `N/A`, `yok`, `?`... */
export function isMissingPlaceholder(text: string): boolean {
  return MISSING_WORDS.has(fold(text));
}

/** Component of a TFN named by a header suffix or a sub-header cell. */
export type TfnComponent = 'l' | 'm' | 'u';

const COMPONENT_WORDS = new Map<string, TfnComponent>([
  ['l', 'l'],
  ['low', 'l'],
  ['lower', 'l'],
  ['alt', 'l'],
  ['m', 'm'],
  ['mid', 'm'],
  ['middle', 'm'],
  ['mode', 'm'],
  ['orta', 'm'],
  ['u', 'u'],
  ['up', 'u'],
  ['upper', 'u'],
  ['ust', 'u'],
]);

/** A cell that only names a TFN component: `l`, `M`, `upper`, `Üst`, `(u)`... */
export function componentWord(text: string): TfnComponent | undefined {
  return COMPONENT_WORDS.get(fold(text).replace(/^[([{]\s*|\s*[)\]}]$/g, ''));
}

const COMPONENT_SUFFIX =
  /^(?<base>.*?\S)(?:\s*[_.\-:/]\s*|\s+|\s*[([{]\s*)(?<token>l|low|lower|alt|m|mid|middle|mode|orta|u|up|upper|üst|ust)\s*[)\]}]?$/iu;

/** Splits a header such as `C1_l`, `Kalite (m)` or `Fiyat-Üst` into its base and component. */
export function splitComponentHeader(
  header: string,
): { base: string; component: TfnComponent } | undefined {
  const match = COMPONENT_SUFFIX.exec(cleanLabel(header));
  const base = match?.groups?.['base'];
  const token = match?.groups?.['token'];
  if (base === undefined || token === undefined) return undefined;
  const component = COMPONENT_WORDS.get(fold(token));
  return component === undefined ? undefined : { base: cleanLabel(base), component };
}

const DIRECTION_SUFFIX =
  /^(?<base>.*?\S)\s*(?:[([{]\s*(?<word>max\.?|maks\.?|min\.?|benefit|cost|fayda|maliyet|\+|-|\u2212|↑|↓)\s*[)\]}]|(?<arrow>↑|↓))$/iu;

/** Splits a header such as `Fiyat (min)`, `Quality [max]` or `Süre ↓` into name and direction. */
export function splitDirectionHeader(
  header: string,
): { base: string; direction: CriterionDirection } | undefined {
  const match = DIRECTION_SUFFIX.exec(cleanLabel(header));
  const base = match?.groups?.['base'];
  const word = match?.groups?.['word'] ?? match?.groups?.['arrow'];
  if (base === undefined || word === undefined) return undefined;
  const direction = directionWord(word);
  return direction === undefined ? undefined : { base: cleanLabel(base), direction };
}
