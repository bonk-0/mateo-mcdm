/**
 * English texts for the keys this package emits (ICU message format): validation messages
 * and the names and terms of the predefined scales. English is the source language;
 * `tr.ts` must define exactly the same keys.
 */
export const en = {
  'validation.tfn.invalid-value':
    'This is not a valid triangular fuzzy number. It needs three numbers: l, m and u.',
  'validation.tfn.invalid-order':
    'A triangular fuzzy number needs l ≤ m ≤ u; this one is ({l, number}, {m, number}, {u, number}).',
  'validation.tfn.negative-value':
    'The lower value is {l, number}; this method does not accept negative fuzzy numbers.',
  'validation.tfn.non-positive-value':
    'The lower value is {l, number}; this method needs fuzzy numbers greater than zero.',

  'validation.scale.too-few-terms':
    'A linguistic scale needs at least 2 terms; this one has {count, number}.',
  'validation.scale.invalid-term':
    'Term {position, number} needs an id, a label and an abbreviation.',
  'validation.scale.duplicate-term':
    '"{term}" is used by more than one term. Ids and abbreviations must be unique within a scale.',
  'validation.scale.not-monotonic':
    'The term "{term}" is not higher than "{previous}". Terms must be listed from lowest to highest.',
  'validation.scale.unknown-term': '"{term}" is not a term of the scale "{scale}".',

  'scales.five-level.name': '5-level scale',
  'scales.five-level.terms.very-low': 'Very low',
  'scales.five-level.terms.low': 'Low',
  'scales.five-level.terms.medium': 'Medium',
  'scales.five-level.terms.high': 'High',
  'scales.five-level.terms.very-high': 'Very high',

  'scales.seven-level.name': '7-level scale',
  'scales.seven-level.terms.very-low': 'Very low',
  'scales.seven-level.terms.low': 'Low',
  'scales.seven-level.terms.medium-low': 'Medium low',
  'scales.seven-level.terms.medium': 'Medium',
  'scales.seven-level.terms.medium-high': 'Medium high',
  'scales.seven-level.terms.high': 'High',
  'scales.seven-level.terms.very-high': 'Very high',

  'scales.fuzzy-marcos.name': 'Fuzzy MARCOS scale (Stanković et al. 2020)',
  'scales.fuzzy-marcos.terms.extremely-poor': 'Extremely poor',
  'scales.fuzzy-marcos.terms.very-poor': 'Very poor',
  'scales.fuzzy-marcos.terms.poor': 'Poor',
  'scales.fuzzy-marcos.terms.medium-poor': 'Medium poor',
  'scales.fuzzy-marcos.terms.medium': 'Medium',
  'scales.fuzzy-marcos.terms.medium-good': 'Medium good',
  'scales.fuzzy-marcos.terms.good': 'Good',
  'scales.fuzzy-marcos.terms.very-good': 'Very good',
  'scales.fuzzy-marcos.terms.extremely-good': 'Extremely good',

  'scales.imf-swara.name': 'IMF SWARA scale (Vrtagić et al. 2021)',
  'scales.imf-swara.terms.equally-significant': 'Equally significant',
  'scales.imf-swara.terms.weakly-less-significant': 'Weakly less significant',
  'scales.imf-swara.terms.moderately-less-significant': 'Moderately less significant',
  'scales.imf-swara.terms.less-significant': 'Less significant',
  'scales.imf-swara.terms.really-less-significant': 'Really less significant',
  'scales.imf-swara.terms.much-less-significant': 'Much less significant',
  'scales.imf-swara.terms.dominantly-less-significant': 'Dominantly less significant',
  'scales.imf-swara.terms.absolutely-less-significant': 'Absolutely less significant',
} as const;

export type FuzzyMessageKey = keyof typeof en;
