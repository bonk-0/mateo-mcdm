import type { LinguisticScale as FuzzyScale } from '@mateo/fuzzy';
import type { LinguisticScale } from '@mateo/project';

/** A copy of a predefined scale for the project; the file always carries the scales it uses. */
export function projectScaleFrom(source: FuzzyScale, id: string): LinguisticScale {
  return {
    id,
    name: source.name,
    sourceId: source.id,
    numberType: 'tfn',
    terms: source.terms.map((term) => ({
      id: term.id,
      label: term.label,
      abbreviation: term.abbreviation,
      value: { l: term.value.l, m: term.value.m, u: term.value.u },
    })),
  };
}

export function uniqueScaleId(base: string, taken: readonly LinguisticScale[]): string {
  const used = new Set(taken.map((scale) => scale.id));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
