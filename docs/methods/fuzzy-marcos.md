# Fuzzy MARCOS (TFN)

**Reference.** Stanković, M., Stević, Ž., Das, D. K., Subotić, M., Pamučar, D. (2020). A new fuzzy MARCOS method for road traffic risk analysis. *Mathematics*, 8(3), 457. DOI [10.3390/math8030457](https://doi.org/10.3390/math8030457)

**Verification.** Read from the publisher's PDF (CC BY). Every printed value of the worked example is reproduced to 3 decimals; only the rank numbering differs (see Errata).

## Formulation (Section 3, Eqs. 19–32)

TFNs are (l, m, u). B and C are the benefit and cost criteria.

1. **Initial fuzzy matrix** x̃_ij, usually from a linguistic scale.
2. **Extended matrix** (Eq. 19): anti-ideal Ã(AI) as the first row, ideal Ã(ID) as the last.
   Ã(AI) = min_i x̃_ij if j ∈ B, max_i x̃_ij if j ∈ C; Ã(ID) = max_i x̃_ij if j ∈ B, min_i x̃_ij if j ∈ C (Eqs. 20–21).
   The minimum and maximum are taken component-wise; this is what the worked example does (for C4 the ideal is (7, 7, 9)).
3. **Normalisation** (Eqs. 22–23), applied to every row including the anti-ideal and ideal:
   - j ∈ C: ñ_ij = (x^l_id / x^u_ij, x^l_id / x^m_ij, x^l_id / x^l_ij)
   - j ∈ B: ñ_ij = (x^l_ij / x^u_id, x^m_ij / x^u_id, x^u_ij / x^u_id)
   Every component is divided by a single number of the ideal: x^u_id for benefit, x^l_id for cost.
4. **Weighted matrix** (Eq. 24): ṽ_ij = ñ_ij ⊗ w̃_j = (n^l w^l, n^m w^m, n^u w^u). Weights may be TFNs; a crisp weight is the degenerate TFN (w, w, w).
5. **Sums** (Eq. 25): S̃_i = Σ_j ṽ_ij for every row, including Ã(AI) and Ã(ID).
6. **Utility degrees** (Eqs. 26–27), with TFN division:
   K̃_i⁻ = S̃_i ⊘ S̃_ai = (s^l_i / s^u_ai, s^m_i / s^m_ai, s^u_i / s^l_ai), where ai is the anti-ideal;
   K̃_i⁺ = S̃_i ⊘ S̃_id = (s^l_i / s^u_id, s^m_i / s^m_id, s^u_i / s^l_id).
7. **T̃_i = K̃_i⁻ ⊕ K̃_i⁺** (Eq. 28), **D̃ = max_i T̃_i** component-wise (Eq. 29), and **df_crisp = (d^l + 4d^m + d^u) / 6**.
8. **Fuzzy utility functions** (Eqs. 30–31): f(K̃_i⁺) = K̃_i⁻ / df_crisp; f(K̃_i⁻) = K̃_i⁺ / df_crisp (each component divided by the crisp number).
9. **Defuzzify** K̃_i⁻, K̃_i⁺, f(K̃_i⁺), f(K̃_i⁻). The paper says only "perform defuzzification"; the graded mean (l + 4m + u) / 6, the same formula as for df_crisp, reproduces every printed crisp value.
10. **Final utility** (Eq. 32), on the crisp values: f(K_i) = (K_i⁺ + K_i⁻) / (1 + (1 − f(K_i⁺)) / f(K_i⁺) + (1 − f(K_i⁻)) / f(K_i⁻)).
11. **Ranking** by f(K_i), highest first.

The same group restates this formulation unchanged in Vrtagić et al. (2021), *Axioms* 10(2), 92, Eqs. 14–20, and in Mijajlović et al. (2020), *Sustainability* 12(20), 8584, Eqs. 1–14.

## Differences from crisp MARCOS (relevant to P1.6)

- Crisp MARCOS normalises f(K) by each alternative's own K⁺ + K⁻; Fuzzy MARCOS divides by one number for all alternatives, df_crisp of the largest T̃_i. With degenerate TFNs (x, x, x) the two methods therefore give **different f(K_i) values**.
- **The ranking still agrees.** With crisp inputs K⁻ = S_i/a and K⁺ = S_i/b for constants a, b, so f(K_i) in Fuzzy MARCOS equals c·S_i² / (d − S_i) for positive constants c, d (d > S_i), which increases with S_i; crisp MARCOS also ranks by S_i. Both rank by S_i, so P1.6's degenerate-TFN test should compare rankings, not values.

## Edge cases

- Benefit criterion with x^u_id = 0, or cost criterion with any l, m or u = 0: division by zero in Eq. 22–23. Validation error.
- S̃_ai with a zero component (all anti-ideal values 0): Eq. 26 divides by zero. Validation error.
- Ties: identical rows tie exactly (A13 = A27 and A3 = A38 in the example). Standard competition ranking.

## Worked example

Fixture: `packages/methods/fuzzy-marcos/fixtures/stankovic-2020.json`. 38 road sections, 6 benefit criteria (higher means more risk), linguistic ratings on a 9-term scale (Table 1) converted to TFNs (Table 2), fuzzy PIPRECIA weights from two experts (Table 3). The paper prints only rows A1–A3, A23–A25 and A36–A38 of Tables 4–6 and of S̃, K̃, T̃; the fixture holds exactly those rows, plus D̃ = (1.454, 6.785, 27.103), df_crisp = 9.283, and the ranks the text quotes for other sections. A23 ranks first (f(K) = 1.082).

**Input weights.** The paper prints w̃_j rounded to 3 decimals. With those weights the upper components of K̃, T̃ and D̃ drift and more than 100 printed values fall outside tolerance. The fixture therefore stores the unrounded weights, recomputed from the printed Table 3 by fuzzy PIPRECIA (k̃_j = 2 − s̃_j, q̃_j = q̃_{j−1} ⊘ k̃_j, w̃_j = q̃_j ⊘ Σq̃; the second expert in reverse order; arithmetic mean of the two experts; 0.667 and 0.333 read as 2/3 and 1/3). Rounded, they equal the printed vector exactly, and with them every printed value except the rank numbers is reproduced. This derivation is a test-input detail; PIPRECIA itself is not a Phase 1 method.

## Errata

- **Rank numbering.** Table 6 numbers ranks densely after the exact tie A13 = A27 (both 23rd): it gives A24 27, A36 28, A2 29, A3 = A38 30. The text instead says A31 is 35th, A35 37th and A34 38th, which is standard competition ranking, where A24 is 28th and A3 = A38 31st. The ordering is identical; the fixture lists the five Table 6 ranks and the text's "30th" for A3/A38 as deviations.
- In the worked S̃_1 sum the first term is printed 0.111 instead of 0.011 (the result 0.113 is right).
- In the worked f(K_1) the numerator is printed 0.446 + 3.445; K_1⁺ is 0.466 (the result 0.181 is right).
- Eq. 25 writes the sum index as i = 1..n; it runs over criteria j.
- Section 2 (crisp MARCOS) calls the ideal AI, while Section 3 uses Ã(AI) for the anti-ideal. See [marcos.md](marcos.md).

## Implementation (P1.6)

`packages/methods/fuzzy-marcos/fuzzy-marcos.ts`, method id `fuzzy-marcos`, version 1.0.0.

- **Input**: a TFN decision matrix and TFN weights (the paper's case) or crisp weights, which enter Eq. 24 as (n^l·w, n^m·w, n^u·w), the same as the degenerate TFN (w, w, w). Linguistic ratings are converted to TFNs before the method runs (`linguisticMatrixToTfn` in `@mateo/fuzzy`).
- **Parameters**: `defuzzification` (`graded-mean`, default, or `centroid`) for step 9, the only step whose formula the paper leaves open. df_crisp always uses the graded mean, as Eq. 29 prints it. `normalizeWeights` (default off) works as in crisp MARCOS and applies only to crisp weights; with TFN weights it is a validation error, because a fuzzy weight vector has no unique normalisation.
- **Trace steps**: `initial-matrix`, `weights`, [`normalized-weights`], `extended-matrix` (rows `AAI`, the alternatives, `ID`), `normalized-matrix`, `weighted-matrix`, `sums`, `utility-degrees`, `utility-degree-sums` (T̃_i), `max-utility-degree-sum` (D̃), `max-utility-degree-sum-crisp` (df_crisp), `utility-functions`, `defuzzification`, `final-utility`, `ranking`. Fuzzy cells are stored as triples.
- **Validation errors**: invalid or negative TFNs (`tfn.*`), l = 0 in a cost criterion (`fuzzy-marcos.zero-cost-value`), u of the ideal of a benefit criterion = 0 (`fuzzy-marcos.zero-ideal-value`), a zero component in S̃ of the anti-ideal or the ideal (`fuzzy-marcos.zero-anti-ideal-sum`, `fuzzy-marcos.zero-ideal-sum`), S̃_i = (0, 0, 0) (`fuzzy-marcos.zero-sum`), weights of another number type (`fuzzy-marcos.unsupported-weights`), alternative ids `AAI`/`ID` (`fuzzy-marcos.reserved-alternative-id`).
- **Golden test**: `fuzzy-marcos/fuzzy-marcos.test.ts` reproduces every printed value of Stanković et al. (2020) to 3 decimals; the seven rank-numbering deviations listed in the fixture are checked against their recomputed values.
- **Degenerate TFNs**: the same test runs the crisp MARCOS example with (x, x, x) inputs, with TFN and with crisp weights. The rankings agree with crisp MARCOS and S̃_i equals S_i, while the f(K_i) values differ, as derived above.
