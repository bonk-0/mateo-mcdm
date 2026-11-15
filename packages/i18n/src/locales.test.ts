import { describe, expect, it } from 'vitest';
import { isLanguage, resolveLanguage } from './locales';

describe('resolveLanguage', () => {
  it('matches on the base language, ignoring region and case', () => {
    expect(resolveLanguage(['tr-TR'])).toBe('tr');
    expect(resolveLanguage(['TR'])).toBe('tr');
    expect(resolveLanguage(['en_GB'])).toBe('en');
  });

  it('takes the first supported language in preference order', () => {
    expect(resolveLanguage(['de-DE', 'tr', 'en'])).toBe('tr');
  });

  it('falls back to English', () => {
    expect(resolveLanguage(['de-DE', 'fr'])).toBe('en');
    expect(resolveLanguage([])).toBe('en');
  });

  it('guards language values', () => {
    expect(isLanguage('tr')).toBe(true);
    expect(isLanguage('de')).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});
