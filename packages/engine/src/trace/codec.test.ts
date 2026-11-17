import { describe, expect, it } from 'vitest';
import { sampleInput } from '../__fixtures__/sample';
import { weightedSumMethod } from '../__fixtures__/weighted-sum';
import { deepClone } from '../determinism/canonical';
import { EngineError } from '../errors';
import { textKey } from '../model/text';
import { createTraceBuilder } from './builder';
import type { EncodedTrace } from './codec';
import { decodeTrace, encodeTrace, TRACE_FORMAT_VERSION } from './codec';
import { crisp } from './crisp-ops';
import { constant, derive, empty, parameter, term } from './tracked';
import type { Encoder } from './tracked';
import type { DerivationNode, OperationNode, Trace, TraceValue } from './types';
import { verifyTrace } from './verify';

type Mutable<T> = T extends string | number | boolean | null | undefined
  ? T
  : { -readonly [K in keyof T]: Mutable<T[K]> };

/** What a project file does: encode, write JSON text, read it back, decode. */
const roundTrip = (trace: Trace): Trace =>
  decodeTrace(JSON.parse(JSON.stringify(encodeTrace(trace))) as unknown);

const sampleTrace = (normalization: 'max' | 'sum' = 'max'): Trace =>
  weightedSumMethod.run(sampleInput(), { normalization }).trace;

interface Pair {
  readonly a: number;
  readonly b: number;
}
const encodePair: Encoder<Pair> = ({ a, b }) => ({ type: 'pair', components: { a, b } });

/** A trace that uses every node kind and every optional field. */
function everyKindTrace(): Trace {
  const tb = createTraceBuilder({ methodId: 'all-kinds', methodVersion: '2.0.0' });
  const rows = [
    { id: 'r1', label: textKey('rows.r1'), kind: 'alternative' as const },
    { id: 'r2', label: { text: 'Row 2' } },
  ];
  const columns = [{ id: 'k1', label: textKey('columns.k1') }];
  const x = tb.input<number>({
    id: 'x',
    nameKey: 'x.name',
    explanationKey: 'x.explanation',
    input: 'values',
    rows,
    columns,
    values: [[3], [4]],
  });
  const pairs = tb.input<Pair>({
    id: 'pairs',
    nameKey: 'pairs.name',
    explanationKey: 'pairs.explanation',
    input: 'pairs',
    rows,
    columns,
    values: [[{ a: 1, b: -2.5 }], [{ a: 0.1, b: 1e-300 }]],
    encode: encodePair,
  });
  const formulas = [
    {
      id: 'benefit',
      template: '{{y}} = {{x}} / {{m}}',
      terms: [
        { name: 'y', latex: 'y' },
        { name: 'x', latex: 'x' },
        { name: 'm', latex: 'm' },
      ],
    },
    {
      id: 'cost',
      template: '{{y}} = {{m}} / {{x}}',
      terms: [
        { name: 'y', latex: 'y' },
        { name: 'x', latex: 'x' },
        { name: 'm', latex: 'm' },
      ],
    },
  ];
  const max = term(crisp.max(x.column(0)), 'm');
  const scaled = tb.table<number>({
    id: 'scaled',
    nameKey: 'scaled.name',
    explanationKey: 'scaled.explanation',
    explanationParams: { count: 2 },
    formulas,
    visualization: { view: 'bars', basedOn: 'x', highlightRows: ['r1'] },
    rows,
    columns,
    cell: (row) =>
      row.index === 0
        ? { tracked: crisp.divide(term(x.cell(0, 0), 'x'), max), formula: 'benefit' }
        : { tracked: crisp.divide(max, term(x.cell(1, 0), 'x')), formula: 'cost' },
  });
  tb.columnVector<number | null>({
    id: 'mixed',
    nameKey: 'mixed.name',
    explanationKey: 'mixed.explanation',
    role: 'result',
    items: [...rows, { id: 'r3', label: textKey('rows.r3') }, { id: 'r4', label: textKey('r4') }],
    cell: (item) => {
      switch (item.index) {
        case 0:
          return empty('reasons.first');
        case 1:
          return crisp.add(
            parameter('alpha', 0.5, 'alpha'),
            crisp.multiply(constant(2, 'two'), scaled.cell(1, 0)),
          );
        case 2:
          return crisp.rank(scaled.all(), { ties: 'competition' })[1]!;
        default:
          return empty();
      }
    },
  });
  tb.scalar<Pair>({
    id: 'pair-sum',
    nameKey: 'pair-sum.name',
    explanationKey: 'pair-sum.explanation',
    value: derive(
      'pair.sum',
      [term(pairs.column(0), 'p'), pairs.cell('r2', 'k1')],
      { a: 1.1, b: 0.5 },
      encodePair,
      { exact: true, label: 'sum', weight: 2 },
    ),
  });
  tb.input<string>({
    id: 'labels',
    nameKey: 'labels.name',
    explanationKey: 'labels.explanation',
    input: 'labels',
    rows: [{ id: 'only', label: textKey('only') }],
    columns: [
      { id: 'one', label: textKey('one') },
      { id: 'two', label: textKey('two') },
    ],
    values: [['first', 'second']],
    encode: (value) => value,
  });
  return tb.build();
}

