import { describe, expect, it } from 'vitest';
import { EngineError } from '../errors';
import { CRISP_OPERATIONS, crisp } from './crisp-ops';
import { formulaProblems, formulaTermNames, renderFormula } from './formula';
import {
  constant,
  derive,
  empty,
  encodeCrisp,
  isTracked,
  isTrackedRange,
  parameter,
  term,
} from './tracked';
import type { TraceFormula, TraceValue } from './types';

const errorCode = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (error) {
    return error instanceof EngineError ? error.code : 'other';
  }
  return undefined;
};

describe('tracked primitives', () => {
  it('records constants, parameters and empty cells', () => {
    expect(constant(2)).toEqual({ value: 2, node: { kind: 'constant', value: 2 } });
    expect(constant(2, 'two').node).toEqual({ kind: 'constant', value: 2, term: 'two' });
    expect(parameter('lambda', 0.5).node).toEqual({
      kind: 'parameter',
      name: 'lambda',
      value: 0.5,
    });
    expect(parameter('lambda', 0.5, 'l').node.term).toBe('l');
    expect(empty()).toEqual({ value: null, node: { kind: 'empty', value: null } });
    expect(empty('swara.first').node).toEqual({
      kind: 'empty',
      value: null,
      reasonKey: 'swara.first',
    });
  });

  it('supports other number types through an encoder', () => {
    type Pair = readonly [number, number];
    const encode = ([a, b]: Pair): TraceValue => ({ type: 'pair', components: { a, b } });
    const one = constant<Pair>([1, 2], 'p', encode);
    expect(one.node).toEqual({
      kind: 'constant',
      value: { type: 'pair', components: { a: 1, b: 2 } },
      term: 'p',
    });
    const added = derive('pair.add', [one, one], [2, 4] as Pair, encode);
    expect(added.value).toEqual([2, 4]);
    expect(added.node).toMatchObject({
      kind: 'operation',
      operation: 'pair.add',
      value: { type: 'pair', components: { a: 2, b: 4 } },
    });
  });

  it('never lets a non-finite number into a trace', () => {
    expect(errorCode(() => encodeCrisp(Number.NaN))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => constant(Number.POSITIVE_INFINITY))).toBe('NON_FINITE_VALUE');
    expect(errorCode(() => encodeCrisp('1' as unknown as number))).toBe('NON_FINITE_VALUE');
  });

  it('stores negative zero as zero so traces survive JSON', () => {
    expect(Object.is(encodeCrisp(-0), 0)).toBe(true);
  });

  it('names terms without changing the original', () => {
    const x = constant(3);
    const named = term(x, 'x');
    expect(named.node.term).toBe('x');
    expect(x.node.term).toBeUndefined();
    expect(isTracked(named)).toBe(true);
    expect(isTracked(3)).toBe(false);
    expect(isTrackedRange(named)).toBe(false);
  });

  it('rethrows errors of an encoder that are not about finiteness', () => {
    const boom = () => {
      throw new Error('boom');
    };
    expect(() => derive('x', [], 1, boom)).toThrow('boom');
  });
});

