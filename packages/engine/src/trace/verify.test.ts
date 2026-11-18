import { describe, expect, it } from 'vitest';
import { sampleInput } from '../__fixtures__/sample';
import { weightedSumMethod } from '../__fixtures__/weighted-sum';
import { deepClone } from '../determinism/canonical';
import { EngineError } from '../errors';
import { createTraceBuilder } from './builder';
import { crisp } from './crisp-ops';
import {
  expandRange,
  findCell,
  findStep,
  getStep,
  resolveCell,
  resolveRange,
  termOperands,
  traceValuesEqual,
  walkDerivation,
} from './inspect';
import { constant, derive } from './tracked';
import type { OperationNode, Trace, TraceValue } from './types';
import type { OperationEvaluator } from './verify';
import { CRISP_EVALUATORS, assertValidTrace, verifyTrace } from './verify';

type Mutable<T> = T extends string | number | boolean | null | undefined
  ? T
  : { -readonly [K in keyof T]: Mutable<T[K]> };

const freshTrace = (): Mutable<Trace> =>
  deepClone(
    weightedSumMethod.run(sampleInput(), { normalization: 'max' }, {}).trace,
  ) as Mutable<Trace>;

const problemCodes = (trace: Trace, options = {}) =>
  verifyTrace(trace, options).map((problem) => problem.code);

