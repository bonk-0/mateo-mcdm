import type { Trace } from '@mateo/engine';
import { decodeTrace, findStep, getStep } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { formulaOfCell } from './cell';
import { ExplainError } from './errors';
import { buildLesson, exampleCell, fitsLesson, resultFocus } from './lesson';
import { EXPLAIN_SEQUENCES, criticSequence, marcosSequence, sequenceFor } from './sequences';
import criticTrace100 from './testing/fixtures/critic-1.0.0-trace.json';
import merecTrace100 from './testing/fixtures/merec-1.0.0-trace.json';
import {
  criticRun,
  fuzzyMarcosRun,
  fuzzySwaraRun,
  marcosRun,
  merecRun,
  swaraRun,
} from './testing/runs';
import type { ExplainSequence } from './types';

const runs: [string, () => Trace][] = [
  ['marcos', () => marcosRun().trace],
  ['marcos with normalized weights', () => marcosRun({ normalizeWeights: true }).trace],
  ['fuzzy-marcos', () => fuzzyMarcosRun().trace],
  ['fuzzy-marcos with fuzzy weights', () => fuzzyMarcosRun({ fuzzyWeights: true }).trace],
  ['critic', () => criticRun().trace],
  ['critic 1.0.0', () => decodeTrace(criticTrace100)],
  ['merec', () => merecRun().trace],
  ['merec 1.0.0', () => decodeTrace(merecTrace100)],
  ['swara', () => swaraRun().trace],
  ['fuzzy-swara', () => fuzzySwaraRun().trace],
];

describe.each(runs)('the lesson of %s', (_name, traceOf) => {
  const trace = traceOf();
  const sequence = sequenceFor(trace.methodId)!;
  const lesson = buildLesson(trace, sequence);

  it('teaches every step of the trace exactly once, in trace order', () => {
    const taught = lesson.steps.flatMap((step) => step.steps);
    expect(taught).toEqual(trace.steps.map((step) => step.id));
  });

  it('goes through every step that has formulas as a part', () => {
    for (const step of lesson.steps) {
      expect(step.parts).toEqual(step.steps.filter((id) => getStep(trace, id).formulas.length > 0));
    }
  });

  it('draws only earlier steps beside a lesson step', () => {
    for (const step of lesson.steps) {
      const first = Math.min(...step.steps.map((id) => getStep(trace, id).index));
      for (const source of step.sources) {
        expect(getStep(trace, source).index).toBeLessThan(first);
        expect(step.steps).not.toContain(source);
      }
    }
  });

  it('finds a formula cell to explain in every part', () => {
    for (const step of lesson.steps) {
      for (const part of step.parts) {
        const ref = exampleCell(trace, part)!;
        const output = getStep(trace, part).output;
        const r = output.rows.findIndex((row) => row.id === ref.row);
        const c = output.columns.findIndex((column) => column.id === ref.column);
        expect(formulaOfCell(getStep(trace, part), output.cells[r]![c]!)).not.toBeNull();
      }
    }
  });
});

