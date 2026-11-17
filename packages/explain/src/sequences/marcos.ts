import type { ExplainSequence } from '../types';

const text = (path: string): string => `explain:sequences.marcos.${path}`;

/**
 * MARCOS, in the order of docs/plan.md §8.3: initial matrix → extended matrix with the
 * anti-ideal (AAI) and ideal (AI) rows → normalization → weighted matrix → sums S_i →
 * utility degrees K_i⁻, K_i⁺ → utility functions f(K_i⁻), f(K_i⁺) → final utility f(K_i) →
 * ranking. Step and formula ids are those of the `marcos` method in `@mateo/methods`.
 */
export const marcosSequence: ExplainSequence = {
  methodId: 'marcos',
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
    'utility-functions': {
      view: 'matrix',
      sources: ['utility-degrees'],
      narration: {
        'f-k-minus': text('utility-functions.f-k-minus'),
        'f-k-plus': text('utility-functions.f-k-plus'),
      },
    },
    'final-utility': {
      view: 'bars',
      sources: ['utility-degrees', 'utility-functions'],
      narration: { 'final-utility': text('final-utility.final-utility') },
    },
    // Every rank depends on every score; only the own score flies into its rank.
    ranking: { view: 'ranking', sources: ['final-utility'], flights: 'direct' },
  },
  story: { scores: 'final-utility', ranks: 'ranking', contributions: 'weighted-matrix' },
};
