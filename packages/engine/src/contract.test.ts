/**
 * End-to-end tests of the engine contract through the toy weighted-sum method: the
 * "Done when" criteria of sub-phase P1.2.
 */
import { describe, expect, it } from 'vitest';
import { sampleInput, sampleMatrix } from './__fixtures__/sample';
import type { WeightedSumInput } from './__fixtures__/weighted-sum';
import { weightedSumMethod } from './__fixtures__/weighted-sum';
import * as engine from './index';
import {
  ENGINE_MESSAGES,
  ISSUE_CODES,
  assertDeterministic,
  crispWeights,
  findCell,
  formulaTermNames,
  messageKeyForCode,
  renderFormula,
  resolveCell,
  runMethod,
  termOperands,
  validateMethodRun,
  verifyTrace,
  walkDerivation,
} from './index';
import type { Trace, TraceCell } from './index';

const run = (input: WeightedSumInput = sampleInput(), normalization: 'max' | 'sum' = 'max') =>
  runMethod(weightedSumMethod, input, { normalization });

const allCells = (trace: Trace): { step: string; row: string; column: string; cell: TraceCell }[] =>
  trace.steps.flatMap((step) =>
    step.output.rows.flatMap((row, r) =>
      step.output.columns.map((column, c) => ({
        step: step.id,
        row: row.id,
        column: column.id,
        cell: step.output.cells[r]?.[c] as TraceCell,
      })),
    ),
  );

describe('toy weighted-sum method', () => {
  it('reproduces the hand-calculated example', () => {
    const { result, trace } = run();
    expect(result.scores[0]).toBeCloseTo(0.5, 12);
    expect(result.scores[1]).toBeCloseTo(1, 12);
    expect(result.scores[2]).toBeCloseTo(0.25, 12);
    expect(result.ranking).toEqual([
      { alternativeId: 'a1', score: result.scores[0], rank: 2 },
      { alternativeId: 'a2', score: result.scores[1], rank: 1 },
      { alternativeId: 'a3', score: result.scores[2], rank: 3 },
    ]);
    expect(trace.steps.map((step) => step.id)).toEqual([
      'initial-matrix',
      'weights',
      'normalized-matrix',
      'weighted-matrix',
      'scores',
      'ranking',
    ]);
    const value = (step: string, row: string, column: string) =>
      resolveCell(trace, { step, row, column }).value;
    expect(value('normalized-matrix', 'a1', 'c1')).toBe(0.5);
    expect(value('normalized-matrix', 'a3', 'c2')).toBe(0.25);
    expect(value('weighted-matrix', 'a2', 'c1')).toBe(0.6);
    expect(value('weighted-matrix', 'a2', 'c2')).toBe(0.4);
    expect(value('ranking', 'a2', 'ranking')).toBe(1);
  });

  it('supports its other normalization parameter', () => {
    const { result } = run(sampleInput(), 'sum');
    expect(result.scores[0]).toBeCloseTo(0.6 * (10 / 35) + 0.4 * (0.25 / 0.875), 12);
    expect(result.ranking.map((item) => item.rank)).toEqual([2, 1, 3]);
  });

  it('shares ranks between tied alternatives', () => {
    const input = sampleInput();
    const tied = run({
      ...input,
      matrix: {
        ...input.matrix,
        values: [
          [10, 4],
          [10, 4],
          [5, 8],
        ],
      },
    });
    expect(tied.result.ranking.map((item) => item.rank)).toEqual([1, 1, 3]);
  });
});

