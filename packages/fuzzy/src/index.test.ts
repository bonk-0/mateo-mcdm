import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@mateo/fuzzy', () => {
  it('loads', () => {
    expect(PACKAGE_NAME).toBe('@mateo/fuzzy');
  });
});
