# WASPAS

**Reference.** Zavadskas, E. K., Turskis, Z., Antucheviciene, J., Zakarevicius, A. (2012). Optimization of weighted aggregated sum product assessment. *Elektronika ir Elektrotechnika*, 122(6), 3–6. DOI [10.5755/j01.eee.122.6.1810](https://doi.org/10.5755/j01.eee.122.6.1810)

**Verification.** Read from the publisher's open-access PDF; metadata confirmed against Crossref. The 2012 paper prints only the normalised matrix. The raw matrix, criterion types and weights of the same example come from Zavadskas, Antucheviciene, Šaparauskas, Turskis (2013), *Economic Computation and Economic Cybernetics Studies and Research* 47(2), 5–20, Table 2 ([PDF](https://ecocyb.ase.ro/20132/Zavadskas%20(T).pdf)).

## Formulation

1. Linear max normalisation: benefit x_ij / max_i x_ij, cost min_i x_ij / x_ij.
2. WSM Q1_i = Σ_j w_j x̄_ij, WPM Q2_i = Π_j x̄_ij^w_j (weights sum to 1).
3. Joint criterion Q_i = λ Q1_i + (1 − λ) Q2_i, higher is better. λ ∈ [0, 1]:
   - **fixed** λ (0.5 is the common default);
   - **optimal per alternative** (this paper, Eqs. 11–19): λ_i = σ²(Q2_i) / (σ²(Q1_i) + σ²(Q2_i)), with σ²(Q1_i) = Σ_j w_j² σ²(x̄_ij), σ²(Q2_i) = Σ_j (Q2_i w_j / x̄_ij)² σ²(x̄_ij) and σ²(x̄_ij) = (0.05 x̄_ij)² (relative error 5 %, a parameter).
   - **pooled** (WASPAS-F, below): one λ = Σ Q2 / (Σ Q1 + Σ Q2).

## Edge cases

- A zero normalised value makes Q2 = 0 and the optimal-λ variance undefined (division by x̄_ij): reject zero data for WPM, or warn and fall back to fixed λ.
- Cost criteria need positive data.

## Implementation

`packages/methods/waspas` (P2.4) holds two methods. **`waspas`** (crisp): `lambdaRule` (`fixed`, the default, `optimal` or `pooled`), `lambda` (default 0.5, used when `fixed`), `relativeError` (default 0.05, used by `optimal`) and `normalizeWeights` (default off, with a warning when the weights do not sum to 1, because the WPM exponents assume it; the printed weights of the reference example sum to 1.0001). The fixture's `"lambda": "optimal"` is `lambdaRule: 'optimal'`. The optimal λ needs strictly positive data, because Eq. 17 divides by the normalised values; the other rules accept zeros in benefit criteria. **`fuzzy-waspas`** (WASPAS-F): `lambdaRule` (`pooled`, the default, or `fixed`), `lambda`, `defuzzification` (`centroid`, the default, or `graded-mean`) and `normalizeWeights` (crisp weights only). Weights may be TFNs or crisp numbers; crisp weights become (w, w, w) in a step of their own. The optimal λ is not offered for TFNs: its variances are defined for crisp values.

The power rule and the product of TFNs are `tfnPower` and `tfnProduct` in `@mateo/fuzzy` (P2.4). For a base above 1 `tfnPower` takes the smallest and largest end-point powers, like the other products, and equals the paper's (l^w_u, m^w_m, u^w_l) for the normalised values (at most 1). With degenerate TFNs and the pooled λ, `fuzzy-waspas` gives exactly the results of `waspas`; a test checks it.

## Worked examples

**Crisp.** `packages/methods/waspas/fixtures/zavadskas-2012.json`: building facades, four alternatives, twelve criteria. WPM reproduced exactly; ranking a4 > a2 > a3 > a1 reproduced.

**Errata.**
- Input correction: the 2013 paper prints x3 of a2 as 2.37; the 2012 normalised value and all Q values need 3.37 (the column maximum).
- Table 1 prints x̄5 of a1 as 1.0000 instead of 0.1000. Q1 and Q2 use 0.1000, but λ of a1 was computed with 1.0000 (λ = 0.32, Q = 0.5303 as printed; correct: 0.343 and 0.5326).
- The printed WSM of a2–a4 is 3–4 units off in the fourth decimal; cause not found. Ranking unaffected.
- The 2012 paper labels the λ columns of Table 2 in reverse (the first column is the WPM).

**TFN.** `packages/methods/waspas/fixtures/turskis-2015-fuzzy.json`, see below.

## Fuzzy WASPAS (chosen variant)

Turskis, Z., Zavadskas, E. K., Antucheviciene, J., Kosareva, N. (2015). A hybrid model based on fuzzy AHP and fuzzy WASPAS for construction site selection. *International Journal of Computers Communications & Control*, 10(6), 873–888. DOI [10.15837/ijccc.2015.6.2078](https://doi.org/10.15837/ijccc.2015.6.2078). Open access (CC BY-NC), by the method's authors; the most cited WASPAS-F with TFNs.

- Normalisation: benefit x̃ / max_i u_ij; cost (min l / u, min l / m, min l / l).
- WSM cell: TFN product x̃_ij ⊗ w̃_j. WPM cell: power rule x̃^w̃ = (l^w_u, m^w_m, u^w_l).
- Q and P are the centroids (l + m + u)/3 of the row sum and the row product; λ pooled; K = λ Q + (1 − λ) P.

Every printed value of Tables 5–8 is reproduced at two decimals, with no deviations.
