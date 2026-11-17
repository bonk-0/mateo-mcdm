/**
 * P1.18 performance check: the methods stay fast on a large matrix
 * (500 alternatives × 50 criteria). The budgets are generous so that a slow CI machine
 * does not fail them; they catch accidental quadratic work, not small regressions.
 *
 * The size of the stored trace is checked too: a trace is stored with every analysis, and a
 * derivation that repeats a whole column in every cell (CRITIC's correlations did) grows
 * with rows × columns × rows and made a 200 × 50 run never finish. Stored traces share
 * their derivation nodes (trace format 2); written as plain JSON the same traces took
 * 25 to 50 MB (1 000 to 2 000 bytes per cell). Every stored trace must read back exactly.
 */
import type { Trace } from '@mateo/engine';
import { crispWeights, decodeTrace, encodeTrace, runMethod, textLiteral } from '@mateo/engine';
import { IMF_SWARA_SCALE } from '@mateo/fuzzy';
import { describe, expect, it } from 'vitest';
import {
  criticMethod,
  fuzzyMarcosMethod,
  fuzzySwaraMethod,
  marcosMethod,
  merecMethod,
  swaraMethod,
} from '../index';

const ALTERNATIVES = 500;
const CRITERIA = 50;
const CELLS = ALTERNATIVES * CRITERIA;

/** Deterministic pseudo-random values (no Math.random, so runs are reproducible). */
function matrix() {
  let seed = 12345;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return {
    alternatives: Array.from({ length: ALTERNATIVES }, (_, i) => ({
      id: `a${i}`,
      name: textLiteral(`A${i + 1}`),
    })),
    criteria: Array.from({ length: CRITERIA }, (_, j) => ({
      id: `c${j}`,
      name: textLiteral(`C${j + 1}`),
      direction: j % 3 === 0 ? ('cost' as const) : ('benefit' as const),
      numberType: 'crisp' as const,
    })),
    values: Array.from({ length: ALTERNATIVES }, () =>
      Array.from({ length: CRITERIA }, () => 1 + Math.round(next() * 999)),
    ),
  };
}

const weights = () => {
  const ids = Array.from({ length: CRITERIA }, (_, j) => `c${j}`);
  return crispWeights(
    ids,
    ids.map(() => 1 / CRITERIA),
  );
};

/**
 * Bytes of the stored trace per cell of the decision matrix, after checking that the
 * stored form reads back as exactly the same trace.
 */
function storedBytesPerCell(trace: Trace): number {
  const stored = JSON.stringify(encodeTrace(trace));
  const restored = decodeTrace(JSON.parse(stored) as unknown);
  expect(JSON.stringify(restored) === JSON.stringify(trace)).toBe(true);
  return stored.length / CELLS;
}

function timed<T>(run: () => T): { value: T; elapsed: number } {
  const started = Date.now();
  const value = run();
  return { value, elapsed: Date.now() - started };
}

describe('large matrix (500 × 50)', () => {
  it('runs MARCOS with given weights within the time budget', () => {
    const { value: record, elapsed } = timed(() =>
      runMethod(marcosMethod, { matrix: matrix(), weights: weights() }),
    );
    const { ranking } = record.result;
    expect(ranking).toHaveLength(ALTERNATIVES);
    expect(new Set(ranking.map((entry) => entry.rank)).size).toBeGreaterThan(1);
    expect(elapsed).toBeLessThan(5_000);
    expect(storedBytesPerCell(record.trace)).toBeLessThan(300);
  });

  it('runs Fuzzy MARCOS within the time budget', () => {
    const crisp = matrix();
    const input = {
      matrix: {
        ...crisp,
        criteria: crisp.criteria.map((criterion) => ({ ...criterion, numberType: 'tfn' })),
        values: crisp.values.map((row) => row.map((x) => ({ l: x, m: x + 1, u: x + 3 }))),
      },
      weights: weights(),
    };
    const { value: record, elapsed } = timed(() => runMethod(fuzzyMarcosMethod, input));
    expect(record.result.ranking).toHaveLength(ALTERNATIVES);
    expect(elapsed).toBeLessThan(5_000);
    expect(storedBytesPerCell(record.trace)).toBeLessThan(450);
  });

  it('runs CRITIC within the time budget', () => {
    const { value: record, elapsed } = timed(() => runMethod(criticMethod, { matrix: matrix() }));
    expect(record.result.weights.entries).toHaveLength(CRITERIA);
    expect(elapsed).toBeLessThan(10_000);
    expect(storedBytesPerCell(record.trace)).toBeLessThan(300);
  });

  it('runs MEREC within the time budget', () => {
    const { value: record, elapsed } = timed(() => runMethod(merecMethod, { matrix: matrix() }));
    expect(record.result.weights.entries).toHaveLength(CRITERIA);
    expect(elapsed).toBeLessThan(10_000);
    expect(storedBytesPerCell(record.trace)).toBeLessThan(650);
  });

  it('runs SWARA and fuzzy SWARA on 50 criteria within the time budget', () => {
    const criteria = Array.from({ length: CRITERIA }, (_, j) => ({
      id: `c${j}`,
      name: textLiteral(`C${j + 1}`),
    }));
    const { value: traces, elapsed } = timed(() => [
      runMethod(swaraMethod, {
        criteria,
        comparativeImportance: criteria.map((_, j) => (j === 0 ? null : 0.1 + (j % 5) * 0.05)),
      }).trace,
      runMethod(fuzzySwaraMethod, {
        criteria,
        assessments: criteria.map((_, j) =>
          j === 0 ? null : IMF_SWARA_SCALE.terms[1 + (j % 6)]!.id,
        ),
      }).trace,
    ]);
    expect(elapsed).toBeLessThan(2_000);
    for (const trace of traces) storedBytesPerCell(trace);
  });
});
