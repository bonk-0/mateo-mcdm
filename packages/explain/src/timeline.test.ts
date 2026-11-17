import type { Trace, TraceValue } from '@mateo/engine';
import { findCell, findStep, traceValuesEqual } from '@mateo/engine';
import { describe, expect, it } from 'vitest';
import { formulaOfCell } from './cell';
import { ExplainError } from './errors';
import { numbersOf, traceNumbers } from './numbers';
import {
  criticSequence,
  fuzzyMarcosSequence,
  fuzzySwaraSequence,
  marcosSequence,
  merecSequence,
  sequenceFor,
  swaraSequence,
} from './sequences';
import {
  criticRun,
  fuzzyMarcosRun,
  fuzzySwaraRun,
  largeMarcosRun,
  marcosRun,
  merecRun,
  swaraRun,
} from './testing/runs';
import { MAX_FLIGHTS_PER_SCENE, buildTimeline, scenesOfStep } from './timeline';
import type { ExplainSequence, Timeline } from './types';

const RUNS: readonly (readonly [string, () => Trace, ExplainSequence])[] = [
  ['MARCOS', () => marcosRun().trace, marcosSequence],
  [
    'MARCOS with normalized weights',
    () => marcosRun({ normalizeWeights: true }).trace,
    marcosSequence,
  ],
  ['MARCOS 10 × 8', () => largeMarcosRun().trace, marcosSequence],
  ['Fuzzy MARCOS', () => fuzzyMarcosRun().trace, fuzzyMarcosSequence],
  [
    'Fuzzy MARCOS with TFN weights and the centroid',
    () => fuzzyMarcosRun({ fuzzyWeights: true, centroid: true }).trace,
    fuzzyMarcosSequence,
  ],
  [
    'Fuzzy MARCOS with normalized weights',
    () => fuzzyMarcosRun({ normalizeWeights: true }).trace,
    fuzzyMarcosSequence,
  ],
  ['CRITIC', () => criticRun().trace, criticSequence],
  ['MEREC', () => merecRun().trace, merecSequence],
  ['SWARA', () => swaraRun().trace, swaraSequence],
  ['Fuzzy SWARA', () => fuzzySwaraRun().trace, fuzzySwaraSequence],
  [
    'Fuzzy SWARA with the centroid',
    () => fuzzySwaraRun({ centroid: true }).trace,
    fuzzySwaraSequence,
  ],
];

/** Every trace value a timeline carries: reveals, flights and vector items. */
function timelineValues(timeline: Timeline): TraceValue[] {
  const values: TraceValue[] = [];
  for (const scene of timeline.scenes) {
    for (const reveal of scene.reveals) values.push(reveal.value);
    for (const flight of scene.flights) values.push(flight.value);
    if (scene.kind === 'vector') for (const item of scene.items) values.push(item.value);
  }
  return values;
}

/**
 * Walks the whole timeline object and returns every number stored under a key that is not
 * timing or position. This catches a number that a future field might add outside the
 * reveals and flights.
 */
function strayNumbers(node: unknown, key = ''): number[] {
  const layout = new Set([
    'index',
    'stepIndex',
    'beats',
    'start',
    'end',
    'firstScene',
    'sceneCount',
  ]);
  if (typeof node === 'number') return layout.has(key) ? [] : [node];
  if (Array.isArray(node)) return node.flatMap((item) => strayNumbers(item, key));
  if (node !== null && typeof node === 'object') {
    return Object.entries(node).flatMap(([name, value]) => strayNumbers(value, name));
  }
  return [];
}

