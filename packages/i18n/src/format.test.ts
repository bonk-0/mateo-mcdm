import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatNumber,
  formatPercent,
  localeForNumberFormat,
  NUMBER_FORMAT_IDS,
  numberSeparators,
} from './format';

describe('number formats', () => {
  it('resolves presets and the system format to locales', () => {
    expect(localeForNumberFormat('dot-comma', 'en-GB')).toBe('tr-TR');
    expect(localeForNumberFormat('system', 'en-GB')).toBe('en-GB');
    expect(NUMBER_FORMAT_IDS[0]).toBe('system');
  });

  it.each([
    ['comma-dot', '1,234.57'],
    ['dot-comma', '1.234,57'],
  ] as const)('formats %s', (id, expected) => {
    expect(formatNumber(1234.5678, localeForNumberFormat(id, 'en-US'), { fractionDigits: 2 })).toBe(
      expected,
    );
  });

  it('formats apostrophe-dot with an apostrophe group separator', () => {
    // CLDR versions differ between ' and ’, so accept both.
    const text = formatNumber(1234.5678, localeForNumberFormat('apostrophe-dot', 'en-US'), {
      fractionDigits: 2,
    });
    expect(text).toMatch(/^1['’]234\.57$/);
  });

  it('reads separators from Intl', () => {
    expect(numberSeparators('en-US')).toEqual({ decimal: '.', group: ',' });
    expect(numberSeparators('tr-TR')).toEqual({ decimal: ',', group: '.' });
    expect(numberSeparators('fr-FR').decimal).toBe(',');
    expect(numberSeparators('fr-FR').group.trim()).toBe('');
  });
});

describe('formatNumber', () => {
  it('pads to a fixed number of fraction digits', () => {
    expect(formatNumber(0.5, 'en-US', { fractionDigits: 4 })).toBe('0.5000');
  });

  it('shows up to six fraction digits by default without padding', () => {
    expect(formatNumber(0.5, 'en-US')).toBe('0.5');
    expect(formatNumber(1 / 3, 'en-US')).toBe('0.333333');
  });

  it('never disguises non-finite values', () => {
    expect(formatNumber(Number.NaN, 'en-US')).toBe('NaN');
    expect(formatNumber(Number.POSITIVE_INFINITY, 'tr-TR')).toBe('Infinity');
  });

  it('can turn grouping off', () => {
    expect(formatNumber(12345, 'en-US', { useGrouping: false })).toBe('12345');
  });
});

describe('formatPercent and formatDate', () => {
  it('formats a ratio as a percentage in the locale’s style', () => {
    expect(formatPercent(0.256, 'en-US')).toBe('25.6%');
    expect(formatPercent(0.256, 'tr-TR')).toBe('%25,6');
  });

  it('formats dates per locale', () => {
    const date = new Date(Date.UTC(2026, 0, 15, 12));
    expect(formatDate(date, 'en-US', { dateStyle: 'short' })).toBe('1/15/26');
    expect(formatDate(date, 'tr-TR', { dateStyle: 'short' })).toBe('15.01.2026');
  });
});
