/**
 * The engine's `LinearSolver` on top of HiGHS (docs/plan.md §5), compiled to WebAssembly by
 * the `highs` package. The binary is bundled with the app, so solving never needs a network.
 */
import type { LinearProgram, LinearSolver, LpSolution } from '@mateo/engine';
import { assertLinearProgram } from '@mateo/engine';
import type { Highs, InitOptions, ModelData, ModelStatusCode } from 'highs';
import loadHighs from 'highs';

/** `HighsModelStatus` codes (see the `highs` type definitions) this adapter maps. */
const STATUS = {
  optimal: 7,
  infeasible: 8,
  unboundedOrInfeasible: 9,
  unbounded: 10,
} as const satisfies Record<string, ModelStatusCode>;

/**
 * Solver options. Everything not listed keeps the HiGHS default. No time or iteration
 * limit: a limit that depends on the clock would make results machine-dependent.
 */
const OPTIONS = {
  output_flag: false,
  random_seed: 0,
  // Tighter than the defaults (1e-7): reported optima are compared to four decimals and
  // more, and the models of Mateo's methods are small and well scaled.
  primal_feasibility_tolerance: 1e-9,
  dual_feasibility_tolerance: 1e-9,
} as const;

function modelData(highs: Highs, program: LinearProgram): ModelData {
  const bound = (value: number) =>
    value === Infinity ? highs.infinity : value === -Infinity ? -highs.infinity : value;
  const starts = [0];
  const indices: number[] = [];
  const values: number[] = [];
  for (const constraint of program.constraints) {
    for (const { variable, coefficient } of constraint.terms) {
      if (coefficient !== 0) {
        indices.push(variable);
        values.push(coefficient);
      }
    }
    starts.push(indices.length);
  }
  return {
    numCols: program.variables.length,
    numRows: program.constraints.length,
    sense:
      program.sense === 'minimize'
        ? highs.constants.objectiveSense.minimize
        : highs.constants.objectiveSense.maximize,
    colCost: program.variables.map((variable) => variable.cost),
    colLower: program.variables.map((variable) => bound(variable.lower)),
    colUpper: program.variables.map((variable) => bound(variable.upper)),
    rowLower: program.constraints.map((constraint) => bound(constraint.lower)),
    rowUpper: program.constraints.map((constraint) => bound(constraint.upper)),
    matrix: {
      format: 'csr',
      numRows: program.constraints.length,
      numCols: program.variables.length,
      starts,
      indices,
      values,
    },
  };
}

/** A programme without variables: its constraints read `lower ≤ 0 ≤ upper`. */
function solveEmpty(program: LinearProgram): LpSolution {
  const feasible = program.constraints.every(
    (constraint) => constraint.lower <= 0 && constraint.upper >= 0,
  );
  return feasible ? { status: 'optimal', objective: 0, values: [] } : { status: 'infeasible' };
}

/** Wraps a loaded HiGHS runtime. Each solve uses a fresh native model, so solves never share state. */
export function createHighsSolver(highs: Highs): LinearSolver {
  return {
    name: 'HiGHS',
    version: highs.version.string,
    solve(program) {
      assertLinearProgram(program);
      if (program.variables.length === 0) return solveEmpty(program);
      return highs.withModel(modelData(highs, program), (model): LpSolution => {
        model.options.set(OPTIONS);
        model.run();
        const status = model.getModelStatus();
        switch (status) {
          case STATUS.optimal: {
            const { colValue } = model.getSolution();
            return {
              status: 'optimal',
              objective: model.getObjectiveValue(),
              values: Array.from(colValue, (value) => (value === 0 ? 0 : value)),
            };
          }
          case STATUS.infeasible:
            return { status: 'infeasible' };
          case STATUS.unbounded:
            return { status: 'unbounded' };
          case STATUS.unboundedOrInfeasible:
            return { status: 'failed', reason: 'HiGHS: unbounded or infeasible' };
          default:
            return { status: 'failed', reason: `HiGHS model status ${status}` };
        }
      });
    },
  };
}

/**
 * Loads HiGHS and returns a solver. In the browser pass `locateFile` (or `wasmBinary`) so
 * the loader finds the `highs.wasm` that the app bundles; in Node the file next to the
 * package is found without options. Loading compiles the WebAssembly module: call it once
 * and keep the solver.
 */
export async function loadHighsSolver(options: InitOptions = {}): Promise<LinearSolver> {
  return createHighsSolver(await loadHighs(options));
}
