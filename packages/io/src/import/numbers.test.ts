import { describe, expect, it } from 'vitest';
import {
  classifyNumberText,
  detectNumberFormat,
  looksNumeric,
  parseNumberText,
  readNumberText,
} from './numbers';

describe('parseNumberText', () => {
  it('reads 1.234,56 with a decimal comma and 1,234.56 with a decimal point', () => {
    expect(parseNumberText('1.234,56', 'comma')?.value).toBe(1234.56);
    expect(parseNumberText('1,234.56', 'point')?.value).toBe(1234.56);
    expect(parseNumberText('1.234,56', 'point')).toBeUndefined();
    expect(parseNumberText('1,234.56', 'comma')).toBeUndefined();
  });

  it('reads grouping with spaces, non-breaking spaces and apostrophes', () => {
    expect(parseNumberText('1 234,5', 'comma')?.value).toBe(1234.5);
    expect(parseNumberText('1 234 567', 'comma')?.value).toBe(1234567);
    expect(parseNumberText('1 234.5', 'point')?.value).toBe(1234.5);
    expect(parseNumberText("1'234'567.25", 'point')?.value).toBe(1234567.25);
  });

  it('reads signs, the Unicode minus, exponents and leading decimals', () => {
    expect(parseNumberText('-3,5', 'comma')?.value).toBe(-3.5);
    expect(parseNumberText('−3.5', 'point')?.value).toBe(-3.5);
    expect(parseNumberText('+2', 'point')?.value).toBe(2);
    expect(parseNumberText('1.5E-3', 'point')?.value).toBe(0.0015);
    expect(parseNumberText('2,5e2', 'comma')?.value).toBe(250);
    expect(parseNumberText('.5', 'point')?.value).toBe(0.5);
    expect(parseNumberText(',5', 'comma')?.value).toBe(0.5);
    expect(Object.is(parseNumberText('-0', 'point')?.value, 0)).toBe(true);
  });

  it('reads percentages as fractions and says so', () => {
    expect(parseNumberText('12,5%', 'comma')).toEqual({ value: 0.125, percent: true });
    expect(parseNumberText('%12,5', 'comma')).toEqual({ value: 0.125, percent: true });
    expect(parseNumberText('7 %', 'point')).toEqual({ value: 0.07, percent: true });
  });

  it('rejects text that is not a number', () => {
    for (const text of [
      '',
      'abc',
      '12abc',
      '1,23,456',
      '1.234.56',
      '1,234 567',
      '--1',
      '1e',
      '0,123,456',
      '1.2.3',
    ]) {
      expect(parseNumberText(text, 'point'), text).toBeUndefined();
    }
    expect(parseNumberText('1,2,3', 'comma')).toBeUndefined();
    expect(parseNumberText('1e999', 'point')).toBeUndefined();
  });
});

describe('classifyNumberText', () => {
  it('tells evidence from ambiguity', () => {
    expect(classifyNumberText('12')).toBe('neutral');
    expect(classifyNumberText('1 234')).toBe('neutral');
    expect(classifyNumberText('2.5')).toBe('point');
    expect(classifyNumberText('2,5')).toBe('comma');
    expect(classifyNumberText('1.234,5')).toBe('comma');
    expect(classifyNumberText('1,234.5')).toBe('point');
    expect(classifyNumberText('1.234.567')).toBe('comma');
    expect(classifyNumberText('1,234,567')).toBe('point');
    expect(classifyNumberText('0,123')).toBe('comma');
    expect(classifyNumberText('1,234')).toBe('ambiguous');
    expect(classifyNumberText('1.234')).toBe('ambiguous');
    expect(classifyNumberText('x')).toBe('invalid');
    expect(looksNumeric('3,14')).toBe(true);
    expect(looksNumeric('(1; 2; 3)')).toBe(false);
  });
});

describe('detectNumberFormat', () => {
  it('detects a decimal comma from unambiguous samples', () => {
    const result = detectNumberFormat(['1.234', '12,5', '7']);
    expect(result.status).toBe('detected');
    expect(result.format).toBe('comma');
    expect(result.counts).toEqual({ point: 0, comma: 1, ambiguous: 1, neutral: 1 });
    expect(result.examples.ambiguous).toEqual(['1.234']);
  });

  it('reports ambiguous samples instead of guessing', () => {
    const result = detectNumberFormat(['1,234', '2,500', '3,750']);
    expect(result.status).toBe('ambiguous');
    expect(result.format).toBeUndefined();
  });

  it('reports a conflict between formats', () => {
    const result = detectNumberFormat(['1.5', '2,5', '3,5', '4,5', '1.25']);
    expect(result.status).toBe('conflict');
    expect(result.examples).toEqual({
      point: ['1.5', '1.25'],
      comma: ['2,5', '3,5', '4,5'],
      ambiguous: [],
    });
  });

  it('needs no format for integers only', () => {
    expect(detectNumberFormat(['1', '20', '300', 'n/a']).status).toBe('not-needed');
    expect(detectNumberFormat([]).status).toBe('not-needed');
  });
});

describe('readNumberText', () => {
  it('reads with a known format and refuses to guess without one', () => {
    expect(readNumberText('1,234', 'point')).toEqual({ value: 1234, percent: false });
    expect(readNumberText('1,234', 'comma')).toEqual({ value: 1.234, percent: false });
    expect(readNumberText('1,234', undefined)).toBe('ambiguous');
    expect(readNumberText('2,5', undefined)).toBe('ambiguous');
    expect(readNumberText('25', undefined)).toEqual({ value: 25, percent: false });
    expect(readNumberText('abc', undefined)).toBe('invalid');
    expect(readNumberText('1.234,5', 'point')).toBe('invalid');
  });
});
