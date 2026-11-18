import { EngineError } from '../errors';
import { ISSUE_CODES } from '../validation/codes';
import { createIssue } from '../validation/collector';
import type { ValidationIssue } from '../validation/types';
import type { LinearProgram, LinearSolver, LpSolution } from './linear-program';
import { assertLinearProgram, solverLabel } from './linear-program';

export type OptimalSolution = Extract<LpSolution, { status: 'optimal' }>;

/**
 * Thrown inside a method's `run` when the solver does not return an optimum. `runMethod`
 * turns it into a {@link MethodValidationError} carrying {@link SolverFailure.issue}, so
 * the user sees a translated message instead of a crash (docs/phases/phase-2.md, P2.2).
 */
export class SolverFailure extends EngineError {
  readonly issue: ValidationIssue;

  constructor(issue: ValidationIssue, message: string) {
    super('SOLVER_FAILED', message, { code: issue.code, params: issue.params });
    this.name = 'SolverFailure';
    this.issue = issue;
  }
}

/**
 * Solves a programme that must have an optimum and returns it. A malformed programme throws
 * `EngineError('INVALID_ARGUMENT')`. Any other outcome throws a {@link SolverFailure} with the issue `solver.failed`; a method calls this only for
 * programmes that are feasible and bounded by construction, so another status means the
 * solver failed, not that the user's data is wrong.
 */
export function solveToOptimality(solver: LinearSolver, program: LinearProgram): OptimalSolution {
  // A malformed programme is a bug in the method; it must not pass for a solver failure.
  assertLinearProgram(program);
  let solution: LpSolution;
  try {
    solution = solver.solve(program);
  } catch (error) {
    solution = { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
  }
  if (solution.status === 'optimal') {
    if (
      solution.values.length !== program.variables.length ||
      !Number.isFinite(solution.objective) ||
      !solution.values.every(Number.isFinite)
    ) {
      solution = { status: 'failed', reason: 'The solver returned a malformed solution.' };
    } else {
      return solution;
    }
  }
  throw new SolverFailure(
    createIssue('error', ISSUE_CODES.solverFailed, {
      params: { solver: solverLabel(solver), status: solution.status },
    }),
    `${solverLabel(solver)} did not find an optimum (${solution.status}${
      solution.reason === undefined ? '' : `: ${solution.reason}`
    }).`,
  );
}
