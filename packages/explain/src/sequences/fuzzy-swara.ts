import type { ExplainSequence } from '../types';

const text = (path: string): string => `explain:sequences.fuzzySwara.${path}`;

/**
 * Fuzzy SWARA (IMF SWARA): linguistic assessments s̃_j as TFNs →
 * k̃_j = s̃_j ⊕ 1 → q̃_j = q̃_{j−1} ⊘ k̃_j → Σ q̃_j → fuzzy weights w̃_j = q̃_j ⊘ Σ q̃ →
 * defuzzified weights → normalized crisp weights. Step and formula ids are those of the
 * `fuzzy-swara` method in `@mateo/methods`.
 */
export const fuzzySwaraSequence: ExplainSequence = {
  methodId: 'fuzzy-swara',
  steps: {
    assessments: { view: 'bars' },
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
    'recalculated-weights-sum': {
      view: 'value',
      narration: { sum: text('recalculated-weights-sum.sum') },
    },
    'fuzzy-weights': {
      view: 'bars',
      narration: { weight: text('fuzzy-weights.weight') },
    },
    'crisp-weights': {
      view: 'bars',
      narration: { defuzzify: text('crisp-weights.defuzzify') },
    },
    weights: { view: 'bars', narration: { normalized: text('weights.normalized') } },
  },
};