describe('encodeTrace / decodeTrace', () => {
  it.each([
    ['the sample method', () => sampleTrace('max')],
    ['the sample method with sum normalization', () => sampleTrace('sum')],
    ['every node kind', everyKindTrace],
  ])('restores %s exactly, field order included', (_name, make) => {
    const trace = make();
    const restored = roundTrip(trace);
    expect(restored).toEqual(trace);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(trace));
    expect(verifyTrace(restored)).toEqual(verifyTrace(trace));
  });

  it('keeps -0 apart from 0', () => {
    // A crisp trace never holds -0, but a composite encoder may. JSON text loses it; the
    // project file writes it with encodeJson, so the codec itself must keep it.
    const tb = createTraceBuilder({ methodId: 'm', methodVersion: '1.0.0' });
    const zero = (b: number) => derive('pair.zero', [], { a: 0, b }, encodePair);
    tb.rowVector<Pair>({
      id: 'z',
      nameKey: 'n',
      explanationKey: 'e',
      items: [
        { id: 'p', label: textKey('p') },
        { id: 'm', label: textKey('m') },
      ],
      cell: (item) => zero(item.index === 0 ? 0 : -0),
    });
    const trace = tb.build();
    const encoded = encodeTrace(trace);
    expect(encoded.nodes).toHaveLength(2);
    const restored = decodeTrace(encoded);
    const b = (cell: number) =>
      (restored.steps[0]!.output.cells[0]![cell]!.value as { components: Record<string, number> })
        .components['b'];
    expect(Object.is(b(0), 0)).toBe(true);
    expect(Object.is(b(1), -0)).toBe(true);
  });

  it('writes each node once and restores shared nodes as one object', () => {
    const trace = everyKindTrace();
    const encoded = encodeTrace(trace);
    const keys = encoded.nodes.map((node) => JSON.stringify(node));
    expect(new Set(keys).size).toBe(keys.length);

    const restored = roundTrip(trace);
    const scaled = restored.steps.find((step) => step.id === 'scaled')!.output.cells;
    const operand = (row: number, index: number) =>
      (scaled[row]![0]!.derivation as OperationNode).operands[index];
    // The column maximum is one node, used by both cells.
    expect(operand(0, 1)).toBe(operand(1, 0));
    // A reference carries the value of the cell it points to.
    const x = restored.steps[0]!.output.cells;
    expect((operand(0, 0) as { value: TraceValue }).value).toBe(x[0]![0]!.value);
  });

  it('shares nodes that are equal but were separate objects', () => {
    const tb = createTraceBuilder({ methodId: 'm', methodVersion: '1.0.0' });
    const x = tb.input<number>({
      id: 'x',
      nameKey: 'n',
      explanationKey: 'e',
      input: 'x',
      rows: [{ id: 'r', label: textKey('r') }],
      columns: [
        { id: 'a', label: textKey('a') },
        { id: 'b', label: textKey('b') },
      ],
      values: [[1, 2]],
    });
    // `term` copies the node, so each cell holds its own copy of the same reference.
    tb.rowVector<number>({
      id: 'y',
      nameKey: 'n',
      explanationKey: 'e',
      items: x.columns,
      cell: (item) => crisp.add(term(x.cell(0, 'a'), 'first'), term(x.cell(0, item.id), 'x')),
    });
    const trace = tb.build();
    const encoded = encodeTrace(trace);
    const refs = encoded.nodes.filter((node) => node[0] === 1);
    expect(refs).toEqual([
      [1, 0, 0, 0, 4],
      [1, 0, 0, 0, 0],
      [1, 0, 0, 1, 0],
    ]);
    expect(encoded.strings).toEqual(['x', 'r', 'a', 'b', 'first', 'add']);
    expect(roundTrip(trace)).toEqual(trace);
  });

  it('writes ascending runs of a range as [first, last] and keeps any order', () => {
    const tb = createTraceBuilder({ methodId: 'm', methodVersion: '1.0.0' });
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const x = tb.input<number>({
      id: 'x',
      nameKey: 'n',
      explanationKey: 'e',
      input: 'x',
      rows: [{ id: 'r', label: textKey('r') }],
      columns: ids.map((id) => ({ id, label: textKey(id) })),
      values: [[1, 2, 3, 4, 5, 6]],
    });
    const twice = crisp.sum(x.range({ columns: ['a', 'b'] }));
    tb.scalar<number>({
      id: 's',
      nameKey: 'n',
      explanationKey: 'e',
      value: crisp.add(
        crisp.multiply(twice, twice),
        crisp.add(
          crisp.sum(x.range({ columns: ['a', 'b', 'c', 'e', 'f'] })),
          crisp.sum(x.range({ columns: ['f', 'e', 'd', 'b'] })),
        ),
      ),
    });
    const trace = tb.build();
    const encoded = encodeTrace(trace);
    expect(encoded.nodes.filter((node) => node[0] === 2).map((node) => node[3])).toEqual([
      [0, 1],
      [[0, 2], 4, 5],
      [5, 4, 3, 1],
    ]);
    expect(roundTrip(trace)).toEqual(trace);
  });

  it('keeps values that disagree with their source, so an audit still sees them', () => {
    const trace = deepClone(sampleTrace()) as Mutable<Trace>;
    const scores = trace.steps.find((step) => step.id === 'scores')!;
    scores.output.cells[0]![0]!.value = 0.9;
    const weighted = trace.steps.find((step) => step.id === 'weighted-matrix')!;
    const operation = weighted.output.cells[1]![1]!.derivation as Mutable<OperationNode>;
    (operation.operands[0] as { value: TraceValue }).value = 123;

    const restored = roundTrip(trace);
    expect(restored).toEqual(trace);
    expect(verifyTrace(restored)).toEqual(verifyTrace(trace as Trace));
    expect(verifyTrace(restored).map((problem) => problem.code)).toEqual(
      expect.arrayContaining(['value-mismatch', 'stale-reference']),
    );
  });

  it('is deterministic', () => {
    expect(JSON.stringify(encodeTrace(sampleTrace()))).toBe(
      JSON.stringify(encodeTrace(deepClone(sampleTrace()))),
    );
  });

  it('marks the stored form with the current format version', () => {
    expect(encodeTrace(sampleTrace()).formatVersion).toBe(TRACE_FORMAT_VERSION);
    expect(TRACE_FORMAT_VERSION).toBe(2);
  });
});

