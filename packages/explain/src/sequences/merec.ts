import type { ExplainSequence } from '../types';

/**
 * MEREC (Keshavarz-Ghorabaee et al. 2021): the data → normalization → overall performance
 * S_i from the absolute logarithms → performance S′_ij with one criterion removed → removal
 * effects E_j → weights. Step ids are those of the `merec` method in `@mateo/methods`.
 */
export const merecSequence: ExplainSequence = {
  methodId: 'merec',
  textKey: 'merec',
  lesson: [
    { id: 'data', steps: ['initial-matrix'] },
    { id: 'normalize', steps: ['normalized-matrix'] },
    { id: 'performance', steps: ['absolute-logs', 'overall-performance'] },
    { id: 'removal', steps: ['removal-performance'] },
    { id: 'effects', steps: ['removal-effects'] },
    { id: 'weights', steps: ['weights'] },
  ],
  weights: 'weights',
};
