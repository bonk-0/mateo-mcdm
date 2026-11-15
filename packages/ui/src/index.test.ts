import { describe, expect, it } from 'vitest';
import { cn, DURATION } from './index';

describe('@mateo/ui', () => {
  it('merges conflicting Tailwind classes, last one wins', () => {
    expect(cn('px-2 text-sm', false, 'px-4')).toBe('text-sm px-4');
  });

  it('keeps motion durations ordered from fast to explain', () => {
    expect(DURATION.fast).toBeLessThan(DURATION.base);
    expect(DURATION.base).toBeLessThan(DURATION.slow);
    expect(DURATION.slow).toBeLessThan(DURATION.explain);
  });
});
