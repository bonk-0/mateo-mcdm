# MARCOS

**Reference (method).** Stević, Ž., Pamučar, D., Puška, A., Chatterjee, P. (2020). Sustainable supplier selection in healthcare industries using a new MCDM method: Measurement of alternatives and ranking according to COmpromise solution (MARCOS). *Computers & Industrial Engineering*, 140, 106231. DOI [10.1016/j.cie.2019.106231](https://doi.org/10.1016/j.cie.2019.106231)

**Verification.** Metadata confirmed against the Serbian national research register (eNauka) and dblp. **The article is paywalled and was not read.** The formulation below is taken from two open-access papers by the method's authors, which restate it identically:

- Stanković, Stević, Das, Subotić, Pamučar (2020), *Mathematics* 8(3), 457, Section 2, Eqs. 7–18 (DOI [10.3390/math8030457](https://doi.org/10.3390/math8030457)); read from the publisher's PDF.
- Damjanović, Stević, Stanimirović, Tanackov, Marinković (2022), *Facta Universitatis, Series: Mechanical Engineering* 20(1), 177–197, Section 3.4, Eqs. 5–16 (DOI [10.22190/FUME220215012D](https://doi.org/10.22190/FUME220215012D), [open-access PDF](https://core.ac.uk/download/524099176.pdf)).

**Worked example.** The original paper's example (healthcare supplier selection) could not be accessed, so the golden test uses the complete example of Damjanović et al. (2022), co-authored by the method's first author, which prints every intermediate table. If the original article becomes available, its example should be added as a second fixture.

## Formulation

With B the benefit and C the cost criteria:

1. **Initial matrix** of m alternatives × n criteria.
2. **Extended matrix**: add the anti-ideal AAI as the first row and the ideal AI as the last row.
   AAI_j = min_i x_ij if j ∈ B, max_i x_ij if j ∈ C; AI_j = max_i x_ij if j ∈ B, min_i x_ij if j ∈ C.
3. **Normalisation** of the extended matrix, including the AAI and AI rows:
   n_ij = x_ij / x_aj if j ∈ B; n_ij = x_aj / x_ij if j ∈ C, where x_aj is the AI value.
4. **Weighted matrix**: v_ij = n_ij · w_j.
5. **Sums**: S_i = Σ_j v_ij, for every row including AAI and AI (so S_AI = Σ w_j = 1 when the weights sum to 1).
6. **Utility degrees**: K_i⁻ = S_i / S_AAI; K_i⁺ = S_i / S_AI.
7. **Utility functions**: f(K_i⁻) = K_i⁺ / (K_i⁺ + K_i⁻); f(K_i⁺) = K_i⁻ / (K_i⁺ + K_i⁻).
   Note the crossover: f(K_i⁻), the utility "in relation to the anti-ideal", has K_i⁺ in its numerator. Both source papers print it this way.
8. **Final utility**: f(K_i) = (K_i⁺ + K_i⁻) / (1 + (1 − f(K_i⁺)) / f(K_i⁺) + (1 − f(K_i⁻)) / f(K_i⁻)).
9. **Ranking** by f(K_i), highest first.

## Properties and edge cases

- f(K_i⁻) and f(K_i⁺) are the same for every alternative, because K_i⁻ / K_i⁺ = S_AI / S_AAI for all i. The worked example shows 0.365 / 0.635 in every row. Explain mode should not present this as a coincidence.
- **Zero values**: a cost criterion with x_ij = 0 divides by zero in step 3; a benefit criterion with AI = 0 (all values 0) does too. Proposal for P1.6: validation error naming the cell or criterion.
- **Weights not summing to 1** only rescale S_i and leave K, f and the ranking unchanged. Matches the plan's "warning with normalisation option".
- **Ties**: identical alternatives get identical f(K_i). Mateo ranks them with standard competition ranking (1, 2, 2, 4).

## Worked example

Fixture: `packages/methods/marcos/fixtures/damjanovic-2022-s1.json`. Scenario S1: eight observation years (the DEA-efficient ones) on four criteria: annual average daily traffic and registered vehicles (benefit), accidents with casualties and accidents with material damage (cost); weights (0.247, 0.247, 0.309, 0.197) from IMF SWARA. Prints the extended (Table 5), normalised (Table 6) and weighted (Table 7) matrices and S_i, K_i⁻, K_i⁺, f(K⁻), f(K⁺), f(K_i) and ranks (Table 8). Best: 2018 (f(K) = 0.697). Every printed cell is reproduced to 3 decimals; no deviations.

## Errata

- Eq. 15 (Stanković et al.) and Eq. 13 (Damjanović et al.) write the sum index as i = 1..n; it runs over criteria j.
- Damjanović et al. print the fourth weight as "0197" in the text; Table 7 confirms 0.197.
- Naming clash between papers: the crisp MARCOS papers call the ideal solution AI, while the Fuzzy MARCOS paper uses Ã(AI) for the anti-ideal and Ã(ID) for the ideal. Mateo's trace uses `AAI` and `AI` for crisp and `AAI` and `ID` for fuzzy, and the UI should always spell out "anti-ideal" and "ideal".
