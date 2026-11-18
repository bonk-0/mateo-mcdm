import type { ExplainSequence } from '../types';

/**
 * MARCOS (Stević et al. 2020), in the order of docs/plan.md §8.3: the decision → the ideal
 * (AI) and anti-ideal (AAI) rows → normalization → weighted values and their sums S_i →
 * utility degrees K_i⁻, K_i⁺ → utility functions and the final utility f(K_i) → the ranking.
 * Step ids are those of the `marcos` method in `@mateo/methods`.
 */
export const marcosSequence: ExplainSequence = {
  methodId: 'marcos',
  textKey: 'marcos',
  lesson: [
    {
      id: 'decision',
      steps: ['initial-matrix', 'weights', 'normalized-weights'],
      optional: ['normalized-weights'],
    },
    { id: 'reference', steps: ['extended-matrix'] },
    { id: 'normalize', steps: ['normalized-matrix'] },
    { id: 'weigh', steps: ['weighted-matrix', 'sums'] },
    { id: 'degrees', steps: ['utility-degrees'] },
    { id: 'utility', steps: ['utility-functions', 'final-utility'] },
    { id: 'ranking', steps: ['ranking'], story: true },
  ],
  weights: 'weights',
  story: { scores: 'final-utility', ranks: 'ranking', contributions: 'weighted-matrix' },
};