describe('encodeTrace refuses what it cannot store faithfully', () => {
  const refusal = (mutate: (trace: Mutable<Trace>) => void) => {
    const trace = deepClone(sampleTrace()) as Mutable<Trace>;
    mutate(trace);
    return () => encodeTrace(trace);
  };
  const derivation = (trace: Mutable<Trace>, step: number) =>
    trace.steps[step]!.output.cells[0]![0]!.derivation as Mutable<DerivationNode>;

  it('a field the format does not know', () => {
    expect(
      refusal((trace) => {
        (derivation(trace, 0) as Record<string, unknown>)['note'] = 'new field';
      }),
    ).toThrow(/field "note"/);
    expect(
      refusal((trace) => {
        (trace.steps[0]!.output.cells[0]![0] as Record<string, unknown>)['extra'] = 1;
      }),
    ).toThrow(/field "extra"/);
  });

  it('references to a later step or to a missing cell', () => {
    expect(
      refusal((trace) => {
        const node = derivation(trace, 2) as Mutable<OperationNode>;
        (node.operands[0] as { ref: { step: string } }).ref.step = 'scores';
      }),
    ).toThrow(/comes later/);
    expect(
      refusal((trace) => {
        const node = derivation(trace, 2) as Mutable<OperationNode>;
        (node.operands[0] as { ref: { row: string } }).ref.row = 'nobody';
      }),
    ).toThrow(/nobody/);
  });

  it('a formula the step does not have, and duplicate ids', () => {
    expect(
      refusal((trace) => {
        trace.steps[2]!.output.cells[0]![0]!.formula = 'missing';
      }),
    ).toThrow(/unknown formula/);
    expect(
      refusal((trace) => {
        trace.steps[1]!.id = trace.steps[0]!.id;
      }),
    ).toThrow(/Duplicate step/);
  });

  it('a derivation that contains itself', () => {
    const node: Mutable<OperationNode> = {
      kind: 'operation',
      operation: 'negate',
      operands: [],
      value: 1,
    };
    node.operands.push(node);
    expect(
      refusal((trace) => {
        trace.steps[0]!.output.cells[0]![0]!.derivation = node;
      }),
    ).toThrow(/contains itself/);
  });
});

