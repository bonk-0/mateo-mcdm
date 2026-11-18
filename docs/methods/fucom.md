# FUCOM

**Reference.** Pamučar, D., Stević, Ž., Sremac, S. (2018). A new model for determining weight coefficients of criteria in MCDM models: Full Consistency Method (FUCOM). *Symmetry*, 10(9), 393. DOI [10.3390/sym10090393](https://doi.org/10.3390/sym10090393)

**Verification.** Read from the publisher's open-access HTML (CC BY). Tables 1 and 2 are images in that version, so the inputs of both examples are taken from the text of Steps 2–3, which states every comparative priority. Both examples' final weights and DFC are reproduced.

## Formulation

1. **Ranking** (Eq. 1): the expert orders the criteria C_(1) ≥ C_(2) ≥ … ≥ C_(n); equal importance is allowed.
2. **Comparative priorities** (Eq. 2): φ_(k/(k+1)) = ϖ_(k+1) / ϖ_k, where ϖ is the significance of each criterion on a scale such as [1, 9] with ϖ_(1) = 1 (Step 2b), or the ratio of measured values when they exist (Step 2a).
3. **Conditions** (Eqs. 3–4): w_k / w_(k+1) = φ_(k/(k+1)) and, by transitivity, w_k / w_(k+2) = φ_(k/(k+1)) · φ_((k+1)/(k+2)).
4. **Model** (5): min χ s.t. |w_k / w_(k+1) − φ_(k/(k+1))| ≤ χ, |w_k / w_(k+2) − φ_(k/(k+1)) φ_((k+1)/(k+2))| ≤ χ, Σ w = 1, w ≥ 0. χ is the deviation from full consistency (DFC).

**Consequence for the implementation.** With crisp priorities the chain w_k = φ_(k/(k+1)) · w_(k+1), normalised to sum 1, satisfies every constraint exactly, so χ = 0 and the optimum is unique. The paper's own examples have DFC = 0.00 for this reason. P2.2 can compute crisp FUCOM in closed form, record χ = 0 in the trace and keep the optimisation model only for the trace's explanation; a solver is needed only if priorities are entered directly and are inconsistent with each other (which the chain definition rules out).

**Implementation (P2.2).** `packages/methods/fucom` does exactly this, without a solver. Input: the criteria in ranking order and either the significance values ϖ or the comparative priorities φ. The trace records the chain, the weights, then every condition of model (5) recomputed from the weights, and reports their largest deviation as χ (0 up to round-off), so the trace shows why the closed form is the optimum instead of asserting it.

## Edge cases

- φ must be > 0; a significance value below the previous one breaks the ranking: reject.
- Ties (φ = 1) are valid and give equal weights.

## Worked examples

- `packages/methods/fucom/fixtures/pamucar-2018-example-1.json`: four criteria, φ = 1.08, 1.25, 1.45; weights **0.315, 0.291, 0.233, 0.161**, χ = 0.
- `packages/methods/fucom/fixtures/pamucar-2018-example-2.json`: five criteria ranked C2 > C1 > C4 = C3 > C5 with ϖ = 1, 2.1, 3, 3, 7; weights **0.208, 0.437, 0.146, 0.146, 0.063**, χ = 0.

Errata: Example 1's Step 3 refers to "Table 2", which belongs to Example 2.

## Fuzzy FUCOM

**Candidate.** Pamučar, D., Ecer, F. (2020). Prioritizing the weights of the evaluation criteria under fuzziness: The fuzzy full consistency method – FUCOM-F. *Facta Universitatis, Series: Mechanical Engineering*, 18(3), 419–437. DOI [10.22190/FUME200602034P](https://doi.org/10.22190/FUME200602034P). By the method's first author; open access ([PDF](https://distantreader.org/stacks/journals/fumecheng/fumecheng-6515.pdf)).

**What was checked.** Scale (Table 1: EI (1,1,1), WI (2/3,1,3/2), FI (3/2,2,5/2), VI (5/2,3,7/2), AI (7/2,4,9/2)); fuzzy priorities φ̃ = ϖ̃_(k+1) ⊘ ϖ̃_k; a nonlinear model minimising ξ with fuzzy ratio and transitivity constraints and Σ graded-mean(w̃) = 1 (Eqs. 12–13), solved with LINGO. The printed priorities are reproduced (with 2/3 rounded to 0.67, so 2.5/0.67 = 3.73 rather than 3.75).

**Why there is no fixture.** The printed fuzzy weights are not a reproducible target:
- they are one solution of a nonconvex model and are degenerate (Model 1 gives C2 = (0.3881, 0.3881, 0.3881), Model 2 gives a lower weight to the second-ranked criterion than to the fifth);
- the text extraction garbles the constraint list, so the exact model could not be confirmed;
- the paper reports two different DFC values for three of its four models (Section 3.1 vs 3.2).

**Proposal.** Defer fuzzy FUCOM. If it is kept in P2.2, its test should check feasibility of the returned weights and the objective ξ, not specific weights, and the model must first be confirmed from the typeset PDF.
