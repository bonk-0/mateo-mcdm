import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { tfn, vertexDistance } from './index';

/** Numbers of everyday magnitude: squaring a subnormal underflows, which no input has. */
const everyday = fc
  .double({ min: -1e6, max: 1e6, noNaN: true })
  .filter((x) => x === 0 || Math.abs(x) > 1e-100);

describe('vertex distance', () => {
  it('is the root mean square of the component differences', () => {
    // sqrt((1 + 4 + 9) / 3)
    expect(vertexDistance(tfn(1, 2, 3), tfn(2, 4, 6))).toBeCloseTo(Math.sqrt(14 / 3), 14);
    expect(vertexDistance(tfn(1, 2, 3), tfn(1, 2, 3))).toBe(0);
  });

  it('is symmetric and exactly |x - y| for crisp numbers', () => {
    fc.assert(
      fc.property(everyday, everyday, (x, y) => {
        expect(vertexDistance(tfn(x, x, x), tfn(y, y, y))).toBe(Math.abs(x - y));
      }),
      { seed: 20261118 },
    );
    const a = tfn(0.5, 2, 7);
    const b = tfn(1, 3, 4);
    expect(vertexDistance(a, b)).toBeCloseTo(vertexDistance(b, a), 14);
  });
});
