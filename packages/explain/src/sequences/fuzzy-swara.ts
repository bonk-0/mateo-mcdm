import type { ExplainSequence } from '../types';

/**
 * IMF SWARA (Vrtagić et al. 2021): linguistic assessments as triangular fuzzy numbers →
 * fuzzy coefficients → recalculated fuzzy weights and their sum → fuzzy weights → crisp and
 * normalized weights. Step ids are those of the `fuzzy-swara` method in `@mateo/methods`.
 */
export const fuzzySwaraSequence: ExplainSequence = {
  methodId: 'fuzzy-swara',
  textKey: 'fuzzySwara',
  lesson: [
    { id: 'order', steps: ['assessments'] },
    { id: 'coefficients', steps: ['coefficients'] },
    { id: 'chain', steps: ['recalculated-weights', 'recalculated-weights-sum'] },
    { id: 'fuzzyWeights', steps: ['fuzzy-weights'] },
    { id: 'weights', steps: ['crisp-weights', 'weights'] },
  ],
  weights: 'weights',
};
