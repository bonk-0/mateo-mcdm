/**
 * The optimization models of BWM as linear programmes (docs/methods/bwm.md). Plain numbers
 * in, plain numbers out: `bwm.ts` records the results in the trace, and `operations.ts`
 * recomputes them with the same functions when a trace is audited.
 *
 * Notation: `bo[j]` = a_Bj (best to others), `ow[j]` = a_jW (others to worst), `best` and
 * `worst` are criterion positions, `n` the number of criteria. Validation guarantees
 * a_BB = a_WW = 1, a_BW = bo[worst] = ow[best] > 1, every value in [1, 9] and best ≠ worst.
 */
import type { LinearProgram, LinearSolver, LpConstraint } from '@mateo/engine';
import { solveToOptimality } from '@mateo/engine';

export interface BwmVectors {
  readonly bo: readonly number[];
  readonly ow: readonly number[];
  readonly best: number;
  readonly worst: number;
}

/**
 * Bisection stops when the bracket around ξ* is this narrow. ξ* ≤ 8 on the 1-9 scale, so
 * this is far below the precision anyone reads, and far above the round-off of the LPs.
 */
export const XI_TOLERANCE = 1e-12;

/** Relative tolerance of the full-consistency test a_Bj · a_jW = a_BW. */
const CONSISTENCY_TOLERANCE = 1e-12;

const FREE = { lower: -Infinity, upper: Infinity } as const;
const AT_MOST_ZERO = { lower: -Infinity, upper: 0 } as const;

/**
 * The pairs (numerator, denominator, a) of every ratio condition w_num / w_den ≈ a:
 * w_B / w_j ≈ a_Bj for j ≠ B, and w_j / w_W ≈ a_jW for j ∉ {B, W}. The pair (B, W) occurs
 * once; the conditions with j = B in the first group and j = W in the second are identities.
 */
function ratioConditions({ bo, ow, best, worst }: BwmVectors) {
  const conditions: { num: number; den: number; a: number }[] = [];
  bo.forEach((a, j) => {
    if (j !== best) conditions.push({ num: best, den: j, a });
  });
  ow.forEach((a, j) => {
    if (j !== best && j !== worst) conditions.push({ num: j, den: worst, a });
  });
  return conditions;
}

const weightSum = (n: number): LpConstraint => ({
  terms: Array.from({ length: n }, (_, j) => ({ variable: j, coefficient: 1 })),
  lower: 1,
  upper: 1,
});

/** `ca · w_a + cb · w_b`; the two variables of a ratio condition always differ. */
const terms = (a: number, ca: number, b: number, cb: number) => [
  { variable: a, coefficient: ca },
  { variable: b, coefficient: cb },
];

/**
 * Rows of the nonlinear model at a fixed ξ, linear in w: |w_num − a · w_den| ≤ ξ · w_den.
 * With `slack` (variable index n), each row also gets `+ t`, so that maximising t measures
 * how far ξ is from feasibility: t* ≥ 0 exactly when ξ ≥ ξ*.
 */
function nonlinearRows(vectors: BwmVectors, xi: number, slack: boolean): LpConstraint[] {
  const n = vectors.bo.length;
  const rows: LpConstraint[] = [];
  for (const { num, den, a } of ratioConditions(vectors)) {
    for (const sign of [1, -1]) {
      // sign · (w_num − a · w_den) − ξ · w_den (+ t) ≤ 0
      const base = terms(num, sign, den, -sign * a - xi);
      rows.push({
        terms: slack ? [...base, { variable: n, coefficient: 1 }] : base,
        ...AT_MOST_ZERO,
      });
    }
  }
  rows.push(weightSum(n));
  return rows;
}

const weightVariables = (n: number) =>
  Array.from({ length: n }, () => ({ cost: 0, lower: 0, upper: Infinity }));

/** t*(ξ): the largest uniform slack of the nonlinear conditions at ξ. */
function nonlinearSlack(solver: LinearSolver, vectors: BwmVectors, xi: number): number {
  const n = vectors.bo.length;
  const program: LinearProgram = {
    sense: 'maximize',
    variables: [...weightVariables(n), { cost: 1, ...FREE }],
    constraints: nonlinearRows(vectors, xi, true),
  };
  return solveToOptimality(solver, program).objective;
}

/** a_Bj · a_jW = a_BW for every j (Rezaei 2015): then ξ* = 0 and the weights are unique. */
export function isFullyConsistent({ bo, ow, worst }: BwmVectors): boolean {
  const aBW = bo[worst]!;
  return bo.every((a, j) => Math.abs(a * ow[j]! - aBW) <= CONSISTENCY_TOLERANCE * aBW);
}

/**
 * ξ* of the nonlinear model (Rezaei 2015): min ξ s.t. |w_B / w_j − a_Bj| ≤ ξ,
 * |w_j / w_W − a_jW| ≤ ξ, Σ w = 1, w ≥ 0.
 *
 * For a fixed ξ the conditions are linear in w, and the set of feasible ξ is [ξ*, ∞), so
 * ξ* is found by bisection on the sign of t*(ξ). The bracket starts at [0, max a − 1]:
 * equal weights meet every condition with ξ = max a − 1. Returns the upper, feasible end of
 * the final bracket, so the weight intervals can be computed at the returned value.
 */
export function nonlinearXi(solver: LinearSolver, vectors: BwmVectors): number {
  if (isFullyConsistent(vectors)) return 0;
  let lo = 0;
  let hi = Math.max(...vectors.bo, ...vectors.ow) - 1;
  while (hi - lo > XI_TOLERANCE) {
    const mid = (lo + hi) / 2;
    if (nonlinearSlack(solver, vectors, mid) >= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}

export type WeightBound = 'lower' | 'upper';

/**
 * The smallest or largest weight of criterion `j` over all optimal solutions of the
 * nonlinear model: min or max w_j subject to the conditions at ξ = ξ*.
 */
export function weightBound(
  solver: LinearSolver,
  vectors: BwmVectors,
  xi: number,
  j: number,
  bound: WeightBound,
): number {
  const n = vectors.bo.length;
  const program: LinearProgram = {
    sense: bound === 'lower' ? 'minimize' : 'maximize',
    variables: weightVariables(n).map((variable, k) => ({ ...variable, cost: k === j ? 1 : 0 })),
    constraints: nonlinearRows(vectors, xi, false),
  };
  return solveToOptimality(solver, program).objective;
}

/**
 * The linear model (Rezaei 2016): min ξ^L s.t. |w_B − a_Bj w_j| ≤ ξ^L,
 * |w_j − a_jW w_W| ≤ ξ^L, Σ w = 1, w ≥ 0. Its optimum is unique, weights included.
 */
export function linearOptimum(
  solver: LinearSolver,
  vectors: BwmVectors,
): { readonly xi: number; readonly weights: readonly number[] } {
  const n = vectors.bo.length;
  const xi = n; // index of the ξ^L variable
  const constraints: LpConstraint[] = [];
  for (const { num, den, a } of ratioConditions(vectors)) {
    for (const sign of [1, -1]) {
      // sign · (w_num − a · w_den) − ξ^L ≤ 0
      constraints.push({
        terms: [...terms(num, sign, den, -sign * a), { variable: xi, coefficient: -1 }],
        ...AT_MOST_ZERO,
      });
    }
  }
  constraints.push(weightSum(n));
  const solution = solveToOptimality(solver, {
    sense: 'minimize',
    variables: [...weightVariables(n), { cost: 1, lower: 0, upper: Infinity }],
    constraints,
  });
  return { xi: solution.objective, weights: solution.values.slice(0, n) };
}
