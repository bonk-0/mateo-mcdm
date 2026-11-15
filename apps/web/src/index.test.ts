import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@mateo/web', () => {
  it('loads', () => {
    expect(PACKAGE_NAME).toBe('@mateo/web');
  });
});
