import type { ExplainSequence } from '../types';

/**
 * SWARA (Keršulienė et al. 2010): the comparative importance s_j of each criterion against
 * the one before it → coefficients k_j → recalculated weights → normalized weights. Step ids
 * are those of the `swara` method in `@mateo/methods`.
 */
export const swaraSequence: ExplainSequence = {
  methodId: 'swara',
  textKey: 'swara',
  lesson: [
    { id: 'order', steps: ['comparative-importance'] },
    { id: 'coefficients', steps: ['coefficients'] },
    { id: 'chain', steps: ['recalculated-weights'] },
    { id: 'weights', steps: ['weights'] },
  ],
  weights: 'weights',
};
