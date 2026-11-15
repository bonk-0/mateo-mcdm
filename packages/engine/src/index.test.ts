import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('@mateo/engine', () => {
  it('loads', () => {
    expect(PACKAGE_NAME).toBe('@mateo/engine');
  });
});
