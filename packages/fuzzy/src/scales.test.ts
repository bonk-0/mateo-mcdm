import type { ValidationResult } from '@mateo/engine';
import { EngineError, isTextKey } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import type { FuzzyMessageKey, LinguisticScale } from './index';
import {
  FIVE_LEVEL_SCALE,
  FUZZY_MARCOS_SCALE,
  FUZZY_MESSAGES,
  IMF_SWARA_SCALE,
  PREDEFINED_SCALES,
  SEVEN_LEVEL_SCALE,
  checkLinguisticScale,
  defineScale,
  findPredefinedScale,
  findTerm,
  isTfn,
  linguisticMatrixToTfn,
  termToTfn,
  tfn,
  toTuple,
} from './index';

const codes = (result: ValidationResult): string[] => result.errors.map((issue) => issue.code);

const custom = (terms: unknown[], extra: Record<string, unknown> = {}): unknown => ({
  id: 'custom',
  name: { text: 'My scale' },
  kind: 'rating',
  terms,
  ...extra,
});

const term = (id: string, abbreviation: string, value: unknown): unknown => ({
  id,
  label: { text: id },
  abbreviation,
  value,
});

describe('predefined scales', () => {
  it('are the 5-level, 7-level, Fuzzy MARCOS and IMF SWARA scales', () => {
    expect(PREDEFINED_SCALES.map((scale) => [scale.id, scale.kind, scale.terms.length])).toEqual([
      ['five-level', 'rating', 5],
      ['seven-level', 'rating', 7],
      ['fuzzy-marcos', 'rating', 9],
      ['imf-swara', 'comparison', 8],
    ]);
    expect(findPredefinedScale('fuzzy-marcos')).toBe(FUZZY_MARCOS_SCALE);
    expect(findPredefinedScale('nope')).toBeUndefined();
  });

  it('validate and are monotonic', () => {
    for (const scale of PREDEFINED_SCALES) {
      expect(checkLinguisticScale(scale), scale.id).toEqual({ ok: true, errors: [], warnings: [] });
      scale.terms.forEach((item, index) => {
        expect(isTfn(item.value), `${scale.id}/${item.id}`).toBe(true);
        const previous = scale.terms[index - 1]?.value;
        if (previous === undefined) return;
        const { l, m, u } = item.value;
        expect(l >= previous.l && m >= previous.m && u >= previous.u, item.id).toBe(true);
        expect(l > previous.l || m > previous.m || u > previous.u, item.id).toBe(true);
      });
    }
  });

  it('have the values of their sources', () => {
    expect(
      FIVE_LEVEL_SCALE.terms.map((item) => [item.abbreviation, ...toTuple(item.value)]),
    ).toEqual([
      ['VL', 1, 1, 3],
      ['L', 1, 3, 5],
      ['M', 3, 5, 7],
      ['H', 5, 7, 9],
      ['VH', 7, 9, 9],
    ]);
    expect(
      SEVEN_LEVEL_SCALE.terms.map((item) => [item.abbreviation, ...toTuple(item.value)]),
    ).toEqual([
      ['VL', 1, 1, 2],
      ['L', 1, 2, 3],
      ['ML', 2, 3, 4],
      ['M', 3, 4, 5],
      ['MH', 4, 5, 6],
      ['H', 5, 6, 7],
      ['VH', 6, 7, 7],
    ]);
    // Stanković et al. (2020), Table 2.
    expect(
      FUZZY_MARCOS_SCALE.terms.map((item) => [item.abbreviation, ...toTuple(item.value)]),
    ).toEqual([
      ['EP', 1, 1, 1],
      ['VP', 1, 1, 3],
      ['P', 1, 3, 3],
      ['MP', 3, 3, 5],
      ['M', 3, 5, 5],
      ['MG', 5, 5, 7],
      ['G', 5, 7, 7],
      ['VG', 7, 7, 9],
      ['EG', 7, 9, 9],
    ]);
    // Damjanović et al. (2022), Table 2, lowest term first.
    expect(
      IMF_SWARA_SCALE.terms.map((item) => [item.abbreviation, ...toTuple(item.value)]),
    ).toEqual([
      ['ES', 0, 0, 0],
      ['WLS', 2 / 9, 1 / 4, 2 / 7],
      ['MDLS', 1 / 4, 2 / 7, 1 / 3],
      ['LS', 2 / 7, 1 / 3, 2 / 5],
      ['RLS', 1 / 3, 2 / 5, 1 / 2],
      ['MLS', 2 / 5, 1 / 2, 2 / 3],
      ['DLS', 1 / 2, 2 / 3, 1],
      ['ALS', 1, 1, 1],
    ]);
  });

  it('keep the general rating scales strictly positive', () => {
    for (const scale of [FIVE_LEVEL_SCALE, SEVEN_LEVEL_SCALE, FUZZY_MARCOS_SCALE]) {
      expect(scale.terms.every((item) => item.value.l > 0)).toBe(true);
    }
  });

  it('have English and Turkish texts for every name and term, and no unused scale text', () => {
    const used = new Set<string>();
    for (const scale of PREDEFINED_SCALES) {
      for (const text of [scale.name, ...scale.terms.map((item) => item.label)]) {
        if (!isTextKey(text)) throw new Error(`${scale.id}: predefined scales use i18n keys`);
        used.add(text.key);
        expect(FUZZY_MESSAGES.en[text.key as FuzzyMessageKey], text.key).toBeTruthy();
        expect(FUZZY_MESSAGES.tr[text.key as FuzzyMessageKey], text.key).toBeTruthy();
      }
    }
    const scaleKeys = Object.keys(FUZZY_MESSAGES.en).filter((key) => key.startsWith('scales.'));
    expect(scaleKeys.sort()).toEqual([...used].sort());
  });

  it('cite the papers of the paper scales', () => {
    expect(FUZZY_MARCOS_SCALE.references?.map((reference) => reference.doi)).toEqual([
      '10.3390/math8030457',
    ]);
    expect(IMF_SWARA_SCALE.references?.map((reference) => reference.doi)).toEqual([
      '10.3390/axioms10020092',
      '10.22190/FUME220215012D',
    ]);
    expect(FIVE_LEVEL_SCALE.references).toBeUndefined();
  });

  it('are frozen', () => {
    expect(Object.isFrozen(FUZZY_MARCOS_SCALE)).toBe(true);
    expect(Object.isFrozen(FUZZY_MARCOS_SCALE.terms)).toBe(true);
    expect(Object.isFrozen(FUZZY_MARCOS_SCALE.terms[0]?.value)).toBe(true);
    expect(Object.isFrozen(PREDEFINED_SCALES)).toBe(true);
  });
});

