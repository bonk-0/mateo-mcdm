# BWM (Best–Worst Method)

**References (method).**
- Nonlinear model: Rezaei, J. (2015). Best-worst multi-criteria decision-making method. *Omega*, 53, 49–57. DOI [10.1016/j.omega.2014.11.009](https://doi.org/10.1016/j.omega.2014.11.009)
- Linear model and properties: Rezaei, J. (2016). Best-worst multi-criteria decision-making method: Some properties and a linear model. *Omega*, 64, 126–130. DOI [10.1016/j.omega.2015.12.001](https://doi.org/10.1016/j.omega.2015.12.001)

**Verification.** Metadata of both papers confirmed against Crossref. **Both are paywalled and were not read.** The formulation and the worked example come from the method author's own lecture slides, published on the method's website: Rezaei, J. (2019), *BWM: Best Worst Method*, [slides 21–25](https://bestworstmethod.com/wp-content/uploads/2020/01/Best-Worst-Method-BWM-2019.pdf). Slide 34 cites both Omega papers as the source of the models.

## Formulation

The decision maker chooses the best criterion B and the worst criterion W, then gives integer preferences on 1–9: best-to-others a_Bj and others-to-worst a_jW (a_BB = a_WW = 1).

**Nonlinear model (2015):** min ξ s.t. |w_B / w_j − a_Bj| ≤ ξ, |w_j / w_W − a_jW| ≤ ξ for all j, Σ w_j = 1, w_j ≥ 0.

- For a fixed ξ every constraint is linear in w (|w_B − a_Bj w_j| ≤ ξ w_j), so the optimum ξ* is found exactly by bisection on ξ with a linear feasibility problem, and the set of optimal weights is a polytope.
- **The optimal weights are not unique in general** (Rezaei 2016). The slides report, for each weight, its interval over all optimal solutions (min and max of w_j at ξ*, two LPs per criterion) and the interval centre. Mateo should report ξ*, the intervals and the centres; a single solver-dependent vertex must never be shown as "the" result.
- **Consistency ratio** CR = ξ* / CI(a_BW), with CI the largest ξ possible for a_BW: the root of ξ² − (1 + 2a_BW) ξ + (a_BW² − a_BW) = 0, which gives CI = 0.00, 0.44, 1.00, 1.63, 2.30, 3.00, 3.73, 4.47, 5.23 for a_BW = 1…9 (slides; recomputed from the formula).

**Linear model (2016):** min ξ^L s.t. |w_B − a_Bj w_j| ≤ ξ^L, |w_j − a_jW w_W| ≤ ξ^L, Σ w_j = 1, w_j ≥ 0. A linear programme with a unique optimum; ξ^L* itself is the consistency indicator and is not divided by CI.

Both models need an LP solver (P2.2's HiGHS wrapper). `docs/methods/verification/lp.py` is a small exact simplex used only to recompute the fixture.

**Implementation (P2.2).** `packages/methods/bwm`, parameter `model` (`nonlinear`, the default, or `linear`), solved with HiGHS through the engine's `LinearSolver`:
- ξ* by bisection on ξ in [0, max a − 1] (equal weights are feasible at max a − 1) until the bracket is narrower than 10⁻¹²; feasibility at a fixed ξ is the sign of the largest uniform slack t* of the linear conditions (an LP). Fully consistent input gives ξ* = 0 exactly. The returned ξ* is the feasible end of the bracket, and the 2n interval LPs are solved there.
- The weight output is the interval centres normalised to sum 1 (the centres of the car example sum to 1.0026), so it can feed a ranking method; ξ*, CI, CR, the intervals and the raw centres are in the result and the trace.
- Each solver result is a trace operation (`bwm.nonlinear-xi`, `bwm.weight-bound`, `bwm.linear-xi`, `bwm.linear-weight`) that records the solver and its version; `bwmOperationEvaluators(solver)` lets `verifyTrace` re-solve and compare them.
- Validation: values in [1, 9], a_BB = a_WW = 1, the same a_BW in both vectors, and a_BW > 1. Ordinal inconsistency is a warning, not an error.
- CR ≤ 1 only holds while no comparison exceeds a_BW. A comparison above a_BW is ordinally inconsistent (it is reported) and can push ξ* above CI: a_BW = 2 with a_jW = 5 gives ξ* = 0.5 > CI = 0.44.

## Edge cases

- a_Bj, a_jW must be in [1, 9]; a_BB = a_WW = 1; B ≠ W unless there is a single criterion.
- Fully consistent input (a_Bj · a_jW = a_BW for all j) gives ξ* = 0 and a unique weight vector.
- Show the consistency issue before running (P2.7): ordinal inconsistency, for example a_Bi > a_Bj while a_iW > a_jW, can be detected from the vectors alone.

## Worked example

Fixture: `packages/methods/bwm/fixtures/rezaei-car.json`. Buying a car: quality, price, comfort, safety, style; best price, worst style; BO = (2, 1, 4, 3, 8), OW = (4, 8, 4, 2, 1).
- Nonlinear: ξ* = 1, CR = 1 / 4.47 = 0.22, centres **0.2024, 0.4609, 0.1536, 0.1345, 0.0512**; all ten interval bounds are reproduced.
- Linear: ξ^L* = 0.0615, weights **0.2462, 0.4308, 0.1231, 0.1538, 0.0462**.

The example is itself ordinally inconsistent: comfort is less important than safety by best-to-others (4 > 3) but more important by others-to-worst (4 > 2), which is why ξ* = 1 > 0. Mateo shows this as a warning before running.

**Errata.** Slide 25 swaps comfort and safety in the linear weights (prints 0.154, 0.123) and truncates ξ^L* = 4/65 to 0.061. The LP optimum is unique, and only comfort 0.1231 < safety 0.1538 is consistent with a_B,comfort = 4 > a_B,safety = 3.

## Fuzzy BWM

**Candidate.** Guo, S., Zhao, H. (2017). Fuzzy best-worst multi-criteria decision-making method and its applications. *Knowledge-Based Systems*, 121, 23–31. DOI [10.1016/j.knosys.2017.01.010](https://doi.org/10.1016/j.knosys.2017.01.010). The most cited TFN extension.

**Not verified: paywalled**, and no open-access paper reproducing its example in full was found (Ilieva 2020, *Cybernetics and Information Technologies* 20(2), uses it only as a benchmark and prints its consistency ratios, not its inputs).

**Proposal.** Defer fuzzy BWM until a reproducible source is available (for example if the user or a library can supply the paper), or replace it with the Bayesian or interval BWM variants by Rezaei's group in Phase 4. Crisp BWM in P2.2 is unaffected.
