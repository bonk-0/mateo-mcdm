import { EngineError } from '../errors';

/**
 * A linear programme: optimise `Σ cost_j · x_j` subject to
 * `lower_i ≤ Σ_j a_ij · x_j ≤ upper_i` for every constraint and
 * `lower_j ≤ x_j ≤ upper_j` for every variable.
 *
 * Bounds may be `±Infinity` (no bound); everything else must be finite. An equality is a
 * constraint with `lower === upper`. The model is plain data, so the same programme can be
 * handed to any {@link LinearSolver}.
 */
export interface LinearProgram {
  readonly sense: 'minimize' | 'maximize';
  readonly variables: readonly LpVariable[];
  readonly constraints: readonly LpConstraint[];
}

export interface LpVariable {
  readonly cost: number;
  readonly lower: number;
  readonly upper: number;
}

export interface LpConstraint {
  /** Non-zero coefficients only; each variable at most once. */
  readonly terms: readonly LpTerm[];
  readonly lower: number;
  readonly upper: number;
}

export interface LpTerm {
  /** Index into {@link LinearProgram.variables}. */
  readonly variable: number;
  readonly coefficient: number;
}

/**
 * The outcome of a solve. Only `optimal` carries values: a method never shows a point the
 * solver did not prove optimal. `failed` covers every other end (numerical trouble, an
 * iteration limit, an error inside the solver); `reason` is diagnostic text, not for users.
 */
export type LpSolution =
  | {
      readonly status: 'optimal';
      readonly objective: number;
      /** One value per variable, in variable order. */
      readonly values: readonly number[];
    }
  | { readonly status: 'infeasible' | 'unbounded' | 'failed'; readonly reason?: string };

export type LpStatus = LpSolution['status'];

/**
 * A linear programming solver (docs/plan.md §5: HiGHS compiled to WebAssembly). Solving is
 * synchronous, because methods run synchronously (in a Web Worker in the app); loading a
 * solver may be asynchronous and happens before any method runs.
 *
 * A solver used by a method must be deterministic: the same programme always gives the
 * same solution, bit for bit. Stored traces record `name` and `version`, because another
 * solver (or another version of the same one) may return different last digits.
 */
export interface LinearSolver {
  /** For example `HiGHS`. */
  readonly name: string;
  /** For example `1.15.1`. */
  readonly version: string;
  solve(program: LinearProgram): LpSolution;
}

/** `HiGHS 1.15.1`: how a solver is named in traces. */
export function solverLabel(solver: LinearSolver): string {
  return `${solver.name} ${solver.version}`;
}

const isBound = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

/**
 * Structural problems of a programme: non-finite costs or coefficients, `NaN` bounds, a
 * lower bound above the upper bound, unknown or repeated variables. Empty when the
 * programme is well formed. A method builds its programmes itself, so a problem here is a
 * bug in the method, not in the user's data.
 */
export function linearProgramProblems(program: LinearProgram): string[] {
  const problems: string[] = [];
  if (program.sense !== 'minimize' && program.sense !== 'maximize') {
    problems.push(`unknown sense "${String(program.sense)}"`);
  }
  const n = program.variables.length;
  program.variables.forEach((variable, j) => {
    if (!Number.isFinite(variable.cost)) problems.push(`variable ${j}: the cost is not finite`);
    if (!isBound(variable.lower) || !isBound(variable.upper) || variable.lower > variable.upper) {
      problems.push(`variable ${j}: invalid bounds`);
    }
  });
  program.constraints.forEach((constraint, i) => {
    if (
      !isBound(constraint.lower) ||
      !isBound(constraint.upper) ||
      constraint.lower > constraint.upper
    ) {
      problems.push(`constraint ${i}: invalid bounds`);
    }
    const seen = new Set<number>();
    for (const { variable, coefficient } of constraint.terms) {
      if (!Number.isInteger(variable) || variable < 0 || variable >= n) {
        problems.push(`constraint ${i}: unknown variable ${variable}`);
      } else if (seen.has(variable)) {
        problems.push(`constraint ${i}: variable ${variable} appears twice`);
      }
      seen.add(variable);
      if (!Number.isFinite(coefficient)) {
        problems.push(`constraint ${i}: a coefficient is not finite`);
      }
    }
  });
  return problems;
}

/** Throws `EngineError('INVALID_ARGUMENT')` unless the programme is well formed. */
export function assertLinearProgram(program: LinearProgram): void {
  const problems = linearProgramProblems(program);
  if (problems.length > 0) {
    throw new EngineError(
      'INVALID_ARGUMENT',
      `The linear programme is malformed: ${problems.join('; ')}.`,
      { problems },
    );
  }
}
