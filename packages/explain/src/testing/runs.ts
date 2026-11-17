/** Real method runs for the tests of this package. */
import type { DecisionMatrix, WeightVector } from '@mateo/engine';
import { crispWeights, runMethod, textLiteral } from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import {
  criticMethod,
  fuzzyMarcosMethod,
  fuzzySwaraMethod,
  marcosMethod,
  merecMethod,
  swaraMethod,
} from '@mateo/methods';

/** Four phones on price (cost), memory and camera (benefit). */
export const PHONES = [
  [250, 16, 12],
  [200, 16, 8],
  [300, 32, 16],
  [275, 32, 8],
];
const DIRECTIONS = ['cost', 'benefit', 'benefit'] as const;
export const PHONE_WEIGHTS = [0.5, 0.3, 0.2];

function matrixOf<T>(
  values: readonly (readonly T[])[],
  directions: readonly ('benefit' | 'cost')[],
  numberType: string,
): DecisionMatrix<T> {
  return {
    alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`Phone ${i + 1}`) })),
    criteria: directions.map((direction, j) => ({
      id: `c${j + 1}`,
      name: textLiteral(`C${j + 1}`),
      direction,
      numberType,
    })),
    values: values.map((row) => [...row]),
  };
}

const weightsOf = (values: readonly number[]): WeightVector =>
  crispWeights(
    values.map((_, j) => `c${j + 1}`),
    [...values],
  );

export function marcosRun(params: { normalizeWeights?: boolean } = {}) {
  return runMethod(
    marcosMethod,
    { matrix: matrixOf(PHONES, DIRECTIONS, 'crisp'), weights: weightsOf(PHONE_WEIGHTS) },
    params,
  );
}

/** A 10 × 8 run: the size the timeline must animate smoothly (P1.13). */
export function largeMarcosRun() {
  const values = Array.from({ length: 10 }, (_, i) =>
    Array.from({ length: 8 }, (_, j) => 10 + ((i * 7 + j * 13 + i * j) % 29)),
  );
  const directions = Array.from({ length: 8 }, (_, j) =>
    j % 3 === 0 ? ('cost' as const) : ('benefit' as const),
  );
  return runMethod(marcosMethod, {
    matrix: matrixOf(values, directions, 'crisp'),
    weights: weightsOf([0.2, 0.1, 0.15, 0.1, 0.15, 0.1, 0.1, 0.1]),
  });
}

const fuzzy = (x: number): TFN => ({ l: x * 0.9, m: x, u: x * 1.1 });

export function fuzzyMarcosRun(
  options: { fuzzyWeights?: boolean; normalizeWeights?: boolean; centroid?: boolean } = {},
) {
  const matrix = matrixOf(
    PHONES.map((row) => row.map(fuzzy)),
    DIRECTIONS,
    'tfn',
  );
  const weights: WeightVector<TFN> | WeightVector = options.fuzzyWeights
    ? {
        numberType: 'tfn',
        entries: PHONE_WEIGHTS.map((value, j) => ({
          criterionId: `c${j + 1}`,
          value: fuzzy(value),
        })),
      }
    : weightsOf(PHONE_WEIGHTS);
  return runMethod(
    fuzzyMarcosMethod,
    { matrix, weights },
    {
      ...(options.normalizeWeights ? { normalizeWeights: true } : {}),
      ...(options.centroid ? { defuzzification: 'centroid' as const } : {}),
    },
  );
}

/** The phone matrix as input of the objective weighting methods. */
const weightingInput = () => ({ matrix: matrixOf(PHONES, DIRECTIONS, 'crisp') });

export function criticRun() {
  return runMethod(criticMethod, weightingInput(), {});
}

export function merecRun() {
  return runMethod(merecMethod, weightingInput(), {});
}

const ORDERED = ['c1', 'c2', 'c3', 'c4'].map((id) => ({ id, name: textLiteral(id.toUpperCase()) }));

export function swaraRun() {
  return runMethod(
    swaraMethod,
    { criteria: ORDERED, comparativeImportance: [null, 0.3, 0.2, 0.1] },
    {},
  );
}

export function fuzzySwaraRun(options: { centroid?: boolean } = {}) {
  return runMethod(
    fuzzySwaraMethod,
    { criteria: ORDERED, assessments: [null, 'WLS', 'ES', 'WLS'] },
    options.centroid ? { defuzzification: 'centroid' as const } : {},
  );
}
