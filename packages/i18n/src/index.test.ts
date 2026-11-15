import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@mateo/i18n', () => {
  it('loads', () => {
    expect(PACKAGE_NAME).toBe('@mateo/i18n');
  });
});
