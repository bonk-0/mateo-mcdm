import { describe, expect, it } from 'vitest';
import { domainOf, moveTfnPoint, ticksFor } from './geometry';

const DOMAIN = [0, 10] as const;

describe('moveTfnPoint', () => {
  const value = { l: 2, m: 4, u: 6 };

  it('moves a point and keeps l ≤ m ≤ u', () => {
    expect(moveTfnPoint(value, 'l', 3, DOMAIN)).toEqual({ l: 3, m: 4, u: 6 });
    // l cannot pass m, m cannot leave [l, u], u cannot go below m.
    expect(moveTfnPoint(value, 'l', 9, DOMAIN)).toEqual({ l: 4, m: 4, u: 6 });
    expect(moveTfnPoint(value, 'm', 0, DOMAIN)).toEqual({ l: 2, m: 2, u: 6 });
    expect(moveTfnPoint(value, 'm', 9, DOMAIN)).toEqual({ l: 2, m: 6, u: 6 });
    expect(moveTfnPoint(value, 'u', 1, DOMAIN)).toEqual({ l: 2, m: 4, u: 4 });
  });

  it('stays inside the number line', () => {
    expect(moveTfnPoint(value, 'l', -5, DOMAIN).l).toBe(0);
    expect(moveTfnPoint(value, 'u', 50, DOMAIN).u).toBe(10);
  });

  it('snaps to the grid without floating-point noise', () => {
    expect(moveTfnPoint(value, 'u', 7.349, DOMAIN, 0.1).u).toBe(7.3);
    expect(moveTfnPoint(value, 'u', 7.36, DOMAIN, 0.1).u).toBe(7.4);
  });
});

describe('number line helpers', () => {
  it('finds nice ticks', () => {
    expect(ticksFor(0, 10)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(ticksFor(0, 1)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('pads the extent of the triangles', () => {
    const [low, high] = domainOf([
      { l: 1, m: 2, u: 3 },
      { l: 2, m: 3, u: 5 },
    ]);
    expect(low).toBeLessThan(1);
    expect(high).toBeGreaterThan(5);
    expect(domainOf([])).toEqual([0, 1]);
  });
});