describe('P1.2: every output cell has a derivation', () => {
  const { trace, result } = run();
  const cells = allCells(trace);

  it('has a derivation carrying the cell value for each of the cells of every step', () => {
    expect(cells).toHaveLength(6 + 2 + 6 + 6 + 3 + 3);
    for (const { cell } of cells) {
      expect(cell.derivation).toBeDefined();
      expect(cell.derivation.value).toBe(cell.value);
      expect(Number.isFinite(cell.value)).toBe(true);
    }
  });

  it('derives input steps from method inputs and everything else from operations on earlier cells', () => {
    const order = new Map(trace.steps.map((step) => [step.id, step.index]));
    for (const { step, cell } of cells) {
      const role = trace.steps[order.get(step) as number]?.role;
      if (role === 'input') {
        expect(cell.derivation.kind).toBe('input');
        continue;
      }
      expect(cell.derivation.kind).toBe('operation');
      let references = 0;
      walkDerivation(cell.derivation, (node) => {
        if (node.kind !== 'ref' && node.kind !== 'range') return;
        references += 1;
        expect(order.get(node.ref.step)).toBeLessThan(order.get(step) as number);
        if (node.kind === 'ref') expect(findCell(trace, node.ref)?.value).toBe(node.value);
      });
      expect(references).toBeGreaterThan(0);
    }
  });

  it('can be followed from a final score back to the method inputs', () => {
    const reached = new Set<string>();
    const follow = (cell: TraceCell): void => {
      walkDerivation(cell.derivation, (node) => {
        if (node.kind === 'input') {
          reached.add(`${node.source.input}:${node.source.row}:${node.source.column}`);
        } else if (node.kind === 'ref') {
          follow(resolveCell(trace, node.ref));
        } else if (node.kind === 'range') {
          engine.resolveRange(trace, node.ref).forEach(follow);
        }
      });
    };
    follow(resolveCell(trace, { step: 'scores', row: 'a1', column: 'scores' }));
    // The score of a1 depends on its own cells, on both whole columns (max / min) and on both weights.
    expect([...reached].sort()).toEqual([
      'matrix:a1:c1',
      'matrix:a1:c2',
      'matrix:a2:c1',
      'matrix:a2:c2',
      'matrix:a3:c1',
      'matrix:a3:c2',
      'weights:w:c1',
      'weights:w:c2',
    ]);
  });

  it('agrees with the result object', () => {
    result.ranking.forEach((item) => {
      expect(
        resolveCell(trace, { step: 'scores', row: item.alternativeId, column: 'scores' }).value,
      ).toBe(item.score);
      expect(
        resolveCell(trace, { step: 'ranking', row: item.alternativeId, column: 'ranking' }).value,
      ).toBe(item.rank);
    });
  });

  it('passes the trace audit, which recomputes every operation', () => {
    expect(verifyTrace(trace, { requireKnownOperations: true })).toEqual([]);
    expect(verifyTrace(run(sampleInput(), 'sum').trace, { requireKnownOperations: true })).toEqual(
      [],
    );
  });

  it('links formula terms to the cells behind them', () => {
    const step = engine.getStep(trace, 'normalized-matrix');
    expect(step.formulas.map((formula) => formula.id)).toEqual(['benefit', 'cost']);
    expect(renderFormula(step.formulas[1] as engine.TraceFormula)).toBe(
      String.raw`n_{ij} = \frac{ \min_i x_{ij} }{ x_{ij} }`,
    );
    for (const { cell, column } of cells.filter((entry) => entry.step === 'normalized-matrix')) {
      const formula = step.formulas.find((candidate) => candidate.id === cell.formula);
      expect(formula?.id).toBe(column === 'c1' ? 'benefit' : 'cost');
      const used = [...termOperands(cell.derivation).keys()];
      expect(used.length).toBeGreaterThan(0);
      for (const name of used) expect(formulaTermNames(formula?.template ?? '')).toContain(name);
    }
    expect(step.visualization).toEqual({ view: 'matrix', basedOn: 'initial-matrix' });
    expect(step.explanationParams).toEqual({ variant: 'max' });
    expect(step.sources).toEqual([{ kind: 'step', step: 'initial-matrix' }]);
  });

  it('is plain JSON', () => {
    const record = run();
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });
});

