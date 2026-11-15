import { EngineError } from '../errors';

/** `descending`: the largest score is rank 1. `ascending`: the smallest is rank 1. */
export type RankOrder = 'descending' | 'ascending';

/**
 * How equal scores are ranked (example scores 9, 7, 7, 5):
 * - `competition`: 1, 2, 2, 4 (the usual choice in MCDM papers)
 * - `dense`: 1, 2, 2, 3
 * - `fractional`: 1, 2.5, 2.5, 4 (average of the tied positions; used by rank correlations)
 * - `ordinal`: 1, 2, 3, 4 (ties broken by input position)
 */
export type TieRule = 'competition' | 'dense' | 'fractional' | 'ordinal';

export interface RankOptions {
  /** Default `descending`. */
  readonly order?: RankOrder;
  /** Default `competition`. */
  readonly ties?: TieRule;
  /**
   * Two scores are tied when `|a - b| <= tolerance · max(1, |a|, |b|)`. The default
   * `1e-12` treats scores that differ only by floating-point noise as equal, so a ranking
   * does not depend on the order in which equal quantities were summed. Use `0` for exact
   * comparison.
   */
  readonly tolerance?: number;
}

export const DEFAULT_RANK_TOLERANCE = 1e-12;

export interface ResolvedRankOptions {
  readonly order: RankOrder;
  readonly ties: TieRule;
  readonly tolerance: number;
}

export function resolveRankOptions(options: RankOptions = {}): ResolvedRankOptions {
  const tolerance = options.tolerance ?? DEFAULT_RANK_TOLERANCE;
  if (!(tolerance >= 0) || !Number.isFinite(tolerance)) {
    throw new EngineError('INVALID_ARGUMENT', 'Rank tolerance must be a finite number >= 0.', {
      tolerance,
    });
  }
  return {
    order: options.order ?? 'descending',
    ties: options.ties ?? 'competition',
    tolerance,
  };
}

function tied(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * Rank of every score, in input order.
 *
 * Scores are sorted (stable, by input position among equals) and split into tie groups: a
 * score joins the current group while it is within the tolerance of the group's first
 * score. Anchoring on the first score keeps groups well defined even though "within
 * tolerance" is not transitive.
 */
export function rankValues(scores: readonly number[], options: RankOptions = {}): number[] {
  const { order, ties, tolerance } = resolveRankOptions(options);
  scores.forEach((score, index) => {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new EngineError('INVALID_ARGUMENT', 'Only finite scores can be ranked.', {
        index,
        score: String(score),
      });
    }
  });

  const sign = order === 'descending' ? -1 : 1;
  const sorted = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => sign * (a.score - b.score) || a.index - b.index);

  const ranks = new Array<number>(scores.length).fill(0);
  let groupStart = 0;
  let denseRank = 0;
  while (groupStart < sorted.length) {
    const anchor = (sorted[groupStart] as { score: number }).score;
    let groupEnd = groupStart + 1;
    while (
      groupEnd < sorted.length &&
      tied(anchor, (sorted[groupEnd] as { score: number }).score, tolerance)
    ) {
      groupEnd += 1;
    }
    denseRank += 1;
    // Inside a tie group the input position decides, not the sub-tolerance differences.
    const group = sorted
      .slice(groupStart, groupEnd)
      .map((entry) => entry.index)
      .sort((a, b) => a - b);
    group.forEach((index, offset) => {
      switch (ties) {
        case 'competition':
          ranks[index] = groupStart + 1;
          break;
        case 'dense':
          ranks[index] = denseRank;
          break;
        case 'fractional':
          ranks[index] = (groupStart + 1 + groupEnd) / 2;
          break;
        case 'ordinal':
          ranks[index] = groupStart + offset + 1;
          break;
      }
    });
    groupStart = groupEnd;
  }
  return ranks;
}

/**
 * Indices of the scores from best to worst. Tied scores keep their input order, so the
 * result is fully determined by the input.
 */
export function rankOrder(scores: readonly number[], options: RankOptions = {}): number[] {
  const ordinal = rankValues(scores, { ...options, ties: 'ordinal' });
  const result = new Array<number>(scores.length).fill(0);
  ordinal.forEach((rank, index) => {
    result[rank - 1] = index;
  });
  return result;
}
