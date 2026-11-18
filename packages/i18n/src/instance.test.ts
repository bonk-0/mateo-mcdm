import { describe, expect, it } from 'vitest';
import { createI18n } from './instance';

describe('createI18n', () => {
  it('translates with ICU plurals and interpolation', () => {
    const i18n = createI18n({ language: 'en' });
    expect(i18n.t('settings:precision.option', { count: 1 })).toBe('1 decimal place');
    expect(i18n.t('settings:precision.option', { count: 4 })).toBe('4 decimal places');
    expect(i18n.t('nav:steps.step', { number: 2, total: 3 })).toBe('Step 2 of 3');
  });

  it('switches language at runtime', async () => {
    const i18n = createI18n({ language: 'en' });
    expect(i18n.t('nav:areas.learn')).toBe('Learn');
    await i18n.changeLanguage('tr');
    expect(i18n.t('nav:areas.learn')).toBe('Öğren');
    expect(i18n.t('nav:steps.step', { number: 3, total: 3 })).toBe('Adım 3/3');
  });

  it('keeps instances independent', () => {
    const en = createI18n({ language: 'en' });
    const tr = createI18n({ language: 'tr' });
    expect(en.t('skipToContent')).toBe('Skip to content');
    expect(tr.t('skipToContent')).toBe('İçeriğe geç');
  });
});
