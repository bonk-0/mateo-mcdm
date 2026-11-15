import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@mateo/ui', () => {
  it('loads', () => {
    expect(PACKAGE_NAME).toBe('@mateo/ui');
  });
});
