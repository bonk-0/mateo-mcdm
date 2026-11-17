import type { Dataset, LinguisticScale } from '@mateo/project';
import { FIVE_LEVEL_SCALE, FUZZY_MESSAGES } from '@mateo/fuzzy';
import { METHODS_MESSAGES } from '@mateo/methods';
import { EXPORT_MESSAGES } from './messages';
import type { ExportInfo, ExportLanguage, Translate } from './types';

/** A translator for tests: the export, fuzzy and engine texts of one language, plain lookup. */
export function translatorFor(language: ExportLanguage): Translate {
  const table: Record<string, string> = {
    ...FUZZY_MESSAGES[language],
    ...METHODS_MESSAGES[language],
    ...EXPORT_MESSAGES[language],
  };
  return (key, values) => {
    const text = table[key] ?? key;
    return text.replace(/\{(\w+)\}/gu, (_, name: string) => String(values?.[name] ?? ''));
  };
}

export const INFO: ExportInfo = {
  exportedAt: '2026-11-17T09:00:00.000Z',
  appVersion: '0.0.0-test',
  language: 'en',
};

export const PROJECT = { name: 'Supplier study', description: 'Test project' };

export const FIVE_LEVEL: LinguisticScale = {
  id: 'five-level',
  name: FIVE_LEVEL_SCALE.name,
  sourceId: FIVE_LEVEL_SCALE.id,
  numberType: 'tfn',
  terms: FIVE_LEVEL_SCALE.terms.map((term) => ({
    id: term.id,
    label: term.label,
    abbreviation: term.abbreviation,
    value: term.value,
  })),
};

const criterion = (
  n: number,
  name: string,
  direction: 'benefit' | 'cost',
  numberType: string,
  extra: { unit?: string; scaleId?: string } = {},
) => ({
  id: `c${n}`,
  code: `C${n}`,
  name,
  description: '',
  direction,
  unit: extra.unit ?? '',
  numberType,
  scaleId: extra.scaleId ?? null,
});

const alternative = (n: number, name: string) => ({
  id: `a${n}`,
  code: `A${n}`,
  name,
  description: '',
  group: '',
});

export function dataset(
  criteria: Dataset['criteria'],
  cells: Record<string, Record<string, Dataset['matrices'][number]['cells'][string][string]>>,
  names = ['Alpha', 'Beta', 'Gamma'],
): Dataset {
  return {
    id: 'd1',
    name: 'Suppliers',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    criteria,
    alternatives: names.map((name, i) => alternative(i + 1, name)),
    matrices: [{ id: 'm1', name: 'Decision matrix', role: 'decision', cells }],
  };
}

export const CRISP = dataset(
  [
    criterion(1, 'Price', 'cost', 'crisp', { unit: 'EUR' }),
    criterion(2, 'Quality', 'benefit', 'crisp'),
    criterion(3, 'Delivery time', 'cost', 'crisp'),
  ],
  {
    a1: {
      c1: { kind: 'crisp', value: 120.5 },
      c2: { kind: 'crisp', value: 0.1 + 0.2 },
      c3: { kind: 'crisp', value: 7 },
    },
    a2: {
      c1: { kind: 'crisp', value: 99.99 },
      c2: { kind: 'crisp', value: 0.9123456789012345 },
      c3: { kind: 'crisp', value: 3 },
    },
    a3: { c1: { kind: 'crisp', value: 1234.5 }, c2: { kind: 'crisp', value: 0.5 } },
  },
);

export const FUZZY = dataset(
  [
    criterion(1, 'Cost', 'cost', 'tfn'),
    criterion(2, 'Capacity', 'benefit', 'crisp'),
    criterion(3, 'Service', 'benefit', 'tfn', { scaleId: 'five-level' }),
    criterion(4, 'Safety', 'benefit', 'tfn', { scaleId: 'five-level' }),
  ],
  {
    a1: {
      c1: { kind: 'tfn', value: { l: 1.5, m: 2.25, u: 3 } },
      c2: { kind: 'crisp', value: 40 },
      c3: { kind: 'term', termId: FIVE_LEVEL.terms[3]!.id },
      c4: { kind: 'tfn', value: { l: 0.3, m: 0.5, u: 0.7 } },
    },
    a2: {
      c1: { kind: 'tfn', value: { l: 2, m: 3, u: 4 } },
      c2: { kind: 'crisp', value: 55 },
      c3: { kind: 'term', termId: FIVE_LEVEL.terms[1]!.id },
      c4: { kind: 'term', termId: FIVE_LEVEL.terms[2]!.id },
    },
    a3: {
      c1: { kind: 'tfn', value: { l: 0.1, m: 0.2, u: 0.35 } },
      c3: { kind: 'term', termId: FIVE_LEVEL.terms[4]!.id },
      c4: { kind: 'tfn', value: { l: 0.5, m: 0.7, u: 0.9 } },
    },
  },
);
