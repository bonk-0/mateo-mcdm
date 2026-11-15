import { describe, expect, it } from 'vitest';
import { sampleMatrix, sampleWeights } from '../__fixtures__/sample';
import { crispWeights } from '../model/weights';
import { ISSUE_CODES } from './codes';
import { VALID, createIssue, createValidation, mergeValidation } from './collector';
import { checkCrispMatrix, checkMatrixStructure } from './matrix-checks';
import type { ValidationResult } from './types';
import { checkCrispWeights, checkWeightStructure } from './weight-checks';

const codes = (result: ValidationResult) => ({
  errors: result.errors.map((issue) => issue.code),
  warnings: result.warnings.map((issue) => issue.code),
});

describe('validation collector', () => {
  it('separates errors from warnings and keeps their order', () => {
    const v = createValidation();
    v.warning('a.warn');
    v.error('a.first', { params: { n: 1 }, location: { parameter: 'p' } });
    expect(v.hasErrors).toBe(true);
    v.error('a.second', { messageKey: 'custom.key' });
    const result = v.result();
    expect(result.ok).toBe(false);
    expect(codes(result)).toEqual({ errors: ['a.first', 'a.second'], warnings: ['a.warn'] });
    expect(result.errors[0]).toEqual({
      severity: 'error',
      code: 'a.first',
      messageKey: 'validation.a.first',
      params: { n: 1 },
      location: { parameter: 'p' },
    });
    expect(result.errors[1]?.messageKey).toBe('custom.key');
  });

  it('is ok with warnings only', () => {
    const v = createValidation();
    v.warning('only.warn');
    expect(v.hasErrors).toBe(false);
    expect(v.result().ok).toBe(true);
  });

  it('adds issue lists and results, and merges results', () => {
    const v = createValidation();
    v.add([createIssue('error', 'x.e'), createIssue('warning', 'x.w')]);
    const merged = mergeValidation(VALID, v.result(), v.result());
    expect(codes(merged)).toEqual({ errors: ['x.e', 'x.e'], warnings: ['x.w', 'x.w'] });
    expect(VALID.ok).toBe(true);
  });

  it('returns snapshots that later issues do not change', () => {
    const v = createValidation();
    const before = v.result();
    v.error('late');
    expect(before.errors).toHaveLength(0);
  });
});

