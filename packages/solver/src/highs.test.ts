import type { LinearProgram } from '@mateo/engine';
import { EngineError, solveToOptimality } from '@mateo/engine';
import type { Highs } from 'highs';
import loadHighs from 'highs';
import { describe, expect, it } from 'vitest';
import { createHighsSolver, loadHighsSolver, PACKAGE_NAME } from './index';

const solver = await loadHighsSolver();

const free = { lower: -Infinity, upper: Infinity };

/** max 3x + 2y s.t. x + y ≤ 4, x + 3y ≤ 6, x ≤ 3, x, y ≥ 0: optimum (3, 1), 11. */
const textbook: LinearProgram = {
  sense: 'maximize',
  variables: [
    { cost: 3, lower: 0, upper: 3 },
    { cost: 2, lower: 0, upper: Infinity },
  ],
  constraints: [
    {
      terms: [
        { variable: 0, coefficient: 1 },
        { variable: 1, coefficient: 1 },
      ],
      lower: -Infinity,
      upper: 4,
    },
    {
      terms: [
        { variable: 0, coefficient: 1 },
        { variable: 1, coefficient: 3 },
      ],
      lower: -Infinity,
      upper: 6,
    },
  ],
};

describe('@mateo/solver: HiGHS', () => {
  it('loads offline from the bundled WebAssembly and names itself', () => {
    expect(PACKAGE_NAME).toBe('@mateo/solver');
    expect(solver.name).toBe('HiGHS');
    expect(solver.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('solves a small programme to optimality', () => {
    const solution = solver.solve(textbook);
    expect(solution).toEqual({ status: 'optimal', objective: 11, values: [3, 1] });
  });

  it('minimises, with equalities and free variables', () => {
    // min x − y s.t. x + y = 2, x − y ≥ −1, y ≤ 5: optimum x = 0.5, y = 1.5, −1.
    const solution = solver.solve({
      sense: 'minimize',
      variables: [
        { cost: 1, ...free },
        { cost: -1, lower: -Infinity, upper: 5 },
      ],
      constraints: [
        {
          terms: [
            { variable: 0, coefficient: 1 },
            { variable: 1, coefficient: 1 },
          ],
          lower: 2,
          upper: 2,
        },
        {
          terms: [
            { variable: 0, coefficient: 1 },
            { variable: 1, coefficient: -1 },
          ],
          lower: -1,
          upper: Infinity,
        },
      ],
    });
    expect(solution.status).toBe('optimal');
    if (solution.status !== 'optimal') return;
    expect(solution.objective).toBeCloseTo(-1, 12);
    expect(solution.values[0]).toBeCloseTo(0.5, 12);
    expect(solution.values[1]).toBeCloseTo(1.5, 12);
  });

  it('skips zero coefficients', () => {
    const solution = solver.solve({
      ...textbook,
      constraints: [
        ...textbook.constraints,
        { terms: [{ variable: 1, coefficient: 0 }], lower: -Infinity, upper: 0 },
      ],
    });
    expect(solution).toEqual({ status: 'optimal', objective: 11, values: [3, 1] });
  });

  it('reports infeasible and unbounded programmes', () => {
    expect(
      solver.solve({
        sense: 'minimize',
        variables: [{ cost: 1, lower: 0, upper: 1 }],
        constraints: [{ terms: [{ variable: 0, coefficient: 1 }], lower: 2, upper: Infinity }],
      }),
    ).toEqual({ status: 'infeasible' });
    const unbounded = solver.solve({
      sense: 'maximize',
      variables: [{ cost: 1, lower: 0, upper: Infinity }],
      constraints: [],
    });
    expect(['unbounded', 'failed']).toContain(unbounded.status);
  });

  it('solves a programme without variables', () => {
    expect(solver.solve({ sense: 'minimize', variables: [], constraints: [] })).toEqual({
      status: 'optimal',
      objective: 0,
      values: [],
    });
    expect(
      solver.solve({
        sense: 'minimize',
        variables: [],
        constraints: [{ terms: [], lower: 1, upper: 2 }],
      }),
    ).toEqual({ status: 'infeasible' });
  });

  it('refuses a malformed programme instead of guessing', () => {
    expect(() =>
      solver.solve({
        sense: 'minimize',
        variables: [{ cost: Number.NaN, lower: 0, upper: 1 }],
        constraints: [],
      }),
    ).toThrow(EngineError);
  });

  it('is deterministic: the same programme gives the same bits', () => {
    const first = JSON.stringify(solver.solve(textbook));
    for (let i = 0; i < 5; i += 1) expect(JSON.stringify(solver.solve(textbook))).toBe(first);
  });

  it('works through solveToOptimality', () => {
    expect(solveToOptimality(solver, textbook).objective).toBe(11);
  });

  it('wraps an already loaded runtime', async () => {
    const highs: Highs = await loadHighs();
    expect(createHighsSolver(highs).solve(textbook).status).toBe('optimal');
  });

  it('maps other HiGHS outcomes to failed', () => {
    const highs = {
      version: { string: 'test' },
      infinity: Infinity,
      constants: { objectiveSense: { minimize: 1, maximize: -1 } },
      withModel: (_model: unknown, operation: (model: unknown) => unknown) =>
        operation({
          options: { set: () => undefined },
          run: () => undefined,
          getModelStatus: () => 9,
        }),
    } as unknown as Highs;
    expect(createHighsSolver(highs).solve(textbook)).toEqual({
      status: 'failed',
      reason: 'HiGHS: unbounded or infeasible',
    });
    const limit = {
      ...highs,
      withModel: (_model: unknown, operation: (model: unknown) => unknown) =>
        operation({
          options: { set: () => undefined },
          run: () => undefined,
          getModelStatus: () => 14,
        }),
    } as unknown as Highs;
    expect(createHighsSolver(limit).solve(textbook)).toEqual({
      status: 'failed',
      reason: 'HiGHS model status 14',
    });
  });
});
