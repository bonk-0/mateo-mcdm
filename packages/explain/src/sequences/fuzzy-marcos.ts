import type { ExplainSequence } from '../types';

/**
 * Fuzzy MARCOS (Stanković et al. 2020): the MARCOS lesson on triangular fuzzy numbers, with
 * the steps the fuzzy formulation adds: T̃_i = K̃_i⁻ ⊕ K̃_i⁺, D̃ = max T̃_i and its crisp value
 * df_crisp before the utility functions, and the defuzzification before the final utility.
 * Step ids are those of the `fuzzy-marcos` method.
 */
export const fuzzyMarcosSequence: ExplainSequence = {
  methodId: 'fuzzy-marcos',
  textKey: 'fuzzyMarcos',
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
    {
      id: 'utility',
      steps: [
        'utility-degree-sums',
        'max-utility-degree-sum',
        'max-utility-degree-sum-crisp',
        'utility-functions',
      ],
    },
    { id: 'crisp', steps: ['defuzzification', 'final-utility'] },
    { id: 'ranking', steps: ['ranking'], story: true },
  ],
  weights: 'weights',
  story: { scores: 'final-utility', ranks: 'ranking', contributions: 'weighted-matrix' },
};