describe('checkMatrixStructure', () => {
  it('accepts a well-formed matrix', () => {
    expect(checkMatrixStructure(sampleMatrix())).toEqual(VALID);
  });

  it.each([
    null,
    undefined,
    42,
    'matrix',
    {},
    { alternatives: [], criteria: [], values: [1] },
    { alternatives: [1], criteria: [], values: [] },
  ])('reports malformed input %#', (input) => {
    const result = checkMatrixStructure(input, { input: 'data' });
    expect(codes(result).errors).toEqual([ISSUE_CODES.inputMalformed]);
    expect(result.errors[0]?.location).toEqual({ input: 'data' });
  });

  it('reports empty axes', () => {
    const result = checkMatrixStructure({ alternatives: [], criteria: [], values: [] });
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.matrixNoAlternatives,
      ISSUE_CODES.matrixNoCriteria,
    ]);
  });

  it('reports too few alternatives and criteria', () => {
    const result = checkMatrixStructure(sampleMatrix(), { minAlternatives: 4, minCriteria: 3 });
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.matrixTooFewAlternatives,
      ISSUE_CODES.matrixTooFewCriteria,
    ]);
    expect(result.errors[0]?.params).toEqual({ count: 3, min: 4 });
  });

  it('reports duplicate ids with their location', () => {
    const matrix = sampleMatrix();
    const result = checkMatrixStructure({
      ...matrix,
      alternatives: [matrix.alternatives[0], matrix.alternatives[0], matrix.alternatives[2]],
      criteria: [matrix.criteria[0], matrix.criteria[0]],
    });
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.matrixDuplicateAlternative,
      ISSUE_CODES.matrixDuplicateCriterion,
    ]);
    expect(result.errors[0]?.location).toEqual({ input: 'matrix', row: { index: 1, id: 'a1' } });
    expect(result.errors[1]?.location).toEqual({ input: 'matrix', column: { index: 1, id: 'c1' } });
  });

  it('reports invalid directions and unsupported number types', () => {
    const matrix = sampleMatrix();
    const result = checkMatrixStructure(
      {
        ...matrix,
        criteria: [
          { ...matrix.criteria[0], direction: 'max' },
          { ...matrix.criteria[1], numberType: 'tfn' },
        ],
      },
      { supportedNumberTypes: ['crisp'] },
    );
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.matrixInvalidDirection,
      ISSUE_CODES.matrixUnsupportedNumberType,
    ]);
    expect(result.errors[1]?.params).toEqual({ id: 'c2', numberType: 'tfn' });
  });

  it('reports dimension mismatches', () => {
    const matrix = sampleMatrix();
    const result = checkMatrixStructure({ ...matrix, values: [[10, 4], [20], [5, 8], [1, 1]] });
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.matrixRowCountMismatch,
      ISSUE_CODES.matrixColumnCountMismatch,
    ]);
    expect(result.errors[1]?.location?.row).toEqual({ index: 1, id: 'a2' });
  });

  it('reports every missing cell and never fills it', () => {
    const matrix = sampleMatrix();
    const result = checkMatrixStructure({
      ...matrix,
      values: [
        [null, 4],
        [20, undefined],
        [5, 8],
      ],
    });
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.matrixMissingValue,
      ISSUE_CODES.matrixMissingValue,
    ]);
    expect(result.errors.map((issue) => issue.location)).toEqual([
      { input: 'matrix', row: { index: 0, id: 'a1' }, column: { index: 0, id: 'c1' } },
      { input: 'matrix', row: { index: 1, id: 'a2' }, column: { index: 1, id: 'c2' } },
    ]);
  });
});

describe('checkCrispMatrix', () => {
  const withValues = (values: unknown[][]) => ({ ...sampleMatrix(), values });

  it('accepts the sample matrix under every sign rule', () => {
    expect(checkCrispMatrix(sampleMatrix(), { sign: 'positive' })).toEqual(VALID);
    expect(checkCrispMatrix(sampleMatrix(), { sign: 'non-negative' })).toEqual(VALID);
  });

  it('stops at malformed input', () => {
    expect(codes(checkCrispMatrix('nope')).errors).toEqual([ISSUE_CODES.inputMalformed]);
  });

  it('reports non-numeric and non-finite cells once, without repeating missing cells', () => {
    const result = checkCrispMatrix(
      withValues([
        ['10', 4],
        [Number.NaN, Number.POSITIVE_INFINITY],
        [null, 8],
      ]),
    );
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.matrixMissingValue,
      ISSUE_CODES.matrixInvalidValue,
      ISSUE_CODES.matrixInvalidValue,
      ISSUE_CODES.matrixInvalidValue,
    ]);
  });

  it('applies the sign rule', () => {
    const values = [
      [0, 4],
      [-1, 2],
      [5, 8],
    ];
    expect(codes(checkCrispMatrix(withValues(values))).errors).toEqual([]);
    expect(codes(checkCrispMatrix(withValues(values), { sign: 'non-negative' })).errors).toEqual([
      ISSUE_CODES.matrixNegativeValue,
    ]);
    const positive = checkCrispMatrix(withValues(values), { sign: 'positive' });
    expect(codes(positive).errors).toEqual([
      ISSUE_CODES.matrixNonPositiveValue,
      ISSUE_CODES.matrixNonPositiveValue,
    ]);
    expect(positive.errors[1]?.params).toEqual({ value: -1 });
  });

  it('reports constant criteria as a warning or an error on request', () => {
    const values = [
      [7, 4],
      [7, 2],
      [7, 8],
    ];
    expect(codes(checkCrispMatrix(withValues(values)))).toEqual({ errors: [], warnings: [] });
    const warned = checkCrispMatrix(withValues(values), { constantCriterion: 'warning' });
    expect(codes(warned)).toEqual({
      errors: [],
      warnings: [ISSUE_CODES.matrixConstantCriterion],
    });
    expect(warned.ok).toBe(true);
    expect(warned.warnings[0]?.location).toEqual({
      input: 'matrix',
      column: { index: 0, id: 'c1' },
    });
    const failed = checkCrispMatrix(withValues(values), { constantCriterion: 'error' });
    expect(codes(failed).errors).toEqual([ISSUE_CODES.matrixConstantCriterion]);
  });

  it('does not call a single alternative or a ragged column constant', () => {
    const single = {
      ...sampleMatrix(),
      alternatives: [sampleMatrix().alternatives[0]],
      values: [[1, 2]],
    };
    expect(codes(checkCrispMatrix(single, { constantCriterion: 'error' })).errors).toEqual([]);
    const ragged = checkCrispMatrix(withValues([[7, 4], [7], [7, 8]]), {
      constantCriterion: 'error',
    });
    expect(codes(ragged).errors).toContain(ISSUE_CODES.matrixColumnCountMismatch);
  });
});

