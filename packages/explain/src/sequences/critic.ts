import type { ExplainSequence } from '../types';

const text = (path: string): string => `explain:sequences.critic.${path}`;

/**
 * CRITIC (Diakoulaki et al. 1995): initial matrix → normalized matrix → column means →
 * standard deviations σ_j (contrast intensity) → correlation matrix r_jk → conflict
 * Σ(1 − r_jk) → information content C_j = σ_j · conflict → weights. Step and formula ids
 * are those of the `critic` method in `@mateo/methods`.
 */
export const criticSequence: ExplainSequence = {
  methodId: 'critic',
  steps: {
    'initial-matrix': { view: 'matrix' },
    'normalized-matrix': {
      view: 'matrix',
      narration: {
        benefit: text('normalized-matrix.benefit'),
        cost: text('normalized-matrix.cost'),
      },
    },
    means: { view: 'bars', narration: { mean: text('means.mean') } },
    'standard-deviations': {
      view: 'bars',
      sources: ['normalized-matrix', 'means'],
      narration: { sigma: text('standard-deviations.sigma') },
    },
    'correlation-matrix': {
      view: 'matrix',
      sources: ['normalized-matrix'],
      narration: { pearson: text('correlation-matrix.pearson') },
    },
    conflict: { view: 'bars', narration: { conflict: text('conflict.conflict') } },
    'information-content': {
      view: 'bars',
      narration: { information: text('information-content.information') },
    },
    weights: { view: 'bars', narration: { weight: text('weights.weight') } },
  },
};