describe('buildLesson', () => {
  const trace = marcosRun().trace;

  it('rejects a trace of another method', () => {
    expect(() => buildLesson(trace, criticSequence)).toThrow(ExplainError);
    expect(fitsLesson(trace, criticSequence)).toBe(false);
  });

  it('rejects a lesson that leaves a step out', () => {
    const partial: ExplainSequence = {
      ...marcosSequence,
      lesson: marcosSequence.lesson.filter((step) => step.id !== 'degrees'),
    };
    expect(() => buildLesson(trace, partial)).toThrow(/does not teach the step "utility-degrees"/u);
  });

  it('rejects a lesson that expects a step the trace lacks', () => {
    const extra: ExplainSequence = {
      ...marcosSequence,
      lesson: [...marcosSequence.lesson, { id: 'extra', steps: ['nowhere'] }],
    };
    expect(() => buildLesson(trace, extra)).toThrow(/has no step "nowhere"/u);
  });

  it('rejects a step taught twice or out of order', () => {
    const twice: ExplainSequence = {
      ...marcosSequence,
      lesson: [...marcosSequence.lesson, { id: 'again', steps: ['sums'] }],
    };
    expect(() => buildLesson(trace, twice)).toThrow(/taught by both/u);
    const swapped: ExplainSequence = {
      ...marcosSequence,
      lesson: [
        marcosSequence.lesson[1]!,
        marcosSequence.lesson[0]!,
        ...marcosSequence.lesson.slice(2),
      ],
    };
    expect(() => buildLesson(trace, swapped)).toThrow(/after a later step/u);
  });

  it('passes on errors that are not about the lesson', () => {
    const broken = { ...marcosRun().trace, steps: null } as unknown as Trace;
    expect(() => fitsLesson(broken, marcosSequence)).toThrow(TypeError);
  });

  it('leaves out optional steps the trace does not have', () => {
    const lesson = buildLesson(trace, marcosSequence);
    expect(lesson.steps[0]!.steps).toEqual(['initial-matrix', 'weights']);
    const normalized = buildLesson(marcosRun({ normalizeWeights: true }).trace, marcosSequence);
    expect(normalized.steps[0]!.steps).toEqual(['initial-matrix', 'weights', 'normalized-weights']);
    expect(normalized.steps[0]!.parts).toEqual(['normalized-weights']);
  });

  it('draws the steps a lesson step reads beside it', () => {
    const lesson = buildLesson(trace, marcosSequence);
    const weigh = lesson.steps.find((step) => step.id === 'weigh')!;
    expect(weigh.parts).toEqual(['weighted-matrix', 'sums']);
    expect(weigh.sources).toEqual(['weights', 'normalized-matrix']);
    expect(lesson.steps.at(-1)!.story).toBe(true);
  });

  it('has a lesson for every sequence with unique step ids', () => {
    for (const sequence of EXPLAIN_SEQUENCES) {
      const ids = sequence.lesson.map((step) => step.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('resultFocus', () => {
  it('follows the winner and the heaviest criterion', () => {
    const run = marcosRun();
    const winner = [...run.result.ranking].sort((a, b) => a.rank - b.rank)[0]!.alternativeId;
    // PHONE_WEIGHTS = [0.5, 0.3, 0.2]: price is the heaviest criterion.
    expect(resultFocus(run.trace, marcosSequence)).toEqual({ row: winner, column: 'c1' });
  });

  it('follows the heaviest calculated weight of a weighting method', () => {
    const trace = criticRun().trace;
    const weights = findStep(trace, 'weights')!.output;
    const values = weights.cells[0]!.map((cell) => cell.value as number);
    const heaviest = weights.columns[values.indexOf(Math.max(...values))]!.id;
    expect(resultFocus(trace, criticSequence)).toEqual({ column: heaviest });
  });

  it('follows nothing the sequence does not name, and no table of weights', () => {
    const trace = marcosRun().trace;
    expect(resultFocus(trace, { ...marcosSequence, story: undefined, weights: undefined })).toEqual(
      {},
    );
    // A step of many rows is not a weight vector.
    expect(resultFocus(trace, { ...criticSequence, weights: 'initial-matrix' })).toEqual({});
    // A story that finds no winner in the trace.
    const unranked = { ...trace, steps: trace.steps.filter((step) => step.id !== 'ranking') };
    expect(resultFocus(unranked, { ...marcosSequence, weights: undefined })).toEqual({});
  });

  it('compares fuzzy weights by their most likely value', () => {
    const trace = fuzzyMarcosRun({ fuzzyWeights: true }).trace;
    expect(resultFocus(trace, sequenceFor('fuzzy-marcos')!).column).toBe('c1');
  });
});

describe('exampleCell', () => {
  const trace = marcosRun().trace;

  it('prefers a calculated cell, and an alternative over a reference row', () => {
    // In the extended matrix only the AAI and AI rows are calculated; alternatives are carried.
    expect(exampleCell(trace, 'extended-matrix')).toEqual({
      step: 'extended-matrix',
      row: 'AAI',
      column: 'c1',
    });
    expect(exampleCell(trace, 'normalized-matrix')).toEqual({
      step: 'normalized-matrix',
      row: 'a1',
      column: 'c1',
    });
  });

  it('follows the focus row and column', () => {
    expect(exampleCell(trace, 'normalized-matrix', { row: 'a3', column: 'c2' })).toEqual({
      step: 'normalized-matrix',
      row: 'a3',
      column: 'c2',
    });
    // A vector of one value per alternative keeps the focus row.
    expect(exampleCell(trace, 'sums', { row: 'a3', column: 'c2' })!.row).toBe('a3');
  });

  it('has no cell to explain in an empty step', () => {
    const empty: Trace = {
      ...trace,
      steps: trace.steps.map((step) =>
        step.id === 'sums' ? { ...step, output: { ...step.output, rows: [], cells: [] } } : step,
      ),
    };
    expect(exampleCell(empty, 'sums')).toBeNull();
  });

  it('gives the first cell of a step without formulas', () => {
    expect(exampleCell(trace, 'initial-matrix')).toEqual({
      step: 'initial-matrix',
      row: 'a1',
      column: 'c1',
    });
  });
});
