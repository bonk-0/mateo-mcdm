import type { CellRef, Trace, TraceAxisItem, TraceValue } from '@mateo/engine';
import { findStep } from '@mateo/engine';
import type { StoryPlan } from './types';

/** A value of the trace with the cell it is in. */
export interface StoryValue {
  readonly value: TraceValue;
  readonly ref: CellRef;
}

/** An alternative in the story of a ranking. */
export interface StoryEntry {
  readonly item: TraceAxisItem;
  readonly rank: StoryValue;
  readonly score: StoryValue;
}

/** What one criterion contributes to the winner and, for comparison, to the runner-up. */
export interface StoryDriver {
  readonly criterion: TraceAxisItem;
  readonly winner: StoryValue;
  readonly runnerUp: StoryValue | null;
}

/**
 * The story of a ranking: who won, which criteria carried the winner, and where the
 * winner is ahead of the runner-up. Every value is a cell of the trace. Nothing is
 * calculated: the story only compares values to order and select them, so it has no
 * numeric "gap"; the two scores are shown side by side instead.
 */
export interface RankingStory {
  readonly winner: StoryEntry;
  /** Other alternatives that share the best rank. */
  readonly tiedWithWinner: readonly StoryEntry[];
  /** The best alternative after the winner (it may share the winner's rank). */
  readonly runnerUp: StoryEntry | null;
  /** Every criterion, largest contribution to the winner first. */
  readonly drivers: readonly StoryDriver[];
  /** The criteria on which the winner's contribution is larger than the runner-up's. */
  readonly ahead: readonly StoryDriver[];
  /** The criteria on which it is smaller. */
  readonly behind: readonly StoryDriver[];
}

/**
 * A number to order a trace value by: a number itself, and the most likely value `m` of a
 * fuzzy number. This selects a component; it does not defuzzify.
 */
export function orderValue(value: TraceValue): number | null {
  if (typeof value === 'number') return value;
  if (value !== null && typeof value === 'object') {
    const m = value.components['m'];
    if (typeof m === 'number') return m;
  }
  return null;
}

function compareDescending(a: TraceValue, b: TraceValue): number {
  const x = orderValue(a);
  const y = orderValue(b);
  if (x === y) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x > y ? -1 : 1;
}

/**
 * Builds the story of a ranking from the steps its explain sequence names. Returns `null`
 * when the trace does not have them or has no alternatives.
 */
export function buildRankingStory(trace: Trace, plan: StoryPlan): RankingStory | null {
  const scores = findStep(trace, plan.scores);
  const ranks = findStep(trace, plan.ranks);
  const contributions = findStep(trace, plan.contributions);
  if (scores === undefined || ranks === undefined || contributions === undefined) return null;
  const scoreColumn = scores.output.columns[0];
  const rankColumn = ranks.output.columns[0];
  if (scoreColumn === undefined || rankColumn === undefined) return null;

  const entries: StoryEntry[] = [];
  ranks.output.rows.forEach((item, r) => {
    const rank = ranks.output.cells[r]?.[0];
    const s = scores.output.rows.findIndex((row) => row.id === item.id);
    const score = scores.output.cells[s]?.[0];
    if (rank === undefined || score === undefined) return;
    entries.push({
      item,
      rank: { value: rank.value, ref: { step: ranks.id, row: item.id, column: rankColumn.id } },
      score: { value: score.value, ref: { step: scores.id, row: item.id, column: scoreColumn.id } },
    });
  });
  // Best rank first: the smallest rank value. Equal ranks keep the order of the trace.
  const ordered = entries
    .map((entry, position) => ({ entry, position }))
    .sort(
      (a, b) =>
        compareDescending(b.entry.rank.value, a.entry.rank.value) || a.position - b.position,
    )
    .map(({ entry }) => entry);
  const winner = ordered[0];
  if (winner === undefined) return null;
  const runnerUp = ordered[1] ?? null;
  const tiedWithWinner = ordered
    .slice(1)
    .filter((entry) => compareDescending(entry.rank.value, winner.rank.value) === 0);

  const table = contributions.output;
  const rowOf = (id: string) => table.rows.findIndex((row) => row.id === id);
  const valueAt = (r: number, c: number, row: string, column: string): StoryValue | null => {
    const cell = table.cells[r]?.[c];
    return cell === undefined
      ? null
      : { value: cell.value, ref: { step: contributions.id, row, column } };
  };
  const winnerRow = rowOf(winner.item.id);
  const runnerUpRow = runnerUp === null ? -1 : rowOf(runnerUp.item.id);
  const drivers: StoryDriver[] = [];
  table.columns.forEach((criterion, c) => {
    const own = valueAt(winnerRow, c, winner.item.id, criterion.id);
    if (own === null) return;
    drivers.push({
      criterion,
      winner: own,
      runnerUp: runnerUp === null ? null : valueAt(runnerUpRow, c, runnerUp.item.id, criterion.id),
    });
  });
  const byContribution = drivers
    .map((driver, position) => ({ driver, position }))
    .sort(
      (a, b) =>
        compareDescending(a.driver.winner.value, b.driver.winner.value) || a.position - b.position,
    )
    .map(({ driver }) => driver);
  const versus = (sign: number) =>
    byContribution.filter(
      (driver) =>
        driver.runnerUp !== null &&
        compareDescending(driver.winner.value, driver.runnerUp.value) === sign,
    );
  return {
    winner,
    tiedWithWinner,
    runnerUp,
    drivers: byContribution,
    ahead: versus(-1),
    behind: versus(1),
  };
}
