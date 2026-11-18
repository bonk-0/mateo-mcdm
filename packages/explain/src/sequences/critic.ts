import type { ExplainSequence } from '../types';

/**
 * CRITIC (Diakoulaki et al. 1995): the data → normalization → contrast (column means,
 * deviations d_ij and standard deviations σ_j) → correlation r_jk → conflict Σ(1 − r_jk) and
 * information content C_j = σ_j · conflict → weights. Step ids are those of the `critic`
 * method in `@mateo/methods`.
 */
export const criticSequence: ExplainSequence = {
  methodId: 'critic',
  textKey: 'critic',
  lesson: [
    { id: 'data', steps: ['initial-matrix'] },
    { id: 'normalize', steps: ['normalized-matrix'] },
    // Recorded since CRITIC 1.1.0. Analyses saved with 1.0.0 have no deviations step.
    {
      id: 'contrast',
      steps: ['means', 'deviations', 'standard-deviations'],
      optional: ['deviations'],
    },
    { id: 'correlation', steps: ['correlation-matrix'] },
    { id: 'information', steps: ['conflict', 'information-content'] },
    { id: 'weights', steps: ['weights'] },
  ],
  weights: 'weights',
};