describe('checkLinguisticScale', () => {
  const low = term('low', 'L', tfn(1, 2, 3));
  const high = term('high', 'H', tfn(2, 3, 4));

  it('accepts a valid custom scale with literal labels', () => {
    expect(checkLinguisticScale(custom([low, high])).ok).toBe(true);
  });

  it('rejects values that are not scales', () => {
    for (const bad of [
      null,
      5,
      {},
      custom([low, high], { id: ' ' }),
      custom([low, high], { name: 'My scale' }),
      custom([low, high], { name: { text: '' } }),
      custom([low, high], { kind: 'other' }),
      custom([low, high], { terms: 'low,high' }),
    ]) {
      expect(codes(checkLinguisticScale(bad))).toEqual(['input.malformed']);
    }
  });

  it('needs at least two terms', () => {
    const result = checkLinguisticScale(custom([low]));
    expect(codes(result)).toEqual(['scale.too-few-terms']);
    expect(result.errors[0]?.params).toEqual({ count: 1 });
  });

  it('reports terms without id, label or abbreviation', () => {
    const result = checkLinguisticScale(
      custom([
        low,
        { id: 'x', abbreviation: 'X', value: tfn(2, 3, 4) },
        null,
        term('', 'E', 1),
        high,
      ]),
    );
    expect(codes(result)).toEqual([
      'scale.invalid-term',
      'scale.invalid-term',
      'scale.invalid-term',
    ]);
    expect(result.errors.map((issue) => issue.params)).toEqual([
      { position: 2 },
      { position: 3 },
      { position: 4 },
    ]);
    expect(result.errors[1]?.location).toEqual({ input: 'scale', row: { index: 2 } });
  });

  it('reports ids and abbreviations that do not identify one term, ignoring case', () => {
    expect(codes(checkLinguisticScale(custom([low, term('LOW', 'X', tfn(2, 3, 4))])))).toEqual([
      'scale.duplicate-term',
    ]);
    expect(codes(checkLinguisticScale(custom([low, term('high', 'l', tfn(2, 3, 4))])))).toEqual([
      'scale.duplicate-term',
    ]);
    // An abbreviation may not be the id of another term either.
    const result = checkLinguisticScale(custom([low, term('high', 'Low', tfn(2, 3, 4))]));
    expect(codes(result)).toEqual(['scale.duplicate-term']);
    expect(result.errors[0]?.params).toEqual({ term: 'low' });
    // A term may use its own id as its abbreviation.
    expect(checkLinguisticScale(custom([term('l', 'L', tfn(1, 2, 3)), high])).ok).toBe(true);
  });

  it('reports invalid TFNs', () => {
    const result = checkLinguisticScale(
      custom([term('low', 'L', { l: 3, m: 2, u: 1 }), term('mid', 'M', 'x'), high]),
    );
    expect(codes(result)).toEqual(['tfn.invalid-order', 'tfn.invalid-value']);
    expect(result.errors[0]?.params).toEqual({ l: 3, m: 2, u: 1 });
    expect(result.errors[0]?.location).toEqual({ input: 'scale', row: { index: 0, id: 'low' } });
  });

  it('reports terms that are not higher than the one before', () => {
    const descending = custom([high, low]);
    const result = checkLinguisticScale(descending, { input: 'myScale' });
    expect(codes(result)).toEqual(['scale.not-monotonic']);
    expect(result.errors[0]?.params).toEqual({ term: 'low', previous: 'high' });
    expect(result.errors[0]?.location).toEqual({ input: 'myScale', row: { index: 1, id: 'low' } });
    // Equal terms and terms that cross are not monotonic either.
    expect(codes(checkLinguisticScale(custom([low, term('same', 'S', tfn(1, 2, 3))])))).toEqual([
      'scale.not-monotonic',
    ]);
    expect(codes(checkLinguisticScale(custom([low, term('wide', 'W', tfn(0, 3, 5))])))).toEqual([
      'scale.not-monotonic',
    ]);
    const relaxed = checkLinguisticScale(descending, { notMonotonic: 'warning' });
    expect(relaxed.ok).toBe(true);
    expect(relaxed.warnings.map((issue) => issue.code)).toEqual(['scale.not-monotonic']);
    expect(checkLinguisticScale(descending, { notMonotonic: 'ignore' }).warnings).toEqual([]);
  });
});

