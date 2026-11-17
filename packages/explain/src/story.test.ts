import { runMethod, textLiteral, crispWeights } from '@mateo/engine';
import { marcosMethod } from '@mateo/methods';
import { describe, expect, it } from 'vitest';
import { focusAxis } from './focus';
import { numbersOf, traceNumbers } from './numbers';
import { fuzzyMarcosSequence, marcosSequence } from './sequences';
import { buildRankingStory, orderValue } from './story';
import { fuzzyMarcosRun, marcosRun } from './testing/runs';

describe('buildRankingStory', () => {
  const run = marcosRun();
  const story = buildRankingStory(run.trace, marcosSequence.story!)!;
  const best = [...run.result.ranking].sort((a, b) => a.rank - b.rank);

  it('names the winner and the runner-up of the engine result', () => {
    expect(story.winner.item.id).toBe(best[0]!.alternativeId);
    expect(story.winner.score.value).toBe(best[0]!.score);
    expect(story.winner.rank.value).toBe(1);
    expect(story.runnerUp!.item.id).toBe(best[1]!.alternativeId);
    expect(story.runnerUp!.score.value).toBe(best[1]!.score);
    expect(story.tiedWithWinner).toEqual([]);
  });

  it('orders the criteria by what they contribute to the winner', () => {
    const weighted = run.trace.steps.find((step) => step.id === 'weighted-matrix')!;
    const row = weighted.output.rows.findIndex((item) => item.id === story.winner.item.id);
    const expected = weighted.output.columns
      .map((column, c) => ({
        id: column.id,
        value: weighted.output.cells[row]![c]!.value as number,
      }))
      .sort((a, b) => b.value - a.value);
    expect(story.drivers.map((driver) => driver.criterion.id)).toEqual(expected.map((x) => x.id));
    expect(story.drivers.map((driver) => driver.winner.value)).toEqual(
      expected.map((x) => x.value),
    );
    for (const driver of story.drivers) {
      expect(driver.winner.ref).toEqual({
        step: 'weighted-matrix',
        row: story.winner.item.id,
        column: driver.criterion.id,
      });
      expect(driver.runnerUp!.ref.row).toBe(story.runnerUp!.item.id);
    }
  });

  it('splits the criteria into where the winner is ahead and behind', () => {
    for (const driver of story.ahead) {
      expect(driver.winner.value as number).toBeGreaterThan(driver.runnerUp!.value as number);
    }
    for (const driver of story.behind) {
      expect(driver.winner.value as number).toBeLessThan(driver.runnerUp!.value as number);
    }
    expect(story.ahead.length).toBeGreaterThan(0);
    expect(story.ahead.length + story.behind.length).toBeLessThanOrEqual(story.drivers.length);
  });

  it('holds only numbers of the trace', () => {
    const known = traceNumbers(run.trace);
    const values = [
      story.winner.score.value,
      story.winner.rank.value,
      story.runnerUp!.score.value,
      story.runnerUp!.rank.value,
      ...story.drivers.flatMap((driver) => [driver.winner.value, driver.runnerUp!.value]),
    ];
    for (const number of values.flatMap(numbersOf)) expect(known.has(number)).toBe(true);
  });

  it('orders fuzzy contributions by their most likely value without calculating', () => {
    const fuzzy = fuzzyMarcosRun();
    const fuzzyStory = buildRankingStory(fuzzy.trace, fuzzyMarcosSequence.story!)!;
    const known = traceNumbers(fuzzy.trace);
    const modal = fuzzyStory.drivers.map((driver) => orderValue(driver.winner.value)!);
    expect(modal).toEqual([...modal].sort((a, b) => b - a));
    for (const driver of fuzzyStory.drivers) {
      for (const number of numbersOf(driver.winner.value)) expect(known.has(number)).toBe(true);
    }
    const winner = [...fuzzy.result.ranking].sort((a, b) => a.rank - b.rank)[0]!;
    expect(fuzzyStory.winner.item.id).toBe(winner.alternativeId);
  });

  it('reports alternatives that share the best rank, and a single alternative', () => {
    const matrix = (values: number[][]) => ({
      alternatives: values.map((_, i) => ({ id: `a${i + 1}`, name: textLiteral(`A${i + 1}`) })),
      criteria: [0, 1].map((j) => ({
        id: `c${j + 1}`,
        name: textLiteral(`C${j + 1}`),
        direction: 'benefit' as const,
        numberType: 'crisp',
      })),
      values,
    });
    const weights = crispWeights(['c1', 'c2'], [0.5, 0.5]);
    const tie = runMethod(marcosMethod, {
      matrix: matrix([
        [2, 4],
        [2, 4],
        [1, 1],
      ]),
      weights,
    });
    const tied = buildRankingStory(tie.trace, marcosSequence.story!)!;
    expect(tied.winner.item.id).toBe('a1');
    expect(tied.tiedWithWinner.map((entry) => entry.item.id)).toEqual(['a2']);
    expect(tied.runnerUp!.item.id).toBe('a2');
    expect(tied.ahead).toEqual([]);
    expect(tied.behind).toEqual([]);

    const single = runMethod(marcosMethod, { matrix: matrix([[2, 4]]), weights });
    const alone = buildRankingStory(single.trace, marcosSequence.story!)!;
    expect(alone.runnerUp).toBeNull();
    expect(alone.drivers.every((driver) => driver.runnerUp === null)).toBe(true);
    expect(alone.ahead).toEqual([]);
  });

  it('returns null when the trace lacks the steps', () => {
    expect(
      buildRankingStory(run.trace, { scores: 'nope', ranks: 'ranking', contributions: 'sums' }),
    ).toBeNull();
  });

  it('orderValue selects, and has nothing to select from text or empty cells', () => {
    expect(orderValue(3)).toBe(3);
    expect(orderValue({ type: 'tfn', components: { l: 1, m: 2, u: 3 } })).toBe(2);
    expect(orderValue({ type: 'other', components: { a: 1 } })).toBeNull();
    expect(orderValue('text')).toBeNull();
    expect(orderValue(null)).toBeNull();
  });
});

describe('focusAxis', () => {
  const items = [
    { id: 'AAI', label: textLiteral('AAI'), kind: 'reference' },
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `a${i + 1}`,
      label: textLiteral(`A${i + 1}`),
      kind: 'alternative',
    })),
    { id: 'AI', label: textLiteral('AI'), kind: 'reference' },
  ];

  it('shows a short axis in full', () => {
    expect(focusAxis(items.slice(0, 5), 12)).toEqual({
      visible: ['AAI', 'a1', 'a2', 'a3', 'a4'],
      hidden: 0,
    });
  });

  it('keeps the reference rows, the pinned rows and the first rows of a long axis', () => {
    const focus = focusAxis(items, 4, ['a17', 'unknown']);
    expect(focus.visible).toEqual(['AAI', 'a1', 'a2', 'a3', 'a17', 'AI']);
    expect(focus.hidden).toBe(16);
    expect(focusAxis(items, 2, ['a9', 'a8', 'a7']).visible).toEqual(['AAI', 'a8', 'a9', 'AI']);
  });
});
