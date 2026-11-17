import { runMethod, textLiteral, type WeightVector } from '@mateo/engine';
import { marcosMethod } from '@mateo/methods';
import type { StoredAnalysis } from '@mateo/project';
import { describe, expect, it } from 'vitest';
import {
  baseOfAnalysis,
  makeScenario,
  rankWithWeights,
  readScenarios,
  scenariosKey,
  scenariosValue,
  scenarioWeights,
  sweepCriterion,
} from './sensitivity';

const VALUES = [
  [250, 16, 12],
  [200, 16, 8],
  [300, 32, 16],
  [275, 32, 8],
];
const matrix = {
  alternatives: VALUES.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`Phone ${i + 1}`) })),
  criteria: ['Price', 'Memory', 'Camera'].map((name, j) => ({
    id: `c${j + 1}`,
    name: textLiteral(name),
    direction: j === 0 ? ('cost' as const) : ('benefit' as const),
    numberType: 'crisp' as const,
  })),
  values: VALUES,
};
const weights: WeightVector = {
  numberType: 'crisp',
  entries: [
    { criterionId: 'c1', value: 0.5 },
    { criterionId: 'c2', value: 0.3 },
    { criterionId: 'c3', value: 0.2 },
  ],
};

function storedAnalysis(methodId = 'marcos', w: WeightVector = weights): StoredAnalysis {
  const input = { matrix, weights: w };
  const record = runMethod(marcosMethod, input, {});
  return { methodId, methodInput: input, record } as unknown as StoredAnalysis;
}

function base() {
  const result = baseOfAnalysis(storedAnalysis());
  if (!result.ok) throw new Error('no base');
  return result.base;
}

describe('baseOfAnalysis', () => {
  it('reads matrix, weights and parameters of a MARCOS analysis', () => {
    const b = base();
    expect(b.criterionIds).toEqual(['c1', 'c2', 'c3']);
    expect(b.weights).toEqual([0.5, 0.3, 0.2]);
  });

  it('refuses weighting analyses and fuzzy weights', () => {
    expect(baseOfAnalysis(storedAnalysis('critic'))).toEqual({ ok: false, reason: 'not-ranking' });
    const fuzzy = { ...weights, numberType: 'tfn' } as WeightVector;
    expect(baseOfAnalysis(storedAnalysis('marcos', fuzzy))).toEqual({
      ok: false,
      reason: 'fuzzy-weights',
    });
  });
});

describe('sweepCriterion', () => {
  it('matches a direct engine run at every sample point', async () => {
    const b = base();
    for (const redistribution of ['proportional', 'equal'] as const) {
      const points = await sweepCriterion({
        base: b,
        criterionIndex: 1,
        redistribution,
        from: 0.1,
        to: 0.9,
        points: 5,
      });
      expect(points).toHaveLength(5);
      for (const point of points) {
        expect(point.weights.reduce((a, c) => a + c, 0)).toBeCloseTo(1, 12);
        const direct = runMethod(
          marcosMethod,
          {
            matrix,
            weights: {
              numberType: 'crisp',
              entries: b.criterionIds.map((criterionId, i) => ({
                criterionId,
                value: point.weights[i]!,
              })),
            },
          },
          {},
        );
        const expected = direct.result.ranking;
        expect(point.ranking?.ranks).toEqual(
          b.alternativeIds.map((id) => expected.find((e) => e.alternativeId === id)!.rank),
        );
      }
    }
  });

  it('reports a point the engine cannot run as null', async () => {
    const b = { ...base(), weights: [0, 0, 1] };
    // All weight on one criterion with 0 elsewhere is valid; a negative one is not.
    expect(await rankWithWeights(b, [-1, 1, 1])).toBeNull();
  });

  it('stops when cancelled', async () => {
    const points = await sweepCriterion({
      base: base(),
      criterionIndex: 0,
      redistribution: 'proportional',
      isCancelled: () => true,
    });
    expect(points).toEqual([]);
  });
});

describe('saved scenarios', () => {
  it('round-trips through project settings', async () => {
    const b = base();
    const w = [0.2, 0.5, 0.3];
    const ranking = (await rankWithWeights(b, w))!;
    const scenario = makeScenario({
      id: 's1',
      name: 'Memory first',
      createdAt: '2026-01-01T00:00:00.000Z',
      base: b,
      weights: w,
      ranking,
      redistribution: 'proportional',
    });
    const settings = { [scenariosKey('d1')]: scenariosValue([scenario])! };
    const loaded = readScenarios(settings, 'd1');
    expect(loaded).toEqual([JSON.parse(JSON.stringify(scenario))]);
    expect(scenarioWeights(b, loaded[0]!)).toEqual(w);
    expect(readScenarios(settings, 'other')).toEqual([]);
    expect(readScenarios({ [scenariosKey('d1')]: [{ junk: true }] }, 'd1')).toEqual([]);
    expect(scenariosValue([])).toBeUndefined();
  });
});
