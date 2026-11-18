import { describe, expect, it } from 'vitest';
import { assertDeterministic } from '../determinism/guard';
import { EngineError } from '../errors';
import type { AnyMethod, MethodContext } from '../method/method';
import { NO_PARAMETERS } from '../method/parameters';
import { createMethodRegistry } from '../method/registry';
import { MethodValidationError, runMethod } from '../method/run';
import { createTraceBuilder } from '../trace/builder';
import { constant } from '../trace/tracked';
import { createValidation, VALID } from '../validation/collector';
import { SolverFailure, solveToOptimality } from './failure';
import type { LinearProgram, LinearSolver, LpSolution } from './linear-program';
import { assertLinearProgram, linearProgramProblems, solverLabel } from './linear-program';

const program: LinearProgram = {
  sense: 'minimize',
  variables: [
    { cost: 1, lower: 0, upper: Infinity },
    { cost: 2, lower: -Infinity, upper: 4 },
  ],
  constraints: [
    {
      terms: [
        { variable: 0, coefficient: 1 },
        { variable: 1, coefficient: 1 },
      ],
      lower: 1,
      upper: 1,
    },
  ],
};

/** A solver that returns a fixed answer and counts its calls. */
function fakeSolver(answer: LpSolution | (() => LpSolution)): LinearSolver & { calls: number } {
  const solver = {
    name: 'Fake',
    version: '1.0.0',
    calls: 0,
    solve() {
      solver.calls += 1;
      return typeof answer === 'function' ? answer() : answer;
    },
  };
  return solver;
}

const optimal: LpSolution = { status: 'optimal', objective: 1, values: [1, 0] };

describe('linear programmes', () => {
  it('accepts a well-formed programme with infinite bounds', () => {
    expect(linearProgramProblems(program)).toEqual([]);
    expect(() => assertLinearProgram(program)).not.toThrow();
  });

  it('reports every structural problem', () => {
    const problems = linearProgramProblems({
      sense: 'maximise' as 'maximize',
      variables: [
        { cost: Infinity, lower: 0, upper: 1 },
        { cost: 0, lower: 2, upper: 1 },
        { cost: 0, lower: Number.NaN, upper: 1 },
      ],
      constraints: [
        {
          terms: [
            { variable: 0, coefficient: Number.NaN },
            { variable: 0, coefficient: 1 },
            { variable: 3, coefficient: 1 },
            { variable: 0.5, coefficient: 1 },
          ],
          lower: 1,
          upper: 0,
        },
      ],
    });
    expect(problems).toEqual([
      'unknown sense "maximise"',
      'variable 0: the cost is not finite',
      'variable 1: invalid bounds',
      'variable 2: invalid bounds',
      'constraint 0: invalid bounds',
      'constraint 0: a coefficient is not finite',
      'constraint 0: variable 0 appears twice',
      'constraint 0: unknown variable 3',
      'constraint 0: unknown variable 0.5',
    ]);
    expect(() => assertLinearProgram({ ...program, sense: 'up' as 'minimize' })).toThrow(
      expect.objectContaining({ code: 'INVALID_ARGUMENT' }) as Error,
    );
  });

  it('names a solver by name and version', () => {
    expect(solverLabel(fakeSolver(optimal))).toBe('Fake 1.0.0');
  });
});

describe('solveToOptimality', () => {
  it('returns an optimal solution', () => {
    expect(solveToOptimality(fakeSolver(optimal), program)).toBe(optimal);
  });

  it.each<[LpSolution, string]>([
    [{ status: 'infeasible' }, 'infeasible'],
    [{ status: 'unbounded' }, 'unbounded'],
    [{ status: 'failed', reason: 'numerical trouble' }, 'failed'],
    [{ status: 'optimal', objective: 1, values: [1] }, 'failed'],
    [{ status: 'optimal', objective: Number.NaN, values: [1, 0] }, 'failed'],
    [{ status: 'optimal', objective: 1, values: [1, Infinity] }, 'failed'],
  ])('throws a SolverFailure carrying a translated issue for %o', (answer, status) => {
    try {
      solveToOptimality(fakeSolver(answer), program);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SolverFailure);
      expect(error).toBeInstanceOf(EngineError);
      expect((error as SolverFailure).code).toBe('SOLVER_FAILED');
      expect((error as SolverFailure).issue).toEqual({
        severity: 'error',
        code: 'solver.failed',
        messageKey: 'validation.solver.failed',
        params: { solver: 'Fake 1.0.0', status },
      });
    }
  });

  it('turns an exception inside the solver into a failure', () => {
    const throwing = fakeSolver(() => {
      throw new Error('out of memory');
    });
    expect(() => solveToOptimality(throwing, program)).toThrow(/failed: out of memory/);
  });

  it('refuses a malformed programme before calling the solver: that is a method bug', () => {
    const solver = fakeSolver(optimal);
    expect(() =>
      solveToOptimality(solver, { ...program, variables: [{ cost: 0, lower: 1, upper: 0 }] }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }) as Error);
    expect(solver.calls).toBe(0);
  });
});