describe('P1.2: validation distinguishes errors from warnings with stable codes', () => {
  it('blocks the run on errors and reports all of them with locations', () => {
    const input = sampleInput();
    const validation = validateMethodRun(weightedSumMethod, {
      ...input,
      matrix: {
        ...input.matrix,
        values: [
          [10, null as unknown as number],
          [-20, 2],
          [5, 8],
        ],
      },
    });
    expect(validation.ok).toBe(false);
    expect(
      validation.errors.map((issue) => [
        issue.code,
        issue.location?.row?.id,
        issue.location?.column?.id,
      ]),
    ).toEqual([
      ['matrix.missing-value', 'a1', 'c2'],
      ['matrix.non-positive-value', 'a2', 'c1'],
    ]);
    expect(validation.errors.every((issue) => issue.severity === 'error')).toBe(true);
  });

  it('lets the run proceed on warnings and records them', () => {
    const input = sampleInput();
    const withWarnings: WeightedSumInput = {
      matrix: {
        ...input.matrix,
        values: [
          [10, 4],
          [10, 2],
          [10, 8],
        ],
      },
      weights: crispWeights(['c1', 'c2'], [0.5, 0.25]),
    };
    const validation = validateMethodRun(weightedSumMethod, withWarnings);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings.map((issue) => [issue.severity, issue.code])).toEqual([
      ['warning', 'matrix.constant-criterion'],
      ['warning', 'weights.not-normalized'],
    ]);
    expect(runMethod(weightedSumMethod, withWarnings).warnings).toEqual(validation.warnings);
  });

  it('reports weight problems after a valid matrix', () => {
    const validation = validateMethodRun(weightedSumMethod, {
      matrix: sampleMatrix(),
      weights: crispWeights(['c1'], [1]),
    });
    expect(validation.errors.map((issue) => issue.code)).toEqual(['weights.missing']);
  });

  it('keeps the published issue codes stable', () => {
    expect(Object.values(ISSUE_CODES).sort()).toMatchInlineSnapshot(`
      [
        "input.malformed",
        "matrix.column-count-mismatch",
        "matrix.constant-criterion",
        "matrix.duplicate-alternative",
        "matrix.duplicate-criterion",
        "matrix.invalid-direction",
        "matrix.invalid-value",
        "matrix.missing-value",
        "matrix.negative-value",
        "matrix.no-alternatives",
        "matrix.no-criteria",
        "matrix.non-positive-value",
        "matrix.row-count-mismatch",
        "matrix.too-few-alternatives",
        "matrix.too-few-criteria",
        "matrix.unsupported-number-type",
        "parameter.invalid-option",
        "parameter.invalid-type",
        "parameter.not-integer",
        "parameter.out-of-range",
        "parameter.unknown",
        "solver.failed",
        "solver.unavailable",
        "weights.duplicate",
        "weights.empty",
        "weights.invalid-value",
        "weights.missing",
        "weights.negative",
        "weights.not-normalized",
        "weights.unknown-criterion",
        "weights.zero-sum",
      ]
    `);
    expect(new Set(Object.values(ISSUE_CODES)).size).toBe(Object.values(ISSUE_CODES).length);
  });

  it('has an English and a Turkish message for every issue code, with the same placeholders', () => {
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)/g)].map((match) => match[1]).sort();
    expect(Object.keys(ENGINE_MESSAGES.tr).sort()).toEqual(Object.keys(ENGINE_MESSAGES.en).sort());
    for (const code of Object.values(ISSUE_CODES)) {
      const key = messageKeyForCode(code) as engine.EngineMessageKey;
      expect(ENGINE_MESSAGES.en[key], key).toBeTruthy();
      expect(ENGINE_MESSAGES.tr[key], key).toBeTruthy();
    }
    for (const key of Object.keys(ENGINE_MESSAGES.en) as engine.EngineMessageKey[]) {
      expect(placeholders(ENGINE_MESSAGES.tr[key]), key).toEqual(
        placeholders(ENGINE_MESSAGES.en[key]),
      );
    }
  });
});

describe('P1.2: determinism', () => {
  it('gives identical output on repeated runs', () => {
    assertDeterministic(weightedSumMethod, sampleInput(), { normalization: 'max' }, { runs: 4 });
    assertDeterministic(weightedSumMethod, sampleInput(), { normalization: 'sum' });
  });

  it('does not depend on the order of the alternatives', () => {
    const input = sampleInput();
    const order = [2, 0, 1];
    const shuffled: WeightedSumInput = {
      weights: input.weights,
      matrix: {
        criteria: input.matrix.criteria,
        alternatives: order.map((index) => input.matrix.alternatives[index] as engine.Alternative),
        values: order.map((index) => input.matrix.values[index] as number[]),
      },
    };
    const byId = (record: ReturnType<typeof run>) =>
      Object.fromEntries(record.result.ranking.map((item) => [item.alternativeId, item]));
    expect(byId(run(shuffled))).toEqual(byId(run(input)));
  });
});

describe('package surface', () => {
  it('keeps the package name export and does not export the toy method', () => {
    expect(engine.PACKAGE_NAME).toBe('@mateo/engine');
    expect(Object.keys(engine)).not.toContain('weightedSumMethod');
    expect(typeof engine.createTraceBuilder).toBe('function');
    expect(typeof engine.createMethodRegistry).toBe('function');
    expect(engine.CRISP).toBe('crisp');
  });
});
