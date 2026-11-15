import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@mateo/methods', () => {
  it('loads', () => {
    expect(PACKAGE_NAME).toBe('@mateo/methods');
  });
});
