/**
 * The input-based consistency of BWM (Liang, Brunelli & Rezaei 2020, Omega 96, 102175):
 * a cardinal consistency ratio computed from the two preference vectors alone, before any
 * optimization, and the thresholds the paper derived for it. Plain numbers in and out;
 * `bwm.ts` records them in the trace and `operations.ts` recomputes them on audit.
 *
 * CR^I_j = |a_Bj · a_jW − a_BW| / (a_BW² − a_BW) for a_BW > 1, and CR^I = max_j CR^I_j.
 * It is 0 exactly when every indirect comparison a_Bj · a_jW equals a_BW, and at most 1
 * while no comparison exceeds a_BW.
 */

/** Scales (the largest value of the preference scale, rows of Table 3) the thresholds cover. */
export const THRESHOLD_SCALES = { min: 3, max: 9 } as const;

/** Numbers of criteria (columns of Table 3) the thresholds cover. */
export const THRESHOLD_CRITERIA = { min: 3, max: 9 } as const;

/**
 * Table 3 of Liang et al. (2020): the threshold of CR^I by scale (row, 3 to 9) and number
 * of criteria (column, 3 to 9). The paper obtained them by simulation, as the point where
 * the share of ordinally consistent inputs rejected equals the share of ordinally
 * inconsistent inputs accepted.
 */
const THRESHOLDS: readonly (readonly number[])[] = [
  [0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1667, 0.1667],
  [0.1121, 0.1529, 0.1898, 0.2206, 0.2527, 0.2577, 0.2683],
  [0.1354, 0.1994, 0.2306, 0.2546, 0.2716, 0.2844, 0.296],
  [0.133, 0.199, 0.2643, 0.3044, 0.3144, 0.3221, 0.3262],
  [0.1294, 0.2457, 0.2819, 0.3029, 0.3144, 0.3251, 0.3403],
  [0.1309, 0.2521, 0.2958, 0.3154, 0.3408, 0.362, 0.3657],
  [0.1359, 0.2681, 0.3062, 0.3337, 0.3517, 0.362, 0.3662],
];

/**
 * The threshold for `criteria` criteria on a preference scale of 1 to `scale`, or `null`
 * when the paper gives none (more than 9 criteria, or a scale outside 3 to 9). With two
 * criteria the only comparisons are the best against the worst, so CR^I is always 0 and
 * the threshold is 0.
 */
export function inputThreshold(criteria: number, scale: number): number | null {
  if (!Number.isInteger(criteria) || !Number.isInteger(scale)) return null;
  if (scale < THRESHOLD_SCALES.min || scale > THRESHOLD_SCALES.max) return null;
  if (criteria === 2) return 0;
  if (criteria < THRESHOLD_CRITERIA.min || criteria > THRESHOLD_CRITERIA.max) return null;
  return THRESHOLDS[scale - THRESHOLD_SCALES.min]![criteria - THRESHOLD_CRITERIA.min]!;
}

/** CR^I_j of one criterion. Validation guarantees a_BW > 1. */
export function localInputRatio(aBj: number, ajW: number, aBW: number): number {
  return Math.abs(aBj * ajW - aBW) / (aBW * aBW - aBW);
}