describe('defineScale', () => {
  it('returns a frozen copy of a valid scale', () => {
    const source = custom([
      term('low', 'L', { l: 1, m: 2, u: 3 }),
      term('high', 'H', { l: 2, m: 3, u: 4 }),
    ]) as LinguisticScale;
    const scale = defineScale(source);
    expect(scale).toEqual(source);
    expect(scale).not.toBe(source);
    expect(Object.isFrozen(scale.terms[0]?.value)).toBe(true);
    expect(Object.isFrozen(source)).toBe(false);
  });

  it('throws for an invalid scale and names the problems', () => {
    const invalid = custom([term('high', 'H', tfn(2, 3, 4)), term('low', 'L', tfn(1, 2, 3))]);
    expect(() => defineScale(invalid as LinguisticScale)).toThrow(EngineError);
    expect(() => defineScale(invalid as LinguisticScale)).toThrow(/scale\.not-monotonic/);
    expect(() => defineScale(null as unknown as LinguisticScale)).toThrow(/input\.malformed/);
  });
});

describe('linguistic term → TFN', () => {
  it('finds a term by id or abbreviation, ignoring case and surrounding spaces', () => {
    expect(findTerm(FUZZY_MARCOS_SCALE, 'VG')?.id).toBe('very-good');
    expect(findTerm(FUZZY_MARCOS_SCALE, ' vg ')?.id).toBe('very-good');
    expect(findTerm(FUZZY_MARCOS_SCALE, 'Very-Good')?.id).toBe('very-good');
    expect(findTerm(FUZZY_MARCOS_SCALE, 'M')?.id).toBe('medium');
    expect(findTerm(FUZZY_MARCOS_SCALE, 'MP')?.id).toBe('medium-poor');
    expect(termToTfn(FUZZY_MARCOS_SCALE, 'EG')).toEqual({ l: 7, m: 9, u: 9 });
    expect(termToTfn(IMF_SWARA_SCALE, 'es')).toEqual({ l: 0, m: 0, u: 0 });
  });

  it('does not guess: unknown terms are not converted', () => {
    for (const unknown of ['XX', '', 'very good', 'V G', 7, null, undefined, { id: 'VG' }]) {
      expect(findTerm(FUZZY_MARCOS_SCALE, unknown)).toBeUndefined();
    }
    expect(() => termToTfn(FUZZY_MARCOS_SCALE, 'ES')).toThrow(EngineError);
    expect(() => termToTfn(FUZZY_MARCOS_SCALE, 'ES')).toThrow(/"fuzzy-marcos" has no term "ES"/);
  });

  const linguistic = (values: unknown[][]): unknown => ({
    alternatives: [
      { id: 'a1', name: { text: 'Alpha' } },
      { id: 'a2', name: { text: 'Beta' } },
    ],
    criteria: [
      { id: 'c1', name: { text: 'Quality' }, direction: 'benefit', numberType: 'linguistic' },
      { id: 'c2', name: { text: 'Price' }, direction: 'cost', numberType: 'linguistic' },
    ],
    values,
  });

  it('converts a matrix of terms to a TFN matrix', () => {
    const { validation, matrix } = linguisticMatrixToTfn(
      FUZZY_MARCOS_SCALE,
      linguistic([
        ['VG', 'mp'],
        ['extremely-poor', ' G '],
      ]),
    );
    expect(validation).toEqual({ ok: true, errors: [], warnings: [] });
    expect(matrix?.values).toEqual([
      [tfn(7, 7, 9), tfn(3, 3, 5)],
      [tfn(1, 1, 1), tfn(5, 7, 7)],
    ]);
    expect(matrix?.criteria.map((criterion) => criterion.numberType)).toEqual(['tfn', 'tfn']);
    expect(matrix?.criteria.map((criterion) => criterion.direction)).toEqual(['benefit', 'cost']);
    expect(matrix?.alternatives.map((alternative) => alternative.id)).toEqual(['a1', 'a2']);
  });

  it('reports every unknown term with its location and returns no matrix', () => {
    const { validation, matrix } = linguisticMatrixToTfn(
      FUZZY_MARCOS_SCALE,
      linguistic([
        ['VG', 'XX'],
        [7, { l: 1, m: 2, u: 3 }],
      ]),
      { input: 'ratings' },
    );
    expect(matrix).toBeUndefined();
    expect(validation.errors).toEqual([
      {
        severity: 'error',
        code: 'scale.unknown-term',
        messageKey: 'validation.scale.unknown-term',
        params: { term: 'XX', scale: 'fuzzy-marcos' },
        location: { input: 'ratings', row: { index: 0, id: 'a1' }, column: { index: 1, id: 'c2' } },
      },
      {
        severity: 'error',
        code: 'scale.unknown-term',
        messageKey: 'validation.scale.unknown-term',
        params: { term: 7, scale: 'fuzzy-marcos' },
        location: { input: 'ratings', row: { index: 1, id: 'a2' }, column: { index: 0, id: 'c1' } },
      },
      {
        severity: 'error',
        code: 'scale.unknown-term',
        messageKey: 'validation.scale.unknown-term',
        params: { term: 'object', scale: 'fuzzy-marcos' },
        location: { input: 'ratings', row: { index: 1, id: 'a2' }, column: { index: 1, id: 'c2' } },
      },
    ]);
  });

  it('reports empty cells and structure problems through the engine checks', () => {
    const missing = linguisticMatrixToTfn(FUZZY_MARCOS_SCALE, linguistic([['VG', null], ['G']]));
    expect(missing.matrix).toBeUndefined();
    expect(codes(missing.validation)).toEqual([
      'matrix.missing-value',
      'matrix.column-count-mismatch',
    ]);
    const malformed = linguisticMatrixToTfn(FUZZY_MARCOS_SCALE, 'VG');
    expect(malformed.matrix).toBeUndefined();
    expect(codes(malformed.validation)).toEqual(['input.malformed']);
    const extra = linguisticMatrixToTfn(
      FUZZY_MARCOS_SCALE,
      linguistic([
        ['VG', 'G'],
        ['VG', 'G'],
        ['??', 'G', 'G'],
      ]),
    );
    expect(codes(extra.validation)).toEqual([
      'matrix.row-count-mismatch',
      'matrix.column-count-mismatch',
      'scale.unknown-term',
    ]);
    expect(extra.validation.errors[2]?.location?.row).toEqual({ index: 2 });
  });
});
