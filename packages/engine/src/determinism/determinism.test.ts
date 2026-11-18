import { describe, expect, it } from 'vitest';
import { sampleInput } from '../__fixtures__/sample';
import type { WeightedSumInput } from '../__fixtures__/weighted-sum';
import { weightedSumMethod } from '../__fixtures__/weighted-sum';
import { EngineError } from '../errors';
import { defineMethod } from '../method/method';
import { runMethod } from '../method/run';
import { canonicalJson, deepClone, deepFreeze } from './canonical';
import { assertDeterministic } from './guard';

describe('canonicalJson', () => {
  it('ignores key order and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: [2, 1] })).toBe('{"a":[2,1],"b":1}');
    expect(canonicalJson({ a: [2, 1], b: 1 })).toBe(canonicalJson({ b: 1, a: [2, 1] }));
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });

  it('distinguishes what JSON conflates', () => {
    expect(canonicalJson(-0)).toBe('-0');
    expect(canonicalJson(0)).toBe('0');
    expect(canonicalJson(Number.NaN)).toBe('NaN');
    expect(canonicalJson(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
    expect(canonicalJson([undefined, null])).toBe('[undefined,null]');
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
    expect(canonicalJson('1')).not.toBe(canonicalJson(1));
    expect(canonicalJson(true)).toBe('true');
  });

  it('keeps full double precision', () => {
    expect(canonicalJson(0.1 + 0.2)).toBe('0.30000000000000004');
    expect(canonicalJson(0.1 + 0.2)).not.toBe(canonicalJson(0.3));
  });

  it('allows shared references but rejects cycles and functions', () => {
    const shared = { x: 1 };
    expect(canonicalJson([shared, shared])).toBe('[{"x":1},{"x":1}]');
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow(EngineError);
    expect(() => canonicalJson({ f: () => 1 })).toThrow(EngineError);
  });
});

describe('deepFreeze and deepClone', () => {
  it('freezes nested data', () => {
    const data = deepFreeze({ list: [{ n: 1 }], text: 'x' });
    expect(Object.isFrozen(data.list[0])).toBe(true);
    expect(() => {
      (data.list[0] as { n: number }).n = 2;
    }).toThrow(TypeError);
    expect(deepFreeze(5)).toBe(5);
    expect(deepFreeze(null)).toBeNull();
  });

  it('clones without sharing structure', () => {
    const original = { list: [{ n: 1 }], nothing: null, text: 'x' };
    const copy = deepClone(original);
    expect(copy).toEqual(original);
    expect(copy.list).not.toBe(original.list);
    expect(copy.list[0]).not.toBe(original.list[0]);
  });
});

describe('determinism guard', () => {
  it('passes for the toy method and returns the first record', () => {
    const record = assertDeterministic(weightedSumMethod, sampleInput(), { normalization: 'sum' });
    expect(record.parameters).toEqual({ normalization: 'sum' });
    expect(record.result.ranking.map((item) => item.rank)).toEqual([2, 1, 3]);
    expect(() =>
      assertDeterministic(weightedSumMethod, sampleInput(), undefined, { runs: 5 }),
    ).not.toThrow();
    expect(() =>
      assertDeterministic(weightedSumMethod, sampleInput(), {}, { runs: 0 }),
    ).not.toThrow();
  });

  it('produces records with identical canonical form on repeated runs', () => {
    const first = canonicalJson(runMethod(weightedSumMethod, sampleInput()));
    const second = canonicalJson(runMethod(weightedSumMethod, sampleInput()));
    expect(second).toBe(first);
  });

  it('does not let a run mutate the caller input', () => {
    const input = sampleInput();
    const before = canonicalJson(input);
    assertDeterministic(weightedSumMethod, input);
    expect(canonicalJson(input)).toBe(before);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it('catches a method whose result changes between runs', () => {
    let calls = 0;
    const drifting = defineMethod({
      ...weightedSumMethod,
      run(input: WeightedSumInput, params, context) {
        calls += 1;
        const run = weightedSumMethod.run(input, params, context);
        return calls < 3 ? run : { ...run, result: { ...run.result, scores: [0, 0, 0] } };
      },
    });
    try {
      assertDeterministic(drifting, sampleInput());
      expect.unreachable();
    } catch (error) {
      expect((error as EngineError).code).toBe('NON_DETERMINISTIC');
      expect((error as EngineError).details).toMatchObject({ methodId: 'weighted-sum', run: 3 });
      expect((error as EngineError).message).toContain('run 3 differs from run 1');
    }
  });

  it('catches a method that only differs in its trace', () => {
    let calls = 0;
    const drifting = defineMethod({
      ...weightedSumMethod,
      run(input: WeightedSumInput, params, context) {
        calls += 1;
        const run = weightedSumMethod.run(input, params, context);
        const steps = calls === 2 ? run.trace.steps.slice(0, -1) : run.trace.steps;
        return { ...run, trace: { ...run.trace, steps } };
      },
    });
    expect(() => assertDeterministic(drifting, sampleInput())).toThrow(
      expect.objectContaining({ code: 'NON_DETERMINISTIC' }) as Error,
    );
  });

  it('catches a method that mutates its input', () => {
    const mutating = defineMethod({
      ...weightedSumMethod,
      run(input: WeightedSumInput, params, context) {
        (input.matrix.values[0] as number[])[0] = 1;
        return weightedSumMethod.run(input, params, context);
      },
    });
    expect(() => assertDeterministic(mutating, sampleInput())).toThrow(TypeError);
  });
});
