import type { ExplainSequence } from '../types';

const text = (path: string): string => `explain:sequences.merec.${path}`;

/**
 * MEREC (Keshavarz-Ghorabaee et al. 2021): initial matrix → normalized matrix → |ln n_ij| →
 * overall performance S_i → performance S'_ij with one criterion removed → removal effect
 * E_j → weights. Step and formula ids are those of the `merec` method in `@mateo/methods`.
 */
export const merecSequence: ExplainSequence = {
  methodId: 'merec',
  steps: {
    'initial-matrix': { view: 'matrix' },
    'normalized-matrix': {
      view: 'matrix',
      narration: {
        benefit: text('normalized-matrix.benefit'),
        cost: text('normalized-matrix.cost'),
      },
    },
    'absolute-logs': { view: 'matrix', narration: { 'abs-ln': text('absolute-logs.abs-ln') } },
    'overall-performance': {
      view: 'bars',
      narration: { overall: text('overall-performance.overall') },
    },
    // S'_ij leaves the criterion of its own column out: the row of |ln n| flies in whole.
    'removal-performance': {
      view: 'matrix',
      sources: ['absolute-logs'],
      narration: { removal: text('removal-performance.removal') },
    },
    'removal-effects': {
      view: 'bars',
      sources: ['removal-performance', 'overall-performance'],
      narration: { effect: text('removal-effects.effect') },
    },
    weights: { view: 'bars', narration: { weight: text('weights.weight') } },
  },
};
