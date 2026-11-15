import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from './store';

describe('sanitizeSettings', () => {
  it('defaults everything to follow the operating system', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({
      language: 'system',
      displayNumberFormat: 'system',
      importNumberFormat: 'system',
      theme: 'system',
      motion: 'system',
    });
  });

  it('keeps valid values and drops invalid ones', () => {
    expect(
      sanitizeSettings({
        language: 'tr',
        displayNumberFormat: 'dot-comma',
        importNumberFormat: 'nonsense',
        displayPrecision: 7,
        theme: 'dark',
        sidebarCollapsed: 'yes',
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      language: 'tr',
      displayNumberFormat: 'dot-comma',
      theme: 'dark',
    });
  });
});
