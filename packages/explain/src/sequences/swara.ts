import type { ExplainSequence } from '../types';

const text = (path: string): string => `explain:sequences.swara.${path}`;

/**
 * SWARA (Keršulienė et al. 2010): comparative importance s_j of each criterion against the
 * one before it → coefficients k_j = s_j + 1 → recalculated weights w_j = w_{j−1} / k_j →
 * normalized weights. Step and formula ids are those of the `swara` method in
 * `@mateo/methods`.
 */
export const swaraSequence: ExplainSequence = {
  methodId: 'swara',
  steps: {
    'comparative-importance': { view: 'bars' },
    coefficients: {
      view: 'bars',
      narration: {
        first: text('coefficients.first'),
        coefficient: text('coefficients.coefficient'),
      },
    },
    'recalculated-weights': {
      view: 'bars',
      narration: {
        first: text('recalculated-weights.first'),
        recalculated: text('recalculated-weights.recalculated'),
      },
    },
    weights: { view: 'bars', narration: { weight: text('weights.weight') } },
  },
};
