import { EngineError } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import {
  DEFUZZIFICATIONS,
  DEFUZZIFICATION_IDS,
  centroid,
  defuzzify,
  gradedMean,
  isDefuzzificationId,
  tfn,
} from './index';
import type { DefuzzificationId } from './index';

describe('defuzzification', () => {
  it('graded mean is (l + 4m + u) / 6', () => {
    expect(gradedMean(tfn(1, 2, 3))).toBe(2);
    // (1 + 4·2 + 9) / 6 = 3
    expect(gradedMean(tfn(1, 2, 9))).toBe(3);
    // (0 + 4·3 + 3) / 6 = 2.5
    expect(gradedMean(tfn(0, 3, 3))).toBe(2.5);
    // (−5 − 4 + 3) / 6 = −1
    expect(gradedMean(tfn(-5, -1, 3))).toBe(-1);
  });

  it('centroid is (l + m + u) / 3', () => {
    expect(centroid(tfn(1, 2, 3))).toBe(2);
    // (1 + 2 + 9) / 3 = 4
    expect(centroid(tfn(1, 2, 9))).toBe(4);
    // (0 + 3 + 3) / 3 = 2
    expect(centroid(tfn(0, 3, 3))).toBe(2);
    expect(centroid(tfn(-5, -1, 3))).toBe(-1);
  });

  it('reproduces df_crisp of the Fuzzy MARCOS worked example', () => {
    // Stanković et al. (2020): D̃ = (1.454, 6.785, 27.103), df_crisp = 9.283.
    expect(gradedMean(tfn(1.454, 6.785, 27.103))).toBeCloseTo((1.454 + 4 * 6.785 + 27.103) / 6, 12);
    expect(gradedMean(tfn(1.454, 6.785, 27.103))).toBeCloseTo(9.283, 3);
  });

  it('returns exactly x for the degenerate TFN (x, x, x)', () => {
    // Summing first would give 0.09999999999999999 for 0.1.
    for (const x of [0.1, 0.3, 1 / 3, 0.7, 1e-9, 123456.789, -0.1]) {
      expect(gradedMean(tfn(x, x, x))).toBe(x);
      expect(centroid(tfn(x, x, x))).toBe(x);
    }
    expect(Object.is(gradedMean(tfn(0, 0, 0)), 0)).toBe(true);
  });

  it('offers the formulas by id', () => {
    expect(DEFUZZIFICATION_IDS).toEqual(['graded-mean', 'centroid']);
    expect(DEFUZZIFICATIONS['graded-mean']).toBe(gradedMean);
    expect(defuzzify('graded-mean', tfn(1, 2, 9))).toBe(3);
    expect(defuzzify('centroid', tfn(1, 2, 9))).toBe(4);
    expect(isDefuzzificationId('centroid')).toBe(true);
    expect(isDefuzzificationId('toString')).toBe(false);
    expect(isDefuzzificationId(3)).toBe(false);
    expect(() => defuzzify('mean-of-maxima' as DefuzzificationId, tfn(1, 2, 3))).toThrow(
      EngineError,
    );
  });
});