const step = (trace: Mutable<Trace>, id: string) => {
  const found = trace.steps.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no step ${id}`);
  return found;
};

describe('trace inspection', () => {
  const trace = freshTrace() as Trace;

  it('finds steps and cells', () => {
    expect(findStep(trace, 'scores')?.index).toBe(4);
    expect(findStep(trace, 'nope')).toBeUndefined();
    expect(getStep(trace, 'weights').output.shape).toBe('row-vector');
    expect(() => getStep(trace, 'nope')).toThrow(EngineError);

    expect(resolveCell(trace, { step: 'initial-matrix', row: 'a2', column: 'c1' }).value).toBe(20);
    expect(findCell(trace, { step: 'initial-matrix', row: 'zz', column: 'c1' })).toBeUndefined();
    expect(findCell(trace, { step: 'initial-matrix', row: 'a1', column: 'zz' })).toBeUndefined();
    expect(findCell(trace, { step: 'zz', row: 'a1', column: 'c1' })).toBeUndefined();
    expect(() => resolveCell(trace, { step: 'zz', row: 'a1', column: 'c1' })).toThrow(EngineError);
  });

  it('expands and resolves ranges in row-major order', () => {
    expect(
      expandRange(trace, { step: 'initial-matrix', rows: ['a3', 'a1'], columns: 'all' }),
    ).toEqual([
      { step: 'initial-matrix', row: 'a3', column: 'c1' },
      { step: 'initial-matrix', row: 'a3', column: 'c2' },
      { step: 'initial-matrix', row: 'a1', column: 'c1' },
      { step: 'initial-matrix', row: 'a1', column: 'c2' },
    ]);
    expect(
      resolveRange(trace, { step: 'initial-matrix', rows: 'all', columns: ['c2'] }).map(
        (cell) => cell.value,
      ),
    ).toEqual([4, 2, 8]);
    expect(() =>
      resolveRange(trace, { step: 'initial-matrix', rows: ['zz'], columns: 'all' }),
    ).toThrow(EngineError);
  });

  it('walks a derivation tree and groups operands by formula term', () => {
    const cell = resolveCell(trace, { step: 'normalized-matrix', row: 'a1', column: 'c2' });
    const kinds: string[] = [];
    walkDerivation(cell.derivation, (node) => kinds.push(node.kind));
    expect(kinds).toEqual(['operation', 'operation', 'range', 'ref']);

    const terms = termOperands(cell.derivation);
    expect([...terms.keys()].sort()).toEqual(['x', 'x_min']);
    expect(terms.get('x')).toEqual([
      {
        kind: 'ref',
        ref: { step: 'initial-matrix', row: 'a1', column: 'c2' },
        value: 4,
        term: 'x',
      },
    ]);
    const doubled = termOperands(crisp.add(constant(1, 'k'), constant(2, 'k')).node);
    expect(doubled.get('k')).toHaveLength(2);
  });

  it('compares trace values structurally', () => {
    const tfn = (l: number, m: number, u: number): TraceValue => ({
      type: 'tfn',
      components: { l, m, u },
    });
    expect(traceValuesEqual(1, 1)).toBe(true);
    expect(traceValuesEqual(0, -0)).toBe(true);
    expect(traceValuesEqual(1, '1')).toBe(false);
    expect(traceValuesEqual(null, null)).toBe(true);
    expect(traceValuesEqual(null, 0)).toBe(false);
    expect(traceValuesEqual(tfn(1, 2, 3), tfn(1, 2, 3))).toBe(true);
    expect(traceValuesEqual(tfn(1, 2, 3), tfn(1, 2, 4))).toBe(false);
    expect(traceValuesEqual(tfn(1, 2, 3), 2)).toBe(false);
    expect(
      traceValuesEqual(tfn(1, 2, 3), { type: 'other', components: { l: 1, m: 2, u: 3 } }),
    ).toBe(false);
    expect(traceValuesEqual(tfn(1, 2, 3), { type: 'tfn', components: { l: 1, m: 2 } })).toBe(false);
    expect(traceValuesEqual({ type: 'tfn', components: { l: 1, m: 2, x: 3 } }, tfn(1, 2, 3))).toBe(
      false,
    );
  });
});

describe('verifyTrace', () => {
  it('accepts a trace produced by the builder, before and after a JSON round trip', () => {
    const trace = weightedSumMethod.run(sampleInput(), { normalization: 'sum' }, {}).trace;
    expect(verifyTrace(trace, { requireKnownOperations: true })).toEqual([]);
    const restored = JSON.parse(JSON.stringify(trace)) as Trace;
    expect(restored).toEqual(trace);
    expect(verifyTrace(restored, { requireKnownOperations: true })).toEqual([]);
    expect(() => assertValidTrace(restored)).not.toThrow();
  });

  it('detects a tampered result value', () => {
    const trace = freshTrace();
    step(trace, 'scores').output.cells[0]![0]!.value = 0.9;
    expect(problemCodes(trace)).toContain('value-mismatch');
    // The ranking still references the old score.
    expect(verifyTrace(trace).find((p) => p.code === 'stale-reference')).toMatchObject({
      step: 'ranking',
      row: 'a1',
    });
  });

  it('detects arithmetic that does not add up', () => {
    const trace = freshTrace();
    const cell = step(trace, 'weighted-matrix').output.cells[0]![0]!;
    cell.value = 0.31;
    (cell.derivation as Mutable<OperationNode>).value = 0.31;
    const problems = verifyTrace(trace);
    expect(problems.map((p) => p.code)).toContain('operation-mismatch');
    expect(problems.find((p) => p.code === 'operation-mismatch')).toMatchObject({
      step: 'weighted-matrix',
      row: 'a1',
      column: 'c1',
    });
  });

  it('detects a tampered input that later steps depend on', () => {
    const trace = freshTrace();
    const cell = step(trace, 'initial-matrix').output.cells[1]![0]!;
    cell.value = 21;
    (cell.derivation as { value: TraceValue }).value = 21;
    const codes = problemCodes(trace);
    expect(codes).toContain('stale-reference');
    expect(codes).toContain('operation-mismatch');
  });

  it('detects structural damage', () => {
    let trace = freshTrace();
    step(trace, 'weights').id = 'initial-matrix';
    expect(problemCodes(trace)).toContain('duplicate-step');

    trace = freshTrace();
    trace.steps[2]!.index = 7;
    expect(problemCodes(trace)).toEqual(['step-index']);

    trace = freshTrace();
    step(trace, 'scores').output.cells.pop();
    expect(problemCodes(trace)).toContain('table-shape');

    trace = freshTrace();
    step(trace, 'scores').output.shape = 'row-vector';
    expect(problemCodes(trace)).toContain('table-shape');

    trace = freshTrace();
    step(trace, 'initial-matrix').output.rows[1]!.id = 'a1';
    expect(problemCodes(trace)).toContain('duplicate-axis-id');

    trace = freshTrace();
    delete (step(trace, 'scores').output.cells[0]![0] as { derivation?: unknown }).derivation;
    expect(problemCodes(trace)).toContain('missing-derivation');

    trace = freshTrace();
    (step(trace, 'scores').output.cells[0]![0] as { derivation: unknown }).derivation = {
      kind: 'range',
      ref: { step: 'weighted-matrix', rows: 'all', columns: 'all' },
    };
    expect(problemCodes(trace)).toContain('missing-derivation');
  });

  it('detects broken references', () => {
    let trace = freshTrace();
    const first = () =>
      (step(trace, 'weighted-matrix').output.cells[0]![0]!.derivation as Mutable<OperationNode>)
        .operands[0] as { ref: { step: string; row: string } };
    first().ref.step = 'nowhere';
    expect(problemCodes(trace)).toContain('unknown-reference');

    trace = freshTrace();
    first().ref.row = 'nobody';
    expect(problemCodes(trace)).toContain('unknown-reference');

    trace = freshTrace();
    first().ref.step = 'ranking';
    expect(problemCodes(trace)).toContain('forward-reference');

    trace = freshTrace();
    first().ref.step = 'weighted-matrix';
    expect(problemCodes(trace)).toContain('forward-reference');

    trace = freshTrace();
    step(trace, 'weighted-matrix').sources = [];
    expect(problemCodes(trace)).toContain('missing-source');

    trace = freshTrace();
    const sum = step(trace, 'scores').output.cells[0]![0]!.derivation as Mutable<OperationNode>;
    (sum.operands[0] as { ref: { rows: string[] } }).ref.rows = ['ghost'];
    expect(problemCodes(trace)).toContain('unknown-reference');
  });

  it('detects formula problems', () => {
    let trace = freshTrace();
    step(trace, 'normalized-matrix').output.cells[0]![0]!.formula = 'nope';
    expect(problemCodes(trace)).toEqual(['unknown-formula']);

    trace = freshTrace();
    step(trace, 'weighted-matrix').formulas[0]!.terms.pop();
    expect(problemCodes(trace)).toContain('invalid-formula');
    expect(problemCodes(trace)).toContain('unknown-term');
  });

  it('detects non-finite values and wrong operands', () => {
    let trace = freshTrace();
    const cell = () => step(trace, 'weighted-matrix').output.cells[0]![0]!;
    const node = () => cell().derivation as Mutable<OperationNode>;
    (node().operands[0] as { value: TraceValue }).value = Number.POSITIVE_INFINITY;
    expect(problemCodes(trace)).toContain('non-finite-value');

    trace = freshTrace();
    (node().operands[0] as { value: TraceValue }).value = {
      type: 'tfn',
      components: { l: Number.NaN },
    };
    expect(problemCodes(trace)).toEqual(
      expect.arrayContaining(['non-finite-value', 'operation-operand']),
    );

    trace = freshTrace();
    node().operands.pop();
    expect(problemCodes(trace)).toContain('operation-arity');

    trace = freshTrace();
    (node().operands[0] as { value: TraceValue }).value = 'half';
    expect(problemCodes(trace)).toContain('operation-operand');
  });

  it('skips unknown operations unless asked, and accepts extra evaluators', () => {
    const tb = createTraceBuilder({ methodId: 'm', methodVersion: '1.0.0' });
    const encode = (v: number): TraceValue => v;
    tb.scalar({
      id: 's',
      nameKey: 'n',
      explanationKey: 'e',
      value: derive('custom.double', [constant(4)], 8, encode),
    });
    const trace = tb.build();
    expect(verifyTrace(trace)).toEqual([]);
    expect(problemCodes(trace, { requireKnownOperations: true })).toEqual(['unknown-operation']);

    const double: OperationEvaluator = (args) => ({ value: (args[0] as number) * 2 });
    const wrong: OperationEvaluator = (args) => ({ value: (args[0] as number) * 3 });
    expect(
      verifyTrace(trace, { operations: { 'custom.double': double }, requireKnownOperations: true }),
    ).toEqual([]);
    expect(problemCodes(trace, { operations: { 'custom.double': wrong } })).toEqual([
      'operation-mismatch',
    ]);
    // An extra evaluator cannot replace a crisp one.
    expect(verifyTrace(freshTrace(), { operations: { multiply: wrong } })).toEqual([]);
  });

  it('does not mistake inherited object members for operations', () => {
    const tb = createTraceBuilder({ methodId: 'm', methodVersion: '1.0.0' });
    tb.scalar({
      id: 's',
      nameKey: 'n',
      explanationKey: 'e',
      value: derive('toString', [], 1, (v) => v),
    });
    expect(verifyTrace(tb.build())).toEqual([]);
  });

  it('normalizes negative zero like the encoder does', () => {
    const tb = createTraceBuilder({ methodId: 'm', methodVersion: '1.0.0' });
    tb.scalar({ id: 's', nameKey: 'n', explanationKey: 'e', value: crisp.multiply(-1, 0) });
    const trace = tb.build();
    expect(verifyTrace(trace)).toEqual([]);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
  });

  it('exposes an evaluator for every crisp operation', () => {
    expect(CRISP_EVALUATORS['add']?.([1, 2], {})).toEqual({ value: 3 });
    expect(
      CRISP_EVALUATORS['rank']?.([7, 7, 9, 5], { index: 0, ties: 'competition', tolerance: 0 }),
    ).toEqual({ value: 2 });
    expect(
      CRISP_EVALUATORS['rank']?.([7, 7, 9, 5], {
        index: 0,
        order: 'ascending',
        ties: 'competition',
        tolerance: 0,
      }),
    ).toEqual({ value: 2 });
  });

  it('assertValidTrace lists the problems', () => {
    const trace = freshTrace();
    step(trace, 'scores').output.cells[0]![0]!.value = 0.9;
    try {
      assertValidTrace(trace);
      expect.unreachable();
    } catch (error) {
      expect((error as EngineError).code).toBe('INVALID_TRACE');
      expect((error as EngineError).message).toContain('value-mismatch');
      expect((error as EngineError).details['problems']).toHaveLength(2);
    }
  });
});