describe('crisp operations', () => {
  it('computes hand-checked values', () => {
    expect(crisp.add(2, 3).value).toBe(5);
    expect(crisp.subtract(2, 3).value).toBe(-1);
    expect(crisp.multiply(2, 3).value).toBe(6);
    expect(crisp.divide(3, 4).value).toBe(0.75);
    expect(crisp.power(2, 10).value).toBe(1024);
    expect(crisp.negate(2).value).toBe(-2);
    expect(crisp.abs(-2.5).value).toBe(2.5);
    expect(crisp.sqrt(81).value).toBe(9);
    expect(crisp.ln(1).value).toBe(0);
    expect(crisp.exp(0).value).toBe(1);
    expect(crisp.sum([1, 2, 3]).value).toBe(6);
    expect(crisp.product([2, 3, 4]).value).toBe(24);
    expect(crisp.sumOfSquares([3, 4]).value).toBe(25);
    expect(crisp.sumOfReciprocals([2, 4]).value).toBe(0.75);
    expect(crisp.mean([2, 4, 9]).value).toBe(5);
    expect(crisp.min([3, 1, 2]).value).toBe(1);
    expect(crisp.max([3, 1, 2]).value).toBe(3);
    expect(crisp.weightedSum([10, 20], [0.25, 0.75]).value).toBe(17.5);
  });

  it('records the operation and its operands', () => {
    const x = term(constant(6), 'x');
    const result = crisp.divide(x, 4);
    expect(result.node).toEqual({
      kind: 'operation',
      operation: 'divide',
      operands: [
        { kind: 'constant', value: 6, term: 'x' },
        { kind: 'constant', value: 4 },
      ],
      value: 1.5,
    });
  });

  it('records a weighted sum as a sum of products', () => {
    const node = crisp.weightedSum([1, 2], [3, 4]).node;
    expect(node).toMatchObject({ kind: 'operation', operation: 'sum', value: 11 });
    expect(
      node.kind === 'operation' && node.operands.map((o) => o.kind === 'operation' && o.operation),
    ).toEqual(['multiply', 'multiply']);
  });

  it('ranks tracked scores and records the tie rule', () => {
    const ranks = crisp.rank([7, 9, 5, 7]);
    expect(ranks.map((rank) => rank.value)).toEqual([2, 1, 4, 2]);
    expect(ranks[3]?.node).toMatchObject({
      kind: 'operation',
      operation: 'rank',
      options: { order: 'descending', ties: 'competition', tolerance: 1e-12, index: 3 },
    });
    expect(
      crisp.rank([7, 9, 5, 7], { order: 'ascending', ties: 'dense' }).map((r) => r.value),
    ).toEqual([2, 3, 1, 2]);
  });

  it('throws a located error instead of producing a non-finite value', () => {
    for (const fn of [
      () => crisp.divide(1, 0),
      () => crisp.divide(0, 0),
      () => crisp.ln(0),
      () => crisp.ln(-1),
      () => crisp.sqrt(-4),
      () => crisp.power(-8, 1 / 3),
      () => crisp.sumOfReciprocals([1, 0]),
    ]) {
      expect(errorCode(fn)).toBe('NON_FINITE_VALUE');
    }
    try {
      crisp.divide(1, 0);
    } catch (error) {
      expect((error as EngineError).details).toMatchObject({
        operation: 'divide',
        operands: [1, 0],
      });
      expect((error as EngineError).message).toContain('divide');
    }
  });

  it('rejects aggregates without operands and mismatched weighted sums', () => {
    expect(errorCode(() => crisp.sum([]))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => crisp.max([]))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => crisp.weightedSum([1, 2], [1]))).toBe('INVALID_ARGUMENT');
    expect(errorCode(() => crisp.weightedSum([], []))).toBe('INVALID_ARGUMENT');
  });

  it('exposes one evaluator per recorded operation id', () => {
    expect(Object.keys(CRISP_OPERATIONS).sort()).toEqual(
      [
        'abs',
        'add',
        'divide',
        'exp',
        'ln',
        'max',
        'mean',
        'min',
        'multiply',
        'negate',
        'power',
        'product',
        'rank',
        'sqrt',
        'subtract',
        'sum',
        'sum-of-reciprocals',
        'sum-of-squares',
      ].sort(),
    );
  });
});

describe('formulas', () => {
  const formula: TraceFormula = {
    id: 'f',
    template: String.raw`{{n}} = \frac{ {{ x }} }{ {{x_max}} } + {{x}}`,
    terms: [
      { name: 'n', latex: 'n_{ij}' },
      { name: 'x', latex: 'x_{ij}' },
      { name: 'x_max', latex: String.raw`\max_i x_{ij}` },
    ],
  };

  it('lists placeholder names once, in order', () => {
    expect(formulaTermNames(formula.template)).toEqual(['n', 'x', 'x_max']);
  });

  it('renders plain LaTeX', () => {
    expect(renderFormula(formula)).toBe(
      String.raw`n_{ij} = \frac{ x_{ij} }{ \max_i x_{ij} } + x_{ij}`,
    );
  });

  it('lets the caller wrap or substitute terms', () => {
    const values: Record<string, string> = { n: '0.5', x: '10', x_max: '20' };
    expect(renderFormula(formula, { term: (t) => values[t.name] ?? t.latex })).toBe(
      String.raw`0.5 = \frac{ 10 }{ 20 } + 10`,
    );
    expect(
      renderFormula(formula, { term: (t) => `\\htmlClass{t-${t.name}}{${t.latex}}` }),
    ).toContain(String.raw`\htmlClass{t-x_max}{\max_i x_{ij}}`);
  });

  it('reports undefined placeholders and duplicate terms', () => {
    const broken: TraceFormula = {
      id: 'b',
      template: '{{a}} + {{b}}',
      terms: [
        { name: 'a', latex: 'a' },
        { name: 'a', latex: 'a' },
      ],
    };
    expect(formulaProblems(formula)).toEqual([]);
    expect(formulaProblems(broken)).toEqual([
      'term "a" is defined twice',
      'placeholder "{{b}}" has no term definition',
    ]);
    expect(errorCode(() => renderFormula(broken))).toBe('INVALID_TRACE');
  });
});
