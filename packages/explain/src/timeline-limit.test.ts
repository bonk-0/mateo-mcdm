/**
 * Past MAX_FLIGHTS_PER_SCENE flights, a fill scene stops expanding ranges and only collects
 * the flights that start at a single cell. The timeline must stay exactly what the full
 * expansion gives (`testing/timeline-reference.ts`), on tables below and above the limit.
 */
import type { DecisionMatrix, Trace } from '@mateo/engine';
import {
  createTraceBuilder,
  crisp,
  crispWeights,
  decodeTrace,
  encodeTrace,
  runMethod,
  term,
  textLiteral,
} from '@mateo/engine';
import type { TFN } from '@mateo/fuzzy';
import { criticMethod, fuzzyMarcosMethod, marcosMethod, merecMethod } from '@mateo/methods';
import { describe, expect, it } from 'vitest';
import { sequenceFor } from './sequences';
import criticTrace100 from './testing/fixtures/critic-1.0.0-trace.json';
import merecTrace100 from './testing/fixtures/merec-1.0.0-trace.json';
import { buildTimeline as referenceTimeline } from './testing/timeline-reference';
import { MAX_FLIGHTS_PER_SCENE, buildTimeline } from './timeline';
import type { ExplainSequence } from './types';

function matrix<T>(
  m: number,
  n: number,
  cell: (x: number) => T,
  numberType: string,
): DecisionMatrix<T> {
  let seed = m * 31 + n;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return {
    alternatives: Array.from({ length: m }, (_, i) => ({
      id: `a${i}`,
      name: textLiteral(`A${i}`),
    })),
    criteria: Array.from({ length: n }, (_, j) => ({
      id: `c${j}`,
      name: textLiteral(`C${j}`),
      direction: j % 3 === 0 ? ('cost' as const) : ('benefit' as const),
      numberType,
    })),
    values: Array.from({ length: m }, () => Array.from({ length: n }, () => cell(1 + next() * 99))),
  };
}

const weights = (n: number) =>
  crispWeights(
    Array.from({ length: n }, (_, j) => `c${j}`),
    Array.from({ length: n }, () => 1 / n),
  );
const tfn = (x: number): TFN => ({ l: x * 0.9, m: x, u: x * 1.2 });

const runs: [string, (m: number, n: number) => Trace][] = [
  ['critic', (m, n) => runMethod(criticMethod, { matrix: matrix(m, n, (x) => x, 'crisp') }).trace],
  ['merec', (m, n) => runMethod(merecMethod, { matrix: matrix(m, n, (x) => x, 'crisp') }).trace],
  [
    'marcos',
    (m, n) =>
      runMethod(marcosMethod, { matrix: matrix(m, n, (x) => x, 'crisp'), weights: weights(n) })
        .trace,
  ],
  [
    'fuzzy-marcos',
    (m, n) =>
      runMethod(fuzzyMarcosMethod, { matrix: matrix(m, n, tfn, 'tfn'), weights: weights(n) }).trace,
  ],
];

/** The method's own sequence with every step flying direct cells only. */
const directOnly = (sequence: ExplainSequence): ExplainSequence => ({
  ...sequence,
  steps: Object.fromEntries(
    Object.entries(sequence.steps).map(([id, plan]) => [
      id,
      { ...plan, flights: 'direct' as const },
    ]),
  ),
});

describe.each(runs)('the timeline of %s past the flight limit', (methodId, traceOf) => {
  const sequence = sequenceFor(methodId)!;
  it.each([
    [4, 3],
    [12, 9],
    [30, 25],
    [70, 12],
  ])('is unchanged on %i × %i', (m, n) => {
    const trace = traceOf(m, n);
    for (const plan of [sequence, directOnly(sequence)]) {
      for (const maxFlightsPerScene of [1, 3, 8, 20, 60, 200, MAX_FLIGHTS_PER_SCENE]) {
        const options = { maxFlightsPerScene };
        expect(buildTimeline(trace, plan, options)).toEqual(
          referenceTimeline(trace, plan, options),
        );
      }
    }
  });

  it('crosses the limit on the larger tables', () => {
    const trace = traceOf(30, 25);
    expect(
      trace.steps.some((step) => step.output.cells.flat().length > MAX_FLIGHTS_PER_SCENE),
    ).toBe(true);
  });
});

/**
 * A made-up trace whose cells mix every kind of operand: the cell at the same place, cells
 * of the same row and of other rows, whole rows and columns, blocks, repeated operands
 * with and without other terms, and two source steps.
 */
