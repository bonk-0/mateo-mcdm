import type { DecisionMatrix } from '../model/matrix';
import type { WeightVector } from '../model/weights';
import { crispWeights } from '../model/weights';
import type { WeightedSumInput } from './weighted-sum';

/**
 * Three alternatives, one benefit and one cost criterion. With `max` normalization:
 * normalized C1 = 0.5, 1, 0.25 and C2 = 2/4, 2/2, 2/8; scores = 0.5, 1, 0.25.
 */
export function sampleMatrix(): DecisionMatrix<number> {
  return {
    alternatives: [
      { id: 'a1', name: { text: 'Alpha' } },
      { id: 'a2', name: { text: 'Beta' } },
      { id: 'a3', name: { text: 'Gamma' } },
    ],
    criteria: [
      { id: 'c1', name: { text: 'Quality' }, direction: 'benefit', numberType: 'crisp' },
      {
        id: 'c2',
        name: { text: 'Price' },
        direction: 'cost',
        unit: 'EUR',
        numberType: 'crisp',
      },
    ],
    values: [
      [10, 4],
      [20, 2],
      [5, 8],
    ],
  };
}

export function sampleWeights(): WeightVector {
  return crispWeights(['c1', 'c2'], [0.6, 0.4]);
}

export function sampleInput(): WeightedSumInput {
  return { matrix: sampleMatrix(), weights: sampleWeights() };
}