/** A method that solves `program` and reports the objective. */
const solvingMethod = (overrides: Partial<AnyMethod> = {}): AnyMethod => ({
  id: 'solving',
  version: '1.0.0',
  category: 'weighting',
  nameKey: 'methods.solving.name',
  supportedNumberTypes: ['crisp'],
  inputSchema: [],
  outputSchema: [],
  parameters: NO_PARAMETERS,
  references: [],
  requires: ['linear-solver'],
  validate: () => {
    const v = createValidation();
    v.warning('solving.note');
    return v.result();
  },
  run: (_input: unknown, _params: unknown, context: MethodContext) => {
    const objective = solveToOptimality(context.solver!, program).objective;
    const tb = createTraceBuilder({ methodId: 'solving', methodVersion: '1.0.0' });
    tb.scalar({ id: 'objective', nameKey: 'n', explanationKey: 'e', value: constant(objective) });
    return { result: objective, trace: tb.build() };
  },
  ...overrides,
});

describe('runMethod with a solver', () => {
  it('passes the solver to a method that requires it', () => {
    const solver = fakeSolver(optimal);
    const record = runMethod(solvingMethod(), {}, {}, { solver });
    expect(record.result).toBe(1);
    expect(solver.calls).toBe(1);
    expect(record.warnings.map((w) => w.code)).toEqual(['solving.note']);
  });

  it('also without recording a trace', () => {
    const record = runMethod(
      solvingMethod(),
      {},
      {},
      {
        solver: fakeSolver(optimal),
        recordTrace: false,
      },
    );
    expect(record.result).toBe(1);
    expect(record.trace.steps).toEqual([]);
  });

  it('refuses to run a method whose solver is missing, with a validation error', () => {
    try {
      runMethod(solvingMethod(), {});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MethodValidationError);
      const { validation } = error as MethodValidationError;
      expect(validation.ok).toBe(false);
      expect(validation.errors.map((e) => e.code)).toEqual(['solver.unavailable']);
      expect(validation.warnings.map((w) => w.code)).toEqual(['solving.note']);
    }
  });

  it('reports a solver failure inside run as a validation error', () => {
    try {
      runMethod(solvingMethod(), {}, {}, { solver: fakeSolver({ status: 'infeasible' }) });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MethodValidationError);
      const { validation } = error as MethodValidationError;
      expect(validation.errors.map((e) => [e.code, e.params])).toEqual([
        ['solver.failed', { solver: 'Fake 1.0.0', status: 'infeasible' }],
      ]);
      expect(validation.warnings.map((w) => w.code)).toEqual(['solving.note']);
    }
  });

  it('lets other errors of run through', () => {
    const broken = solvingMethod({
      run: () => {
        throw new EngineError('INVALID_ARGUMENT', 'bug');
      },
    });
    expect(() => runMethod(broken, {}, {}, { solver: fakeSolver(optimal) })).toThrow('bug');
  });

  it('gives a method that does not require a solver an empty context', () => {
    let seen: MethodContext | undefined;
    const plain = solvingMethod({
      requires: undefined,
      validate: () => VALID,
      run: (_input: unknown, _params: unknown, context: MethodContext) => {
        seen = context;
        const tb = createTraceBuilder({ methodId: 'solving', methodVersion: '1.0.0' });
        tb.scalar({ id: 'x', nameKey: 'n', explanationKey: 'e', value: constant(0) });
        return { result: 0, trace: tb.build() };
      },
    });
    runMethod(plain, {}, {}, { solver: fakeSolver(optimal) });
    expect(seen).toEqual({});
  });

  it('passes the solver through the determinism guard', () => {
    const solver = fakeSolver(optimal);
    expect(assertDeterministic(solvingMethod(), {}, {}, { solver }).result).toBe(1);
    expect(solver.calls).toBe(3);
  });
});

describe('method requirements', () => {
  it('registers a method with a known requirement and rejects an unknown one', () => {
    expect(() => createMethodRegistry([solvingMethod()])).not.toThrow();
    expect(() =>
      createMethodRegistry([solvingMethod({ requires: ['quantum-computer' as 'linear-solver'] })]),
    ).toThrow(/unknown requirement/);
    expect(() =>
      createMethodRegistry([solvingMethod({ requires: 'linear-solver' as unknown as [] })]),
    ).toThrow(/unknown requirement/);
  });
});
