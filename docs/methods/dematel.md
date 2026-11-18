# DEMATEL

**Reference (method).** Gabus, A., Fontela, E. (1972). *World problems, an invitation to further thought within the framework of DEMATEL*. Battelle Geneva Research Centre; Fontela, E., Gabus, A. (1976). *The DEMATEL observer*. Battelle Geneva Research Centre.

**Verification.** The Battelle reports are not available online and could not be read. The formulation and the worked example come from an open-access paper co-authored by G.-H. Tzeng, who made DEMATEL widely used in MCDM: Chen, C.-Y., Tzeng, G.-H., Huang, J.-J. (2018). Generalized DEMATEL technique with centrality measurements. *Technological and Economic Development of Economy*, 24(2), 600–614. DOI [10.3846/20294913.2016.1216471](https://doi.org/10.3846/20294913.2016.1216471), Section 2 (Eqs. 1–4) and the classical case (α = 0) of Section 3. Metadata confirmed against Crossref.

## Formulation

1. Direct-relation matrix Z (n × n), integer scale 0–4 (no, low, medium, high, very high influence). With several experts Z is the element-wise mean.
2. Normalisation X = Z / s with s = max(max_i Σ_j z_ij, max_j Σ_i z_ij). Some papers use s = max row sum only; Mateo uses the max of both (the classical form, which guarantees convergence) and exposes the choice as a parameter.
3. Total-relation matrix T = X (I − X)⁻¹ (the limit of X + X² + …).
4. D = row sums of T (influence dispatched), R = column sums (influence received), prominence D + R, relation D − R (positive: cause group, negative: effect group).
5. Optional threshold α for the impact-relation map (common choice: the mean of T); it only affects the diagram.

## Edge cases

- I − X must be invertible. Dividing by s bounds the spectral radius of X by 1, but it can equal 1 (for example when every row sum equals s), and then the series diverges. Mateo must detect this and report a clear error rather than return a meaningless T.
- Non-zero diagonal entries are allowed by the formula. The example below has them; Mateo must **not** zero the diagonal silently, it should warn.
- An all-zero matrix gives s = 0: reject.

## Worked example

Fixture: `packages/methods/dematel/fixtures/chen-2018.json`. Six quality-control factors, one expert, s = 18. Every printed entry of X and T is reproduced at four decimals.

**Errata.** Table 2 prints D and R of S6 as 2.286 and 2.133; the sums of the printed T are 2.736 and 2.583 (their difference 0.153 matches the printed D − R, so both are typos), and D + R of S6 (4.419) follows the typos instead of 5.319. Five more D + R and D − R values are sums of rounded D and R. All are listed as deviations.

## Implementation (P2.3)

`packages/methods/dematel`, two methods in the `relationship` category: `dematel` (crisp) and `fuzzy-dematel` (TFN). Golden test: `dematel.test.ts` against the fixture above (every printed table of the classical case; the typos of Table 2 are applied from the fixture's `deviations`).

**Input.** `factors` (ids and names) and `relations`: one n × n matrix per expert, entry (i, j) being the influence of factor i on factor j. With several experts Z is the element-wise mean (arithmetic mean of the TFNs for the fuzzy variant); the trace shows the experts' matrices stacked, then the mean. Any non-negative scale is accepted; the 0–4 scale is the UI's business (P2.8).

**Options.**

| Parameter | Values (default first) | Meaning |
|---|---|---|
| `normalization` | `max-row-or-column-sum`, `max-row-sum` | The constant s. The first is the classical form; the second is the row-only variant of some papers and of Lin & Wu. |
| `threshold` | `mean`, `custom` | Threshold of the cause–effect map: the mean of all entries of T (the diagonal included, as in the common choice), or `customThreshold` (default 0 = every relation). It only affects `relations`. |
| `weightBasis` | `prominence`, `distance` | Weights: `prominence` gives w_i = (D_i + R_i) / Σ_k (D_k + R_k); `distance` gives a_i = √((D_i + R_i)² + (D_i − R_i)²) and w_i = a_i / Σ_k a_k, which also credits strong causes and effects. The first is the documented default. **The distance form is a common choice in the DEMATEL literature but has no verified citation here**; it is offered as an explicit option, never silently. |
| `defuzzification` (fuzzy only) | `centroid`, `graded-mean`, `cfcs` | See below. |

**Result.** s, T, and per factor D, R, D + R, D − R and its group (`cause` when D − R > 1e-9, `effect` below −1e-9, otherwise `neutral`); the threshold; `relations`, the off-diagonal entries of T that are at least the threshold (the edges of the cause–effect map, from the influencing to the influenced factor); and `weights`, a weight vector keyed by factor id (output kind `weights`, so the Hybrid Builder can feed it to a ranking method).

**Diagonal.** A non-zero diagonal entry is kept and reported as `dematel.non-zero-diagonal` (a warning per expert and factor), because the formula allows it and the printed T of the fixture needs it.

**Singular I − X.** T needs (I − X)⁻¹. The spectral radius of X is at most 1 and it equals 1 exactly when the series X + X² + … diverges, for example when every row and column sum equals s (a pure cycle, a symmetric matrix with equal sums). `validate` inverts I − X by Gauss–Jordan elimination with partial pivoting and rejects the input with `dematel.near-singular` when a pivot is 0 or the 1-norm condition number exceeds 10¹⁰. A matrix a hair below that (`[[0, 1], [1 − 10⁻¹²,  0]]`, condition number ≈ 4·10¹²) is rejected; one with a margin of 10⁻³ (condition number ≈ 10³) runs. A zero matrix has s = 0 and is rejected as `dematel.zero-matrix`.

**Trace.** The inverse is one step, (I − X)⁻¹, recorded cell by cell as the operation `dematel.inverse` on the whole of X; T is `Σ x_ik · inv_kj` (`sum-of-products`). `dematelOperationEvaluators` recomputes the inverse for `verifyTrace`, so a stored DEMATEL trace is auditable like any other.

## Fuzzy DEMATEL

**Candidate.** Lin, C.-J., Wu, W.-W. (2008). A causal analytical method for group decision-making under fuzzy environment. *Expert Systems with Applications*, 34(1), 205–213. DOI [10.1016/j.eswa.2006.08.012](https://doi.org/10.1016/j.eswa.2006.08.012). Linguistic terms map to TFNs; the normalised fuzzy matrix is split into its l, m and u matrices, T is computed for each separately (T_l = X_l (I − X_l)⁻¹, and so on), and the fuzzy D + R and D − R are defuzzified (CFCS in later papers, centroid in others). This is the most cited TFN formulation.

**Not verified: paywalled.** The open-access example that was tried (Tsai et al. 2015, *PLOS ONE*) did not reproduce from its printed tables.

**Implemented in P2.3, property tests only, not yet verified against a published example** (the decision of P2.1: fuzzy DEMATEL, MOORA and ARAS ship with property tests and are marked unverified in the Method Library until a golden test is added). The tests are: a crisp input (l = m = u) gives exactly the classical D + R, D − R, T and weights for centroid and graded mean (and to 10⁻⁹ for CFCS); l ≤ m ≤ u holds in every fuzzy table; every trace passes `verifyTrace`; and a 3-factor example whose expected values were computed with an independent implementation of the same formulation (numpy). That example checks the implementation against the formulas, not the formulation against the paper.

Choices where the formulation leaves room (all documented in the step texts and the options):

- s is taken from the **upper** components (the largest upper row sum, and by default also the largest upper column sum), so dividing by it keeps the l, m and u matrices all convergent. `normalization: 'max-row-sum'` gives the Lin & Wu form exactly.
- T̃ is computed per component: T_l = X_l (I − X_l)⁻¹, and the same for m and u. An entry of T̃ is the triple of the three entries; the inverse of each component matrix is monotone (it is Σ Xᵏ), so l ≤ m ≤ u carries over, and a one-ulp rounding disorder is repaired.
- D̃ and R̃ are the TFN sums of the rows and columns; D̃ + R̃ uses fuzzy addition and D̃ − R̃ fuzzy subtraction (D_l − R_u, D_m − R_m, D_u − R_l).
- Defuzzification (default **centroid**, as agreed) is applied to D̃ + R̃ and D̃ − R̃, and to every entry of T̃ for the threshold of the map. `graded-mean` is the other per-number option. **CFCS** (Opricovic, Tzeng 2003; DOI 10.1142/S0218488503002387, reference added from memory and not checked against the paper) normalizes with the extremes of the set it is applied to, so each of D̃ + R̃ and D̃ − R̃ is defuzzified as one set and T̃ as one set. For a crisp set it returns the same numbers; for a symmetric TFN alone it returns its centre. The CFCS formula is implemented from the commonly published form (l_s = m / (1 + m − l), u_s = u / (1 + u − m)) and is likewise unverified; it lives in `packages/methods/dematel/operations.ts` and can move to `@mateo/fuzzy` if another method needs it.
- Weights and groups come from the defuzzified D + R and D − R.

**Former proposal (done).** Implement fuzzy DEMATEL in P2.4 with the Lin & Wu structure (componentwise T, normalisation by the largest upper row sum), centroid defuzzification by default and CFCS as an option, and test it with property tests: a crisp input (l = m = u) must give exactly the crisp DEMATEL result, and l ≤ m ≤ u must hold in T. Add a golden test when a reproducible open-access example is found, or defer fuzzy DEMATEL to Phase 4 if the user prefers to ship only verified variants.