describe.each(RUNS)('timeline of %s', (_name, traceOf, sequence) => {
  const trace = traceOf();
  const timeline = buildTimeline(trace, sequence);

  it('shows only numbers that are values of the engine trace', () => {
    const known = traceNumbers(trace);
    const shown = timelineValues(timeline).flatMap(numbersOf);
    expect(shown.length).toBeGreaterThan(0);
    for (const number of shown) expect(known.has(number)).toBe(true);
    for (const number of strayNumbers(timeline)) expect(known.has(number)).toBe(true);
  });

  it('copies every value from the cell it names', () => {
    for (const scene of timeline.scenes) {
      for (const reveal of scene.reveals) {
        expect(reveal.ref.step).toBe(scene.stepId);
        expect(traceValuesEqual(reveal.value, findCell(trace, reveal.ref)!.value)).toBe(true);
      }
      for (const flight of scene.flights) {
        expect(scene.sources).toContain(flight.from.step);
        expect(flight.to.step).toBe(scene.stepId);
        expect(traceValuesEqual(flight.value, findCell(trace, flight.from)!.value)).toBe(true);
      }
      if (scene.kind === 'vector') {
        for (const item of scene.items) {
          expect(traceValuesEqual(item.value, findCell(trace, item.ref)!.value)).toBe(true);
        }
      }
    }
  });

  it('covers every step of the trace in order, and fills every cell', () => {
    expect(timeline.steps.map((step) => step.stepId)).toEqual(trace.steps.map((step) => step.id));
    timeline.scenes.forEach((scene, index) => expect(scene.index).toBe(index));
    for (const step of trace.steps) {
      const scenes = scenesOfStep(timeline, step.id);
      const fill = scenes.at(-1)!;
      expect(fill.kind).not.toBe('formula');
      expect(fill.reveals).toHaveLength(step.output.rows.length * step.output.columns.length);
      const entry = timeline.steps[step.index]!;
      expect(timeline.scenes[entry.firstScene]).toBe(scenes[0]);
      expect(entry.sceneCount).toBe(scenes.length);
    }
  });

  it('introduces every formula that produced a cell, on a cell it produced', () => {
    for (const step of trace.steps) {
      const used = new Set(
        step.output.cells.flat().flatMap((cell) => formulaOfCell(step, cell)?.id ?? []),
      );
      const scenes = scenesOfStep(timeline, step.id).flatMap((scene) =>
        scene.kind === 'formula' ? [scene] : [],
      );
      expect(new Set(scenes.map((scene) => scene.formulaId))).toEqual(used);
      for (const scene of scenes) {
        const cell = findCell(trace, scene.example)!;
        expect(formulaOfCell(step, cell)?.id).toBe(scene.formulaId);
        expect(scene.reveals.map((reveal) => reveal.ref)).toEqual([scene.example]);
        expect(scene.narration).toBeDefined();
      }
    }
  });

  it('keeps all timing inside the scene and every scene light', () => {
    for (const scene of timeline.scenes) {
      expect(scene.beats).toBeGreaterThan(0);
      expect(scene.flights.length).toBeLessThanOrEqual(MAX_FLIGHTS_PER_SCENE);
      for (const { at } of [...scene.reveals, ...scene.flights]) {
        expect(at.start).toBeGreaterThanOrEqual(0);
        expect(at.end).toBeLessThanOrEqual(1);
        expect(at.start).toBeLessThan(at.end);
      }
    }
  });

  it('is plain data', () => {
    expect(JSON.parse(JSON.stringify(timeline))).toEqual(timeline);
  });
});

