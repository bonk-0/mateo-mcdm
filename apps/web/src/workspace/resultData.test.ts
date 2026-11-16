import { runMethod, textLiteral } from '@mateo/engine';
import { fuzzyMarcosMethod, marcosMethod } from '@mateo/methods';
import { describe, expect, it } from 'vitest';
import { contributionHeatmap, rankingRows, vectorOf, weightRows } from './resultData';

const crit = (id: string, direction: 'benefit' | 'cost', numberType: string) => ({
  id,
  name: textLiteral(id.toUpperCase()),
  direction,
  numberType,
});
const alternatives = ['a1', 'a2', 'a3'].map((id) => ({ id, name: textLiteral(id.toUpperCase()) }));
const values = [
  [3, 4],
  [5, 2],
  [4, 6],
];
const weights = {
  numberType: 'crisp',
  entries: [
    { criterionId: 'c1', value: 0.6 },
    { criterionId: 'c2', value: 0.4 },
  ],
};

describe('result data of MARCOS', () => {
  const record = runMethod(marcosMethod, {
    matrix: {
      alternatives,
      criteria: [crit('c1', 'benefit', 'crisp'), crit('c2', 'cost', 'crisp')],
      values,
    },
    weights,
  });

  it('lists the ranking best first with the engine’s numbers', () => {
    const rows = rankingRows(record.result, record.trace);
    expect(rows.map((row) => row.alternativeId)).toEqual(['a2', 'a3', 'a1']);
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3]);
    const result = record.result;
    expect(rows[0]!.score).toBe(result.scores[1]);
    expect(rows[0]!.label).toEqual(textLiteral('A2'));
    expect(rows.every((row) => row.fMinus !== null && row.fPlus !== null)).toBe(true);
  });

  it('reads the weights the method used', () => {
    expect(weightRows(record.trace).map((row) => row.value)).toEqual([0.6, 0.4]);
  });

  it('leaves the anti-ideal and ideal rows out of the contribution heat map', () => {
    const heatmap = contributionHeatmap(record.trace)!;
    expect(heatmap.rows.map((row) => row.id)).toEqual(['a1', 'a2', 'a3']);
    expect(heatmap.columns.map((column) => column.id)).toEqual(['c1', 'c2']);
    expect(heatmap.values.flat().every((value) => typeof value === 'number')).toBe(true);
  });
});

describe('result data of Fuzzy MARCOS', () => {
  const record = runMethod(fuzzyMarcosMethod, {
    matrix: {
      alternatives,
      criteria: [crit('c1', 'benefit', 'tfn'), crit('c2', 'cost', 'tfn')],
      values: values.map((row) => row.map((x) => ({ l: x, m: x + 0.5, u: x + 1 }))),
    },
    weights,
  });

  it('uses the defuzzified utility functions and the modal value of fuzzy cells', () => {
    const rows = rankingRows(record.result, record.trace);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.fMinus !== null && row.fPlus !== null)).toBe(true);
    const heatmap = contributionHeatmap(record.trace)!;
    expect(heatmap.values.flat().every((value) => typeof value === 'number')).toBe(true);
  });

  it('plots the m component of a fuzzy value', () => {
    const step = record.trace.steps.find((item) => item.id === 'extended-matrix')!;
    const first = step.output.cells[0]![0]!.value as unknown as { components: { m: number } };
    expect(
      vectorOf({ ...step.output, shape: 'row-vector', cells: [step.output.cells[0]!] })[0]!.value,
    ).toBe(first.components.m);
  });
});
