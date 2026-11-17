import type { ExplainSequence } from '../types';

const text = (path: string): string => `explain:sequences.fuzzyMarcos.${path}`;

/**
 * Fuzzy MARCOS (Stanković et al. 2020): the MARCOS sequence on triangular fuzzy numbers,
 * plus the steps the fuzzy formulation adds: T̃_i = K̃_i⁻ ⊕ K̃_i⁺, D̃ = max T̃_i, its crisp
 * value df_crisp, and the defuzzification of the utility degrees and functions before the
 * final utility. Step and formula ids are those of the `fuzzy-marcos` method.
 */
export const fuzzyMarcosSequence: ExplainSequence = {
  methodId: 'fuzzy-marcos',
  steps: {
    'initial-matrix': { view: 'matrix' },
    weights: { view: 'bars' },
    'normalized-weights': {
      view: 'bars',
      optional: true,
      narration: { 'normalized-weight': text('normalized-weights.normalized-weight') },
    },
    'extended-matrix': {
      view: 'matrix',
      sources: ['initial-matrix'],
      narration: {
        'anti-ideal-benefit': text('extended-matrix.anti-ideal-benefit'),
        'anti-ideal-cost': text('extended-matrix.anti-ideal-cost'),
        'ideal-benefit': text('extended-matrix.ideal-benefit'),
        'ideal-cost': text('extended-matrix.ideal-cost'),
      },
    },
    'normalized-matrix': {
      view: 'matrix',
      sources: ['extended-matrix'],
      narration: {
        benefit: text('normalized-matrix.benefit'),
        cost: text('normalized-matrix.cost'),
      },
    },
    'weighted-matrix': {
      view: 'matrix',
      narration: { weighted: text('weighted-matrix.weighted') },
    },
    sums: {
      view: 'bars',
      sources: ['weighted-matrix'],
      narration: { sum: text('sums.sum') },
    },
    'utility-degrees': {
      view: 'matrix',
      sources: ['sums'],
      narration: {
        'k-minus': text('utility-degrees.k-minus'),
        'k-plus': text('utility-degrees.k-plus'),
      },
    },
    'utility-degree-sums': {
      view: 'bars',
      sources: ['utility-degrees'],
      narration: { t: text('utility-degree-sums.t') },
    },
    'max-utility-degree-sum': {
      view: 'value',
      sources: ['utility-degree-sums'],
      narration: { d: text('max-utility-degree-sum.d') },
    },
    'max-utility-degree-sum-crisp': {
      view: 'value',
      sources: ['max-utility-degree-sum'],
      narration: { df: text('max-utility-degree-sum-crisp.df') },
    },
    'utility-functions': {
      view: 'matrix',
      sources: ['utility-degrees', 'max-utility-degree-sum-crisp'],
      narration: {
        'f-k-minus': text('utility-functions.f-k-minus'),
        'f-k-plus': text('utility-functions.f-k-plus'),
      },
    },
    defuzzification: {
      view: 'matrix',
      sources: ['utility-degrees', 'utility-functions'],
      narration: { defuzzify: text('defuzzification.defuzzify') },
    },
    'final-utility': {
      view: 'bars',
      sources: ['defuzzification'],
      narration: { 'final-utility': text('final-utility.final-utility') },
    },
    ranking: { view: 'ranking', sources: ['final-utility'], flights: 'direct' },
  },
  story: { scores: 'final-utility', ranks: 'ranking', contributions: 'weighted-matrix' },
};