describe('the MARCOS sequence', () => {
  const trace = marcosRun().trace;
  const timeline = buildTimeline(trace, marcosSequence);

  it('follows the order of the plan: matrices, sums, utilities, ranking', () => {
    expect(timeline.steps.map((step) => step.stepId)).toEqual([
      'initial-matrix',
      'weights',
      'extended-matrix',
      'normalized-matrix',
      'weighted-matrix',
      'sums',
      'utility-degrees',
      'utility-functions',
      'final-utility',
      'ranking',
    ]);
    expect(timeline.scenes.map((scene) => scene.id)).toEqual([
      'initial-matrix',
      'weights',
      'extended-matrix/anti-ideal-benefit',
      'extended-matrix/anti-ideal-cost',
      'extended-matrix/ideal-benefit',
      'extended-matrix/ideal-cost',
      'extended-matrix',
      'normalized-matrix/benefit',
      'normalized-matrix/cost',
      'normalized-matrix',
      'weighted-matrix/weighted',
      'weighted-matrix',
      'sums/sum',
      'sums',
      'utility-degrees/k-minus',
      'utility-degrees/k-plus',
      'utility-degrees',
      'utility-functions/f-k-minus',
      'utility-functions/f-k-plus',
      'utility-functions',
      'final-utility/final-utility',
      'final-utility',
      'ranking',
    ]);
  });

  it('flies the cells of consecutive matrices: initial → extended → normalized → weighted', () => {
    const scene = (id: string) => timeline.scenes.find((item) => item.id === id)!;
    const extended = scene('extended-matrix');
    // Alternative rows are carried over; AAI and AI gather their whole column.
    const carried = extended.flights.filter((flight) => flight.carried);
    expect(carried).toHaveLength(4 * 3);
    for (const flight of carried) {
      expect(flight.from).toEqual({ ...flight.to, step: 'initial-matrix' });
    }
    const intoIdeal = extended.flights.filter(
      (flight) => flight.to.row === 'AI' && flight.to.column === 'c1',
    );
    expect(intoIdeal.map((flight) => flight.from.row)).toEqual(['a1', 'a2', 'a3', 'a4']);

    const normalized = scene('normalized-matrix');
    const into = normalized.flights.filter(
      (flight) => flight.to.row === 'a1' && flight.to.column === 'c2',
    );
    // While the table fills, only the value at the same place flies in...
    expect(into.map((flight) => [flight.from.row, flight.term])).toEqual([['a1', 'x']]);
    // ...and the formula scene shows every operand of its example cell.
    expect(
      scene('normalized-matrix/benefit').flights.map((flight) => [flight.from.row, flight.term]),
    ).toEqual([
      ['a1', 'x'],
      ['AI', 'x_ai'],
    ]);
    const degrees = scene('utility-degrees');
    expect(degrees.flights.every((flight) => flight.from.row === flight.to.row)).toBe(true);
    expect(scene('sums').flights.filter((flight) => flight.to.row === 'a1')).toHaveLength(3);
    expect(normalized.flights.every((flight) => flight.from.step === 'extended-matrix')).toBe(true);

    const weighted = scene('weighted-matrix');
    expect(weighted.sources).toEqual(['normalized-matrix', 'weights']);
    expect(new Set(weighted.flights.map((flight) => flight.from.step))).toEqual(
      new Set(['normalized-matrix', 'weights']),
    );
  });

  it('orders the ranking scene best first using the ranks of the trace', () => {
    const ranking = timeline.scenes.at(-1)!;
    if (ranking.kind !== 'vector') throw new Error('expected a vector scene');
    expect(ranking.view).toBe('ranking');
    const best = [...marcosRun().result.ranking].sort((a, b) => a.rank - b.rank);
    expect(ranking.order).toEqual(best.map((entry) => entry.alternativeId));
    // Only the own score flies into a rank.
    expect(ranking.flights).toHaveLength(4);
  });

  it('uses the normalized weights when the method normalizes them', () => {
    const normalized = buildTimeline(marcosRun({ normalizeWeights: true }).trace, marcosSequence);
    const weighted = normalized.scenes.find((scene) => scene.id === 'weighted-matrix')!;
    expect(weighted.sources).toEqual(['normalized-matrix', 'normalized-weights']);
    expect(
      normalized.scenes.some((scene) => scene.id === 'normalized-weights/normalized-weight'),
    ).toBe(true);
  });

  it('highlights the reference rows of the extended matrix', () => {
    const extended = timeline.scenes.find((scene) => scene.id === 'extended-matrix')!;
    expect(extended.kind === 'matrix' && extended.highlightRows).toEqual(['AAI', 'AI']);
  });
});

describe('the Fuzzy MARCOS sequence', () => {
  it('adds the fuzzy steps and the defuzzification of the source paper', () => {
    const timeline = buildTimeline(fuzzyMarcosRun().trace, fuzzyMarcosSequence);
    const steps = timeline.steps.map((step) => step.stepId);
    expect(steps).toEqual([
      'initial-matrix',
      'weights',
      'extended-matrix',
      'normalized-matrix',
      'weighted-matrix',
      'sums',
      'utility-degrees',
      'utility-degree-sums',
      'max-utility-degree-sum',
      'max-utility-degree-sum-crisp',
      'utility-functions',
      'defuzzification',
      'final-utility',
      'ranking',
    ]);
    const value = timeline.scenes.find((scene) => scene.id === 'max-utility-degree-sum')!;
    expect(value.kind === 'vector' && value.view).toBe('value');
    expect(timeline.scenes.some((scene) => scene.id === 'defuzzification/defuzzify')).toBe(true);
  });
});

