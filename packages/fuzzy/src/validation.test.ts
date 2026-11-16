import type { ValidationResult } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { FUZZY_ISSUE_CODES, FUZZY_MESSAGES, checkTfnMatrix, checkTfnWeights, tfn } from './index';
import type { FuzzyMessageKey } from './index';

const codes = (result: ValidationResult): string[] => result.errors.map((issue) => issue.code);

function matrix(values: unknown[][]): unknown {
  return {
    alternatives: [
      { id: 'a1', name: { text: 'Alpha' } },
      { id: 'a2', name: { text: 'Beta' } },
    ],
    criteria: [
      { id: 'c1', name: { text: 'Quality' }, direction: 'benefit', numberType: 'tfn' },
      { id: 'c2', name: { text: 'Price' }, direction: 'cost', numberType: 'tfn' },
    ],
    values,
  };
}

const weights = (values: unknown[]): unknown => ({
  numberType: 'tfn',
  entries: values.map((value, index) => ({ criterionId: `c${index + 1}`, value })),
});

describe('checkTfnMatrix', () => {
  it('accepts a matrix of valid TFNs', () => {
    const result = checkTfnMatrix(
      matrix([
        [tfn(1, 2, 3), tfn(2, 2, 2)],
        [tfn(0, 1, 1), tfn(1, 3, 5)],
      ]),
    );
    expect(result).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('reports every cell that breaks l ≤ m ≤ u, with its location and values', () => {
    const result = checkTfnMatrix(
      matrix([
        [{ l: 3, m: 2, u: 4 }, tfn(1, 2, 3)],
        [tfn(1, 2, 3), { l: 1, m: 5, u: 4 }],
      ]),
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      {
        severity: 'error',
        code: 'tfn.invalid-order',
        messageKey: 'validation.tfn.invalid-order',
        params: { l: 3, m: 2, u: 4 },
        location: { input: 'matrix', row: { index: 0, id: 'a1' }, column: { index: 0, id: 'c1' } },
      },
      {
        severity: 'error',
        code: 'tfn.invalid-order',
        messageKey: 'validation.tfn.invalid-order',
        params: { l: 1, m: 5, u: 4 },
        location: { input: 'matrix', row: { index: 1, id: 'a2' }, column: { index: 1, id: 'c2' } },
      },
    ]);
  });

  it('reports cells that are not TFNs at all', () => {
    const result = checkTfnMatrix(
      matrix([
        [5, { l: 1, m: Number.NaN, u: 3 }],
        ['VG', [1, 2, 3]],
      ]),
    );
    expect(codes(result)).toEqual([
      'tfn.invalid-value',
      'tfn.invalid-value',
      'tfn.invalid-value',
      'tfn.invalid-value',
    ]);
  });

  it('applies the sign rule to the lower value', () => {
    const data = matrix([
      [tfn(0, 1, 2), tfn(-1, 1, 2)],
      [tfn(1, 2, 3), tfn(1, 2, 3)],
    ]);
    expect(checkTfnMatrix(data).ok).toBe(true);
    expect(codes(checkTfnMatrix(data, { sign: 'non-negative' }))).toEqual(['tfn.negative-value']);
    const positive = checkTfnMatrix(data, { sign: 'positive', input: 'ratings' });
    expect(codes(positive)).toEqual(['tfn.non-positive-value', 'tfn.non-positive-value']);
    expect(positive.errors[0]?.params).toEqual({ l: 0 });
    expect(positive.errors[0]?.location?.input).toBe('ratings');
  });

  it('leaves structure problems to the engine and does not report them twice', () => {
    expect(codes(checkTfnMatrix(null))).toEqual(['input.malformed']);
    expect(codes(checkTfnMatrix(matrix([[tfn(1, 2, 3), null], [tfn(1, 2, 3)]])))).toEqual([
      'matrix.missing-value',
      'matrix.column-count-mismatch',
    ]);
    const extraRow = matrix([
      [tfn(1, 2, 3), tfn(1, 2, 3)],
      [tfn(1, 2, 3), tfn(1, 2, 3)],
      [{ l: 2, m: 1, u: 3 }, tfn(1, 2, 3)],
    ]);
    const result = checkTfnMatrix(extraRow);
    expect(codes(result)).toEqual(['matrix.row-count-mismatch', 'tfn.invalid-order']);
    expect(result.errors[1]?.location?.row).toEqual({ index: 2 });
  });
});

describe('checkTfnWeights', () => {
  const ids = ['c1', 'c2'];

  it('accepts valid fuzzy weights without asking them to sum to 1', () => {
    const result = checkTfnWeights(weights([tfn(0.2, 0.3, 0.4), tfn(0.5, 0.7, 0.9)]), ids);
    expect(result).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('reports invalid and negative weights at their criterion', () => {
    const result = checkTfnWeights(weights([{ l: 0.5, m: 0.3, u: 0.4 }, tfn(-0.1, 0.2, 0.3)]), ids);
    expect(codes(result)).toEqual(['tfn.invalid-order', 'tfn.negative-value']);
    expect(result.errors[1]?.location).toEqual({
      input: 'weights',
      column: { index: 1, id: 'c2' },
    });
    expect(codes(checkTfnWeights(weights([0.5, tfn(0.1, 0.2, 0.3)]), ids))).toEqual([
      'tfn.invalid-value',
    ]);
    expect(
      codes(
        checkTfnWeights(weights([tfn(0, 0.2, 0.3), tfn(0.1, 0.2, 0.3)]), ids, { sign: 'positive' }),
      ),
    ).toEqual(['tfn.non-positive-value']);
  });

  it('rejects weights that are all zero', () => {
    expect(codes(checkTfnWeights(weights([tfn(0, 0, 0), tfn(0, 0, 0)]), ids))).toEqual([
      'weights.zero-sum',
    ]);
    expect(checkTfnWeights(weights([tfn(0, 0, 0), tfn(0, 0, 0.1)]), ids).ok).toBe(true);
  });

  it('leaves structure problems to the engine', () => {
    expect(codes(checkTfnWeights(undefined, ids))).toEqual(['input.malformed']);
    expect(codes(checkTfnWeights({ numberType: 'tfn', entries: [] }, ids))).toEqual([
      'weights.empty',
    ]);
    expect(codes(checkTfnWeights(weights([tfn(0.1, 0.2, 0.3)]), ids))).toEqual(['weights.missing']);
    const unknown = {
      numberType: 'tfn',
      entries: [
        { criterionId: 'c1', value: tfn(1, 1, 1) },
        { criterionId: 'c2', value: tfn(1, 1, 1) },
        { criterionId: 'zz', value: { l: 2, m: 1, u: 3 } },
      ],
    };
    const result = checkTfnWeights(unknown, ids, { input: 'w' });
    expect(codes(result)).toEqual(['weights.unknown-criterion', 'tfn.invalid-order']);
    expect(result.errors[1]?.location).toEqual({ input: 'w', column: { index: 2, id: 'zz' } });
  });
});

describe('messages', () => {
  const placeholders = (text: string) =>
    [...text.matchAll(/\{(\w+)/g)].map((match) => match[1]).sort();

  it('has an English and a Turkish text for every issue code, with the same placeholders', () => {
    expect(Object.keys(FUZZY_MESSAGES.tr).sort()).toEqual(Object.keys(FUZZY_MESSAGES.en).sort());
    expect(new Set(Object.values(FUZZY_ISSUE_CODES)).size).toBe(
      Object.values(FUZZY_ISSUE_CODES).length,
    );
    for (const code of Object.values(FUZZY_ISSUE_CODES)) {
      const key = `validation.${code}` as FuzzyMessageKey;
      expect(FUZZY_MESSAGES.en[key], key).toBeTruthy();
      expect(FUZZY_MESSAGES.tr[key], key).toBeTruthy();
    }
    for (const key of Object.keys(FUZZY_MESSAGES.en) as FuzzyMessageKey[]) {
      expect(placeholders(FUZZY_MESSAGES.tr[key]), key).toEqual(
        placeholders(FUZZY_MESSAGES.en[key]),
      );
    }
  });
});
