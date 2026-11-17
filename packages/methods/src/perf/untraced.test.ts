/**
 * `recordTrace: false` skips the trace but must not change a single number: a sensitivity
 * sweep runs the methods this way and its chart has to equal what a traced run reports.
 */
import type { Method, ParameterSchema } from '@mateo/engine';
import { crispWeights, runMethod, textLiteral } from '@mateo/engine';
import { IMF_SWARA_SCALE } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import {
  criticMethod,
  fuzzyMarcosMethod,
  fuzzySwaraMethod,
  marcosMethod,
  merecMethod,
  swaraMethod,
} from '../index';

const ALTERNATIVES = 40;
const CRITERIA = 8;

function matrix() {
  let seed = 4242;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return {
    alternatives: Array.from({ length: ALTERNATIVES }, (_, i) => ({
      id: `a${i}`,
      name: textLiteral(`A${i + 1}`),
    })),
    criteria: Array.from({ length: CRITERIA }, (_, j) => ({
      id: `c${j}`,
      name: textLiteral(`C${j + 1}`),
      direction: j % 3 === 0 ? ('cost' as const) : ('benefit' as const),
      numberType: 'crisp' as const,
    })),
    values: Array.from({ length: ALTERNATIVES }, () =>
      Array.from({ length: CRITERIA }, () => 1 + next() * 999),
    ),
  };
}

const ids = Array.from({ length: CRITERIA }, (_, j) => `c${j}`);
const weights = () =>
  crispWeights(
    ids,
    ids.map((_, j) => (j + 1) / ((CRITERIA * (CRITERIA + 1)) / 2)),
  );

const swaraCriteria = ids.map((id, j) => ({ id, name: textLiteral(`C${j + 1}`) }));

const cases = [
  ['MARCOS', () => runCase(marcosMethod, { matrix: matrix(), weights: weights() })],
  [
    'Fuzzy MARCOS',
    () => {
      const crisp = matrix();
      return runCase(fuzzyMarcosMethod, {
        matrix: {
          ...crisp,
          criteria: crisp.criteria.map((criterion) => ({ ...criterion, numberType: 'tfn' })),
          values: crisp.values.map((row) => row.map((x) => ({ l: x, m: x + 1, u: x + 3 }))),
        },
        weights: weights(),
      });
    },
  ],
  ['CRITIC', () => runCase(criticMethod, { matrix: matrix() })],
  ['MEREC', () => runCase(merecMethod, { matrix: matrix() })],
  [
    'SWARA',
    () =>
      runCase(swaraMethod, {
        criteria: swaraCriteria,
        comparativeImportance: ids.map((_, j) => (j === 0 ? null : 0.1 + (j % 5) * 0.05)),
      }),
  ],
  [
    'Fuzzy SWARA',
    () =>
      runCase(fuzzySwaraMethod, {
        criteria: swaraCriteria,
        assessments: ids.map((_, j) => (j === 0 ? null : IMF_SWARA_SCALE.terms[1 + (j % 6)]!.id)),
      }),
  ],
] as const;

function runCase<TInput, TSchema extends ParameterSchema, TResult>(
  method: Method<TInput, TSchema, TResult>,
  input: TInput,
) {
  const traced = runMethod(method, input);
  const untraced = runMethod(method, input, undefined, { recordTrace: false });
  return { traced, untraced };
}

describe('runMethod with recordTrace: false', () => {
  it.each(cases)('%s gives the same result as a traced run, bit for bit', (_name, run) => {
    const { traced, untraced } = run();
    expect(traced.trace.steps.length).toBeGreaterThan(0);
    expect(untraced.trace.steps).toHaveLength(0);
    expect(untraced.trace.methodId).toBe(traced.trace.methodId);
    expect(untraced.result).toStrictEqual(traced.result);
    expect(JSON.stringify(untraced.result)).toBe(JSON.stringify(traced.result));
    expect(untraced.parameters).toStrictEqual(traced.parameters);
    expect(untraced.warnings).toStrictEqual(traced.warnings);
  });
});