function mixedTrace(m: number, n: number, variant: number): Trace {
  const tb = createTraceBuilder({ methodId: 'mixed', methodVersion: '1.0.0' });
  const x = tb.inputMatrix({
    id: 'x',
    nameKey: 'k',
    explanationKey: 'k',
    matrix: matrix(m, n, (v) => v, 'crisp'),
  });
  const y = tb.table<number>({
    id: 'y',
    nameKey: 'k',
    explanationKey: 'k',
    rows: x.rows,
    columns: x.columns,
    cell: (row, column) => crisp.add(x.cell(row.index, column.index), 1),
  });
  const pick = (i: number, j: number, k: number) => (i * 7 + j * 3 + k * 5 + variant) % 10;
  const z = tb.table<number>({
    id: 'z',
    nameKey: 'k',
    explanationKey: 'k',
    formulas: [
      {
        id: 'f',
        template: '{{z}} = {{a}} + {{b}}',
        terms: [
          { name: 'z', latex: 'z' },
          { name: 'a', latex: 'a' },
          { name: 'b', latex: 'b' },
        ],
      },
    ],
    rows: x.rows,
    columns: x.columns,
    cell: (row, column) => {
      const i = row.index;
      const j = column.index;
      const parts = [0, 1, 2, 3].map((k) => {
        const source = (i + j + k + variant) % 2 === 0 ? x : y;
        const t = (k + variant) % 3 === 0 ? 'a' : 'b';
        switch (pick(i, j, k)) {
          case 0:
            return term(source.cell(i, j), t);
          case 1:
            return term(source.cell(i, (j + 1) % n), t);
          case 2:
            return term(source.cell((i + 1) % m, j), t);
          case 3:
            return crisp.sum(term(source.column(j), t));
          case 4:
            return crisp.sum(term(source.row(i), t));
          case 5:
            return crisp.sum(term(source.range({ rows: [(i + 1) % m], columns: [j] }), t));
          case 6:
            return crisp.sum(
              term(source.range({ rows: [i, (i + 2) % m], columns: [0, (j + 1) % n] }), t),
            );
          case 7:
            return crisp.add(term(source.cell(i, j), 'a'), term(source.cell(i, j), 'b'));
          case 8:
            // A cell of another row, first in a block, then on its own.
            return crisp.add(
              crisp.sum(term(source.range({ rows: [(i + 1) % m], columns: [j] }), t)),
              term(source.cell((i + 1) % m, j), t),
            );
          default:
            return crisp.sum(term(source.range({ columns: [(j + 2) % n] }), t));
        }
      });
      return crisp.add(crisp.add(parts[0]!, parts[1]!), crisp.add(parts[2]!, parts[3]!));
    },
  });
  void z;
  return tb.build();
}

describe('a trace that mixes every kind of operand', () => {
  const sequence: ExplainSequence = {
    methodId: 'mixed',
    steps: { x: { view: 'matrix' }, y: { view: 'matrix' }, z: { view: 'matrix' } },
  };
  it.each([
    [3, 3, 0],
    [5, 4, 1],
    [6, 7, 2],
    [9, 5, 3],
    [12, 12, 4],
  ])('gives the same timeline on %i × %i (variant %i)', (m, n, variant) => {
    const trace = mixedTrace(m, n, variant);
    for (const plan of [sequence, directOnly(sequence)]) {
      for (const maxFlightsPerScene of [0, 1, 2, 5, 10, 30, 100, MAX_FLIGHTS_PER_SCENE]) {
        const options = { maxFlightsPerScene };
        expect(buildTimeline(trace, plan, options)).toEqual(
          referenceTimeline(trace, plan, options),
        );
      }
    }
  });
});

describe('analyses saved before the CRITIC and MEREC traces got smaller (1.0.0)', () => {
  // Stored as Mateo 0.1 wrote them: trace format 1.
  it.each([
    ['critic', decodeTrace(criticTrace100)],
    ['merec', decodeTrace(merecTrace100)],
  ])('still have an explanation for %s', (methodId, trace) => {
    expect(trace.methodVersion).toBe('1.0.0');
    const timeline = buildTimeline(trace, sequenceFor(methodId)!);
    expect(timeline.steps.map((step) => step.stepId)).toEqual(trace.steps.map((step) => step.id));
    expect(timeline).toEqual(referenceTimeline(trace, sequenceFor(methodId)!));
  });
});

describe('a trace read back from a project file', () => {
  // Stored traces share their nodes again after reading; the timeline must not notice.
  it.each(runs)('explains %s exactly like the trace of the run', (methodId, traceOf) => {
    const trace = traceOf(12, 5);
    const stored = decodeTrace(JSON.parse(JSON.stringify(encodeTrace(trace))) as unknown);
    const sequence = sequenceFor(methodId)!;
    expect(buildTimeline(stored, sequence)).toEqual(buildTimeline(trace, sequence));
  });
});

describe('the timeline of a 500 × 50 run', () => {
  // Took 29 s for CRITIC and 13 s for MEREC when every cell expanded its ranges.
  it.each(runs)('of %s is built within the time budget', (methodId, traceOf) => {
    const trace = traceOf(500, 50);
    const started = Date.now();
    const timeline = buildTimeline(trace, sequenceFor(methodId)!);
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(timeline.steps).toHaveLength(trace.steps.length);
  });
});
