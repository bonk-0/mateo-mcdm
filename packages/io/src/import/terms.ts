/**
 * Matching linguistic text cells against linguistic scales. A cell names a term by its id
 * (`very-good`, `very good`), its abbreviation (`VG`) or its label in English or Turkish
 * (`Very good`, `Çok iyi`), ignoring case, diacritics and extra spaces.
 */
import type { TextRef } from '@mateo/engine';
import type { LinguisticScale, LinguisticTerm } from '@mateo/fuzzy';
import {
  FIVE_LEVEL_SCALE,
  FUZZY_MARCOS_SCALE,
  FUZZY_MESSAGES,
  SEVEN_LEVEL_SCALE,
} from '@mateo/fuzzy';
import { fold } from './text';

/** Rating scales tried when the caller gives none: the predefined rating scales. */
export const DEFAULT_IMPORT_SCALES: readonly LinguisticScale[] = [
  FIVE_LEVEL_SCALE,
  SEVEN_LEVEL_SCALE,
  FUZZY_MARCOS_SCALE,
];

/** Texts a label stands for: the literal text, or the English and Turkish messages of a key. */
export type LabelTexts = (label: TextRef) => readonly string[];

const messageTables = Object.values(FUZZY_MESSAGES) as readonly Readonly<Record<string, string>>[];

export const defaultLabelTexts: LabelTexts = (label) => {
  if ('text' in label) return [label.text];
  return messageTables
    .map((table) => table[label.key])
    .filter((text): text is string => text !== undefined);
};

export interface TermIndex {
  readonly scales: readonly LinguisticScale[];
  /** Folded text → for each scale that has a term with that text, the term. */
  readonly lookup: ReadonlyMap<string, ReadonlyMap<string, LinguisticTerm>>;
}

export function buildTermIndex(
  scales: readonly LinguisticScale[],
  labelTexts: LabelTexts = defaultLabelTexts,
): TermIndex {
  const lookup = new Map<string, Map<string, LinguisticTerm>>();
  for (const scale of scales) {
    for (const term of scale.terms) {
      const names = [
        term.id,
        term.id.replace(/[-_]+/g, ' '),
        term.abbreviation,
        ...labelTexts(term.label),
      ];
      for (const name of names) {
        const key = fold(name);
        if (key === '') continue;
        let byScale = lookup.get(key);
        if (byScale === undefined) {
          byScale = new Map();
          lookup.set(key, byScale);
        }
        // Within a scale the first term with a text keeps it.
        if (!byScale.has(scale.id)) byScale.set(scale.id, term);
      }
    }
  }
  return { scales, lookup };
}

/** True when some scale of the index has a term with this text. */
export function isTermText(index: TermIndex, text: string): boolean {
  return index.lookup.has(fold(text));
}

/** The term of `scaleId` that a text names, or `undefined`. */
export function termOf(
  index: TermIndex,
  scaleId: string,
  text: string,
): LinguisticTerm | undefined {
  return index.lookup.get(fold(text))?.get(scaleId);
}

/** Scales that have a term for every one of the texts, in the order of the index. */
export function scalesCovering(index: TermIndex, texts: Iterable<string>): LinguisticScale[] {
  const folded = [...new Set([...texts].map(fold))];
  return index.scales.filter((scale) =>
    folded.every((text) => index.lookup.get(text)?.has(scale.id) === true),
  );
}
