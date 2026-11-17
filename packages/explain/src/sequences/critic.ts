import type { ExplainSequence } from '../types';

const text = (path: string): string => `explain:sequences.critic.${path}`;

/**
 * CRITIC (Diakoulaki et al. 1995): initial matrix → normalized matrix → column means →
 * deviations d_ij from the mean → standard deviations σ_j (contrast intensity) →
 * correlation matrix r_jk → conflict
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
    // Recorded since CRITIC 1.1.0. Analyses saved with 1.0.0 have no such step, so it is
    // optional, and the next two steps show the steps they actually read (their sources in
    // the trace) instead of naming them.
    deviations: {
      view: 'matrix',
      optional: true,
      sources: ['normalized-matrix', 'means'],
      narration: { deviation: text('deviations.deviation') },
    },
    'standard-deviations': {
      view: 'bars',
      narration: { sigma: text('standard-deviations.sigma') },
    },
    'correlation-matrix': {
      view: 'matrix',
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
