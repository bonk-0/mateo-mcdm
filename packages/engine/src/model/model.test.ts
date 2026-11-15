import { describe, expect, it } from 'vitest';
import { sampleMatrix } from '../__fixtures__/sample';
import { EngineError } from '../errors';
import { isCriterionDirection } from './criterion';
import type { DraftMatrix } from './matrix';
import {
  isCompleteMatrix,
  isMissing,
  mapMatrix,
  matrixCell,
  matrixColumn,
  matrixRow,
} from './matrix';
import { isTextKey, textKey, textLiteral } from './text';
import { alignWeights, crispWeights } from './weights';

describe('text references', () => {
  it('distinguishes keys from literals', () => {
    expect(isTextKey(textKey('a.b'))).toBe(true);
    expect(isTextKey(textLiteral('Alpha'))).toBe(false);
    expect(textKey('a.b')).toEqual({ key: 'a.b' });
    expect(textKey('a.b', { n: 2 })).toEqual({ key: 'a.b', params: { n: 2 } });
  });
});

describe('criterion direction', () => {
  it('accepts only benefit and cost', () => {
    expect(isCriterionDirection('benefit')).toBe(true);
    expect(isCriterionDirection('cost')).toBe(true);
    expect(isCriterionDirection('max')).toBe(false);
    expect(isCriterionDirection(undefined)).toBe(false);
  });
});

describe('decision matrix helpers', () => {
  const matrix = sampleMatrix();

  it('reads cells, rows and columns', () => {
    expect(matrixCell(matrix, 1, 0)).toBe(20);
    expect(matrixRow(matrix, 2)).toEqual([5, 8]);
    expect(matrixColumn(matrix, 1)).toEqual([4, 2, 8]);
  });

  it('throws instead of returning undefined for an out-of-range cell', () => {
    expect(() => matrixCell(matrix, 3, 0)).toThrow(EngineError);
    expect(() => matrixCell(matrix, 0, 2)).toThrow(EngineError);
    expect(() => matrixCell(matrix, 0, -1)).toThrow(EngineError);
  });

  it('maps cells without touching the original', () => {
    const doubled = mapMatrix(matrix, (value) => value * 2);
    expect(doubled.values).toEqual([
      [20, 8],
      [40, 4],
      [10, 16],
    ]);
    expect(doubled.criteria).toBe(matrix.criteria);
    expect(matrix.values[0]).toEqual([10, 4]);
  });

  it('detects incomplete draft matrices', () => {
    const draft: DraftMatrix<number> = {
      ...matrix,
      values: [
        [10, null],
        [20, 2],
        [5, 8],
      ],
    };
    expect(isCompleteMatrix(draft)).toBe(false);
    expect(isCompleteMatrix(matrix)).toBe(true);
    expect(isCompleteMatrix({ ...matrix, values: [[10, 4]] })).toBe(false);
    expect(isCompleteMatrix({ ...matrix, values: [[10], [20, 2], [5, 8]] })).toBe(false);
    expect(isMissing(null)).toBe(true);
    expect(isMissing(undefined)).toBe(true);
    expect(isMissing(0)).toBe(false);
  });
});

describe('weight vectors', () => {
  it('aligns weights to a criterion order by id', () => {
    const weights = crispWeights(['c2', 'c1'], [0.4, 0.6]);
    expect(alignWeights(weights, ['c1', 'c2'])).toEqual([0.6, 0.4]);
    expect(alignWeights(weights, ['c1', 'c3'])).toEqual([0.6, undefined]);
  });

  it('keeps the first entry when an id is repeated', () => {
    const weights = crispWeights(['c1', 'c1'], [0.3, 0.7]);
    expect(alignWeights(weights, ['c1'])).toEqual([0.3]);
  });
});