describe('decodeTrace', () => {
  it('reads format 1, the plain JSON of the in-memory trace', () => {
    const trace = sampleTrace();
    const v1 = JSON.parse(JSON.stringify({ formatVersion: 1, ...trace })) as unknown;
    expect(decodeTrace(v1)).toEqual(trace);
  });

  it('refuses unknown versions and damaged data', () => {
    const good = JSON.parse(JSON.stringify(encodeTrace(everyKindTrace()))) as Mutable<EncodedTrace>;
    const damaged = (mutate: (encoded: Mutable<EncodedTrace>) => void) => () => {
      const copy = deepClone(good);
      mutate(copy);
      return decodeTrace(copy);
    };
    const cases: [string, () => unknown][] = [
      ['not an object', () => decodeTrace('trace')],
      ['unknown version', () => decodeTrace({ ...good, formatVersion: 3 })],
      [
        'v1 without steps',
        () => decodeTrace({ formatVersion: 1, methodId: 'm', methodVersion: '1' }),
      ],
      ['no method id', damaged((e) => void ((e as { methodId?: unknown }).methodId = 1))],
      ['bad strings', damaged((e) => void ((e as { strings: unknown }).strings = [1]))],
      ['bad shapes', damaged((e) => void ((e as { shapes: unknown }).shapes = [[]]))],
      ['no nodes', damaged((e) => void ((e as { nodes?: unknown }).nodes = undefined))],
      ['node not a list', damaged((e) => void ((e.nodes as unknown[])[0] = {}))],
      ['unknown kind', damaged((e) => void ((e.nodes as unknown[])[0] = [9, 1]))],
      ['unknown string', damaged((e) => void ((e.nodes as unknown[])[0] = [0, 1, 999]))],
      ['forward operand', damaged((e) => void ((e.nodes as unknown[])[0] = [5, 0, [5], 1]))],
      ['ref to an unread step', damaged((e) => void ((e.nodes as unknown[])[0] = [1, 0, 0, 0]))],
      ['bad composite', damaged((e) => void ((e.nodes as unknown[])[0] = [3, [0, 1]]))],
      ['non-finite value', damaged((e) => void ((e.nodes as unknown[])[0] = [3, Infinity]))],
      [
        'bad run',
        damaged((e) => {
          const range = e.nodes.findIndex((node) => node[0] === 2);
          (e.nodes as unknown[])[range] = [2, 0, [[1, 0]], 'all'];
        }),
      ],
      [
        'cell from a range',
        damaged((e) => {
          const range = e.nodes.findIndex((node) => node[0] === 2);
          const last = e.steps.length - 1;
          (e.steps[last]!.output.cells[0] as unknown[])[0] = range;
        }),
      ],
      ['bad options', damaged((e) => void ((e.nodes as unknown[])[0] = [5, 0, [], 1, null, [1]]))],
      [
        'cell without node',
        damaged((e) => void ((e.steps[0]!.output.cells[0] as unknown[])[0] = 'x')),
      ],
      ['missing node', damaged((e) => void ((e.steps[0]!.output.cells[0] as unknown[])[0] = 9999))],
      ['cells per row', damaged((e) => void (e.steps[0]!.output.cells[0] as unknown[]).push(0))],
      ['row count', damaged((e) => void (e.steps[0]!.output.cells as unknown[]).push([0]))],
      ['malformed step', damaged((e) => void ((e.steps as unknown[])[0] = { id: 'x' }))],
      [
        'unknown formula',
        damaged((e) => void ((e.steps[2]!.output.cells[0] as unknown[])[0] = [7, 9])),
      ],
    ];
    for (const [name, run] of cases) {
      expect(run, name).toThrow(EngineError);
    }
    // A string value is a string, not a name.
    expect(() => damaged((e) => void ((e.nodes as unknown[])[0] = [3, 'text']))()).not.toThrow();
  });
});