describe('a sequence that does not fit the trace', () => {
  const trace = marcosRun().trace;
  const code = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      if (error instanceof ExplainError) return error.code;
      throw error;
    }
    return undefined;
  };

  it('is rejected instead of leaving a step unexplained', () => {
    expect(code(() => buildTimeline(trace, fuzzyMarcosSequence))).toBe('METHOD_MISMATCH');
    const { ranking: _ranking, ...withoutRanking } = marcosSequence.steps;
    expect(code(() => buildTimeline(trace, { methodId: 'marcos', steps: withoutRanking }))).toBe(
      'UNPLANNED_STEP',
    );
    expect(
      code(() =>
        buildTimeline(trace, {
          methodId: 'marcos',
          steps: { ...marcosSequence.steps, extra: {} },
        }),
      ),
    ).toBe('MISSING_STEP');
  });

  it('rejects a view or a source the step cannot have', () => {
    const withPlan = (id: string, plan: object): ExplainSequence => ({
      methodId: 'marcos',
      steps: { ...marcosSequence.steps, [id]: plan },
    });
    expect(code(() => buildTimeline(trace, withPlan('sums', { view: 'value' })))).toBe(
      'INVALID_PLAN',
    );
    expect(code(() => buildTimeline(trace, withPlan('extended-matrix', { view: 'ranking' })))).toBe(
      'INVALID_PLAN',
    );
    expect(code(() => buildTimeline(trace, withPlan('sums', { sources: ['ranking'] })))).toBe(
      'INVALID_PLAN',
    );
    expect(code(() => buildTimeline(trace, withPlan('sums', { sources: ['nope'] })))).toBe(
      'INVALID_PLAN',
    );
  });

  it('honours plans without formula scenes or flights, and default views', () => {
    const bare: ExplainSequence = {
      methodId: 'marcos',
      steps: Object.fromEntries(
        trace.steps.map((step) => [step.id, { formulaScenes: false, flights: 'none' }]),
      ),
    };
    const timeline = buildTimeline(trace, bare);
    expect(timeline.scenes).toHaveLength(trace.steps.length);
    expect(timeline.scenes.every((scene) => scene.flights.length === 0)).toBe(true);
    const views = timeline.scenes.map((scene) => (scene.kind === 'formula' ? '' : scene.view));
    expect(views.at(-1)).toBe('ranking');
    expect(views[0]).toBe('matrix');
    expect(views[1]).toBe('bars');
    // Sources default to the steps a step consumed.
    const weighted = timeline.scenes.find((scene) => scene.id === 'weighted-matrix')!;
    expect(weighted.sources).toEqual(
      findStep(trace, 'weighted-matrix')!.sources.flatMap((source) =>
        source.kind === 'step' ? [source.step] : [],
      ),
    );
  });
});

describe('the weighting sequences', () => {
  it('cover every step of the method, in the order of its formulation', () => {
    const order = (trace: Trace) =>
      buildTimeline(trace, sequenceFor(trace.methodId)!).steps.map((s) => s.stepId);
    expect(order(criticRun().trace)).toEqual([
      'initial-matrix',
      'normalized-matrix',
      'means',
      'deviations',
      'standard-deviations',
      'correlation-matrix',
      'conflict',
      'information-content',
      'weights',
    ]);
    expect(order(merecRun().trace)).toEqual([
      'initial-matrix',
      'normalized-matrix',
      'absolute-logs',
      'overall-performance',
      'removal-performance',
      'removal-effects',
      'weights',
    ]);
    expect(order(swaraRun().trace)).toEqual([
      'comparative-importance',
      'coefficients',
      'recalculated-weights',
      'weights',
    ]);
    expect(order(fuzzySwaraRun().trace)).toEqual([
      'assessments',
      'coefficients',
      'recalculated-weights',
      'recalculated-weights-sum',
      'fuzzy-weights',
      'crisp-weights',
      'weights',
    ]);
  });

  it('flies the correlation of two criteria from the normalized matrix', () => {
    const timeline = buildTimeline(criticRun().trace, criticSequence);
    const scene = timeline.scenes.find((item) => item.id === 'correlation-matrix/pearson')!;
    expect(scene.flights.length).toBeGreaterThan(0);
    expect(scene.flights.every((flight) => flight.from.step !== 'correlation-matrix')).toBe(true);
  });
});

describe('sequenceFor', () => {
  it('knows every Phase 1 method', () => {
    expect(sequenceFor('marcos')).toBe(marcosSequence);
    expect(sequenceFor('fuzzy-marcos')).toBe(fuzzyMarcosSequence);
    expect(sequenceFor('critic')).toBe(criticSequence);
    expect(sequenceFor('merec')).toBe(merecSequence);
    expect(sequenceFor('swara')).toBe(swaraSequence);
    expect(sequenceFor('fuzzy-swara')).toBe(fuzzySwaraSequence);
    expect(sequenceFor('topsis')).toBeUndefined();
  });
});