describe('weight checks', () => {
  const ids = ['c1', 'c2'];

  it('accepts normalized weights', () => {
    expect(checkCrispWeights(sampleWeights(), ids)).toEqual(VALID);
    expect(checkWeightStructure(sampleWeights(), ids)).toEqual(VALID);
  });

  it.each([null, 3, {}, { entries: 'x' }, { entries: [{ value: 1 }] }])(
    'reports malformed weights %#',
    (input) => {
      expect(codes(checkCrispWeights(input, ids)).errors).toEqual([ISSUE_CODES.inputMalformed]);
    },
  );

  it('reports an empty vector', () => {
    const result = checkCrispWeights({ numberType: 'crisp', entries: [] }, ids);
    expect(codes(result).errors).toEqual([ISSUE_CODES.weightsEmpty]);
  });

  it('reports missing, unknown and duplicate entries', () => {
    const result = checkWeightStructure(crispWeights(['c1', 'c1', 'zz'], [0.5, 0.25, 0.25]), ids, {
      input: 'w',
    });
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.weightsDuplicate,
      ISSUE_CODES.weightsUnknownCriterion,
      ISSUE_CODES.weightsMissing,
    ]);
    expect(result.errors[2]?.location).toEqual({ input: 'w', column: { index: 1, id: 'c2' } });
  });

  it('reports invalid and negative values', () => {
    const result = checkCrispWeights(
      {
        numberType: 'crisp',
        entries: [
          { criterionId: 'c1', value: 'x' },
          { criterionId: 'c2', value: -0.2 },
        ],
      },
      ids,
    );
    expect(codes(result).errors).toEqual([
      ISSUE_CODES.weightsInvalidValue,
      ISSUE_CODES.weightsNegative,
    ]);
  });

  it('reports an all-zero vector as an error', () => {
    const result = checkCrispWeights(crispWeights(ids, [0, 0]), ids);
    expect(codes(result).errors).toEqual([ISSUE_CODES.weightsZeroSum]);
  });

  it('warns when the weights do not sum to 1, within a tolerance', () => {
    const off = checkCrispWeights(crispWeights(ids, [0.6, 0.5]), ids);
    expect(codes(off)).toEqual({ errors: [], warnings: [ISSUE_CODES.weightsNotNormalized] });
    expect(off.ok).toBe(true);
    expect(off.warnings[0]?.params).toEqual({ sum: 1.1 });

    expect(checkCrispWeights(crispWeights(ids, [0.1 + 0.2, 0.7]), ids)).toEqual(VALID);
    const strict = checkCrispWeights(crispWeights(ids, [0.6, 0.4000001]), ids, {
      sumTolerance: 1e-12,
      notNormalized: 'error',
    });
    expect(codes(strict).errors).toEqual([ISSUE_CODES.weightsNotNormalized]);
    expect(checkCrispWeights(crispWeights(ids, [2, 3]), ids, { notNormalized: 'ignore' })).toEqual(
      VALID,
    );
  });
});
